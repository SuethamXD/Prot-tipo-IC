/**
 * ==============================================================================
 * DATASTORE & TELEMETRY PERSISTENCE
 * js/simulation/datastore.js
 * 
 * IndexedDB, Ring Buffer em memória, exportações CSV/JSON/JSONL e sumário para LLMs.
 * ISOLAMENTO: Proibido Three.js ou estilos CSS.
 * ==============================================================================
 */

import { CONFIG } from './config.js';
import { SimClock } from './clock.js';
import { EventBus } from '../contracts/event-bus.js';

export class DataStoreClass {
  constructor() {
    this.ringBuffer = [];
    this.maxRingSize = 5000;
    this.db = null;
    this.initIndexedDB();
  }

  initIndexedDB() {
    if (typeof window === "undefined" || !window.indexedDB) {
      console.warn("IndexedDB indisponível no ambiente atual, usando apenas buffer em memória.");
      return;
    }
    try {
      const req = window.indexedDB.open("SmartHomeSimDB", 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("events")) {
          const store = db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
          store.createIndex("ts_event", "ts_event", { unique: false });
          store.createIndex("device_id", "device_id", { unique: false });
          store.createIndex("room", "room", { unique: false });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        this.loadInitialCount();
      };
      req.onerror = (e) => {
        console.warn("IndexedDB indisponível, usando apenas memória RAM:", e);
      };
    } catch (err) {
      console.warn("Exceção ao inicializar IndexedDB:", err);
    }
  }

  loadInitialCount() {
    if (!this.db) return;
    const tx = this.db.transaction("events", "readonly");
    const store = tx.objectStore("events");
    const countReq = store.count();
    countReq.onsuccess = () => {
      EventBus.emit("datastore:count_updated", countReq.result);
    };
  }

  addRecord(record) {
    this.ringBuffer.unshift(record);
    if (this.ringBuffer.length > this.maxRingSize) {
      this.ringBuffer.pop();
    }

    if (this.db) {
      try {
        const tx = this.db.transaction("events", "readwrite");
        const store = tx.objectStore("events");
        store.add(record);
      } catch (e) {}
    }

    EventBus.emit("datastore:record_added", record);
  }

  clearDatabase() {
    this.ringBuffer = [];
    if (this.db) {
      const tx = this.db.transaction("events", "readwrite");
      tx.objectStore("events").clear();
    }
    EventBus.emit("datastore:count_updated", 0);
  }

  exportCsv() {
    if (this.ringBuffer.length === 0) return alert("Nenhum dado gravado para exportar.");
    const headers = ["ts_event", "ts_cloud", "ts_collected", "device_id", "device_name", "room", "type", "protocol", "dp_code", "value", "source", "latency_ms", "lqi", "rssi", "hops", "battery", "sim_time"];
    let csv = headers.join(",") + "\n";

    for (const row of this.ringBuffer) {
      const line = headers.map(h => {
        const val = row[h] !== undefined ? String(row[h]).replace(/"/g, '""') : "";
        return `"${val}"`;
      }).join(",");
      csv += line + "\n";
    }
    this.downloadFile("dataset_eventos_brutos.csv", csv, "text/csv;charset=utf-8;");
  }

  exportJson() {
    if (this.ringBuffer.length === 0) return alert("Nenhum dado gravado para exportar.");
    const json = JSON.stringify(this.ringBuffer, null, 2);
    this.downloadFile("dataset_eventos_brutos.json", json, "application/json");
  }

  exportJsonl() {
    if (this.ringBuffer.length === 0) return alert("Nenhum dado gravado para exportar.");
    const jsonl = this.ringBuffer.map(r => JSON.stringify(r)).join("\n");
    this.downloadFile("dataset_eventos_brutos.jsonl", jsonl, "application/x-ndjson");
  }

  exportAggregatedDataset() {
    if (this.ringBuffer.length === 0) return alert("Nenhum dado gravado para exportar.");
    
    const windowSizeMs = 5 * 60 * 1000;
    const windows = new Map();

    for (const ev of this.ringBuffer) {
      const timeMs = new Date(ev.ts_event).getTime();
      const winStartMs = Math.floor(timeMs / windowSizeMs) * windowSizeMs;
      const key = `${winStartMs}_${ev.room}`;

      if (!windows.has(key)) {
        windows.set(key, {
          window_start: new Date(winStartMs).toISOString(),
          window_end: new Date(winStartMs + windowSizeMs).toISOString(),
          room: ev.room,
          pir_events_count: 0,
          door_openings_count: 0,
          power_readings: [],
          lux_readings: [],
          ground_truth_room: (typeof window !== "undefined" && window.HouseActivity?.currentRoom) || "Quarto 1"
        });
      }

      const w = windows.get(key);
      if (ev.dp_code === "pir" && ev.value === "pir") w.pir_events_count++;
      if (ev.dp_code === "doorcontact_state" && ev.value === "open") w.door_openings_count++;
      if (ev.dp_code === "cur_power") w.power_readings.push(Number(ev.value));
      if (ev.dp_code === "bright_value") w.lux_readings.push(Number(ev.value));
    }

    const headers = ["window_start", "window_end", "room", "pir_events_count", "door_openings_count", "avg_power_watts", "avg_lux", "ground_truth_room"];
    let csv = headers.join(",") + "\n";

    for (const w of windows.values()) {
      const avgPower = w.power_readings.length > 0 ? (w.power_readings.reduce((a,b)=>a+b,0)/w.power_readings.length).toFixed(1) : "0.0";
      const avgLux = w.lux_readings.length > 0 ? Math.round(w.lux_readings.reduce((a,b)=>a+b,0)/w.lux_readings.length) : "0";
      
      csv += `"${w.window_start}","${w.window_end}","${w.room}",${w.pir_events_count},${w.door_openings_count},${avgPower},${avgLux},"${w.ground_truth_room}"\n`;
    }

    this.downloadFile("dataset_agregado_5min_ml.csv", csv, "text/csv;charset=utf-8;");
  }

  downloadFile(filename, content, mimeType) {
    if (typeof document === "undefined") return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateLlmSummary(devices) {
    const timeStr = SimClock.getFormattedSimTime();
    const currentRoom = (typeof window !== "undefined" && window.HouseActivity?.currentRoom) || "Quarto 1";
    const currentActivity = (typeof window !== "undefined" && window.HouseActivity?.currentActivity) || "Repouso";
    const fault = typeof window !== "undefined" ? window.FaultInjector : null;
    const cloud = typeof window !== "undefined" ? window.CloudMock : null;

    let summary = `RESUMO DO ESTADO DA CASA INTELIGENTE (TUYA + ZIGBEE) - ${timeStr}\n`;
    summary += `Ambiente em atividade: [${currentRoom}], ciclo: ${currentActivity}.\n\n`;

    for (const room of CONFIG.rooms) {
      if (room.type === "outside") continue;
      summary += `• ${room.name}:\n`;
      const roomDevs = devices.filter(d => d.room === room.name);
      const pir = roomDevs.find(d => d.category === "pir");
      const bulb = roomDevs.find(d => d.category === "dj");
      const plug = roomDevs.find(d => d.category === "cz");
      const curtain = roomDevs.find(d => d.category === "cl");
      const door = roomDevs.find(d => d.category === "mcs");

      let statusParts = [];
      if (pir) statusParts.push(`Presença: ${pir.getDP("pir") === "pir" ? "DETECTADA" : "Ausente"} (Luminosidade: ${pir.getDP("bright_value") || 400} lux)`);
      if (bulb) statusParts.push(`Lâmpada: ${bulb.getDP("switch_led") ? "LIGADA (" + (bulb.protocol) + ")" : "Desligada"}`);
      if (plug) statusParts.push(`Tomada: ${plug.name} consumindo ${plug.getDP("cur_power") || 0} W`);
      if (curtain) statusParts.push(`Cortina: ${curtain.percent}% aberta`);
      if (door) statusParts.push(`Porta: ${door.getDP("doorcontact_state")}`);

      summary += statusParts.length > 0 ? `  ${statusParts.join(" | ")}\n` : `  Sem dispositivos ativos.\n`;
    }

    summary += `\nInfraestrutura de Rede:\n`;
    summary += `- HUB Zigbee: ${fault?.hubOffline ? "DESCONECTADO" : "ONLINE"} (Malha com roteadores e nós finais)\n`;
    summary += `- Nuvem Tuya: ${fault?.internetDown ? "INACESSÍVEL (Internet Caída)" : "CONECTADA"} | Cota REST: ${cloud?.dailyQuotaUsed || 0}/${cloud?.dailyQuotaLimit || 100} chamadas\n`;
    return summary;
  }
}

export const DataStore = new DataStoreClass();
if (typeof window !== "undefined") {
  window.DataStore = DataStore;
}
