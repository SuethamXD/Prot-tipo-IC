/**
 * ==============================================================================
 * SMART HOME IoT SIMULATOR 3D (TUYA + ZIGBEE 3.0)
 * Root Modular Orchestrator (ES2022 Module)
 * 
 * Arquitetura em 3 Caixas (GEMINI.md):
 *   1. /contracts  - Schemas e EventBus pub/sub
 *   2. /simulation - Core de telemetria, relógio, RF e modelos lógicos puros
 *   3. /scene      - Visualização 3D Three.js, geometrias da casa e proxies visuais
 *   4. /ui         - Interface HUD, gráficos Chart.js e painel de debug lil-gui
 * ==============================================================================
 */

// 1. Contratos & Barramento
import { EventBus } from './contracts/event-bus.js';

// 2. Simulação (Core & Telemetria)
import { CONFIG, HouseModel } from './simulation/config.js';
import { SimClock } from './simulation/clock.js';
import { RadioModel } from './simulation/radio-mesh.js';
import {
  Device,
  PirSensor,
  ContactSensor,
  SmartPlug,
  SmartBulb,
  Camera,
  CurtainMotor,
  ZigbeeHub,
  WifiRouter
} from './simulation/device-models.js';
import { CloudMock, Collector } from './simulation/cloud-gateway.js';
import { HouseActivity, AutomationEngine, FaultInjector } from './simulation/activity-engine.js';
import { DataStore } from './simulation/datastore.js';

// 3. Cena 3D (Three.js)
import { SceneManager } from './scene/scene-manager.js';

// 4. UI & Debug
import { UIController, TourController } from './ui/hud-controller.js';
import { ChartsController } from './ui/charts-view.js';
import { DebugPanel } from './ui/debug-panel.js';

/* ==========================================================================
   INICIALIZAÇÃO DOS CONTROLADORES PRINCIPAIS
   ========================================================================== */
const viewportContainer = document.getElementById("viewport-container");
const css2dContainer = document.getElementById("css2d-container");

const SceneBuilder = new SceneManager(viewportContainer, css2dContainer);
const Charts = new ChartsController();
const UI = new UIController();
const Tour = new TourController();
const debugPanel = new DebugPanel(SceneBuilder);

// Compatibilidade com referências legadas
window.allDevices = [];
window.SceneBuilder = SceneBuilder;
window.Charts = Charts;
window.UI = UI;
window.Tour = Tour;
window.DataStore = DataStore;
window.SimClock = SimClock;
window.HouseActivity = HouseActivity;
window.Resident = HouseActivity;
window.FaultInjector = FaultInjector;
window.CloudMock = CloudMock;
window.Collector = Collector;
window.RadioModel = RadioModel;
window.debugPanel = debugPanel;

/* ==========================================================================
   CONEXÃO ENTRE CAMADAS VIA EVENTOS
   ========================================================================== */
EventBus.on("scene:camera_view", (view) => {
  SceneBuilder.setCameraView(view);
});

EventBus.on("scene:wall_mode", (mode) => {
  SceneBuilder.applyWallMode(mode);
});

/* ==========================================================================
   PIPELINE DE TRANSMISSÃO DE DADOS (IOT NETWORK & CLOUD)
   ========================================================================== */
EventBus.on("device:event_emitted", (eventData) => {
  UI.pipelineStats.sent++;
  const sentEl = document.getElementById("pstat-dev-sent");
  if (sentEl) sentEl.textContent = UI.pipelineStats.sent;

  const dev = window.allDevices.find(d => d.id === eventData.device_id);
  if (!dev) return;

  // Notificação toast discreta
  if (!UI._lastEventToastTime || (Date.now() - UI._lastEventToastTime > 650)) {
    UI._lastEventToastTime = Date.now();
    let icon = "⚡";
    if (dev.category === "pir") icon = "🚶";
    else if (dev.category === "mcs") icon = "🚪";
    else if (dev.category === "dj") icon = "💡";
    else if (dev.category === "cl") icon = "🪟";
    else if (dev.category === "sp") icon = "📷";

    const valStr = dev.getShortStatus();
    UI.showDiscreetToast(`<span>${icon}</span> <strong>${dev.id}</strong>: <span style="color:var(--electric-blue);">${valStr}</span> <span style="color:var(--text-muted);font-size:10px;">• ${dev.room}</span>`, "info", 1300);
  }

  // 1. Simulação RF e Perda de Pacotes
  const link = RadioModel.calculateLink(dev.pos, RadioModel.hubPos, dev.protocol);
  const trans = RadioModel.simulateTransmission(link.lossProb);

  if (!trans.success) {
    UI.pipelineStats.lost++;
    const total = UI.pipelineStats.sent;
    const lossRate = ((UI.pipelineStats.lost / total) * 100).toFixed(1);
    const mLoss = document.getElementById("metric-loss-rate");
    if (mLoss) mLoss.textContent = `${lossRate}%`;
    const inetLoss = document.getElementById("inet-loss-rate-label");
    if (inetLoss) inetLoss.textContent = `Perda média: ${lossRate}%`;
    const c3Loss = document.getElementById("chart3-loss");
    if (c3Loss) c3Loss.textContent = `${lossRate}% perda`;
    return;
  }

  // 2. Animação 3D do Pacote
  const waypoints = RadioModel.getPacketWaypoints(dev, window.allDevices);
  SceneBuilder.spawnDataPacket(waypoints, dev.protocol);

  // 3. Processamento no Hub
  UI.pipelineStats.hub++;
  const pstatHub = document.getElementById("pstat-hub-proc");
  if (pstatHub) pstatHub.textContent = UI.pipelineStats.hub;

  // 4. Captura Local LAN para dispositivos AC
  if (!dev.hasBattery) {
    Collector.recordLocalLan(eventData);
  }

  // 5. Encaminhamento para a Nuvem Tuya Mock
  if (FaultInjector.internetDown) {
    if (CONFIG.rf.hubBufferEnabled && dev.protocol === "zigbee") {
      const hub = window.allDevices.find(d => d.category === "wg2");
      if (hub && typeof hub.enqueueBuffer === "function") {
        hub.enqueueBuffer(eventData);
      }
    }
    return;
  }

  const cloudRes = CloudMock.receiveFromDevice(eventData);
  if (cloudRes.delivered) {
    UI.pipelineStats.cloud++;
    const pstatCloud = document.getElementById("pstat-cloud-recv");
    if (pstatCloud) pstatCloud.textContent = UI.pipelineStats.cloud;

    const streamEl = document.getElementById("cloud-message-stream");
    if (streamEl) {
      streamEl.textContent = JSON.stringify(cloudRes.pushPayload, null, 2);
    }
  }
});

EventBus.on("collector:event_recorded", (record) => {
  UI.pipelineStats.collector++;
  const colTotal = document.getElementById("pstat-col-total");
  if (colTotal) colTotal.textContent = UI.pipelineStats.collector;
  const dbRows = document.getElementById("pstat-db-rows");
  if (dbRows) dbRows.textContent = `${DataStore.ringBuffer.length} linhas`;
  const totalRows = document.getElementById("dataset-total-rows");
  if (totalRows) totalRows.textContent = `${DataStore.ringBuffer.length} registros`;

  UI.pipelineStats.latencies.push(record.latency_ms);
  if (UI.pipelineStats.latencies.length > 50) UI.pipelineStats.latencies.shift();
  const avgLat = Math.round(UI.pipelineStats.latencies.reduce((a, b) => a + b, 0) / UI.pipelineStats.latencies.length);
  const metricLat = document.getElementById("metric-avg-latency");
  if (metricLat) metricLat.textContent = `${avgLat} ms`;

  if (!UI.eventsPaused) {
    const tbody = document.getElementById("events-table-body");
    if (tbody) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${record.sim_time}</td>
        <td><b>${record.device_name}</b></td>
        <td>${record.room}</td>
        <td><code>${record.dp_code}</code></td>
        <td>${record.value}</td>
        <td><span class="count-badge" style="background:rgba(255,255,255,0.06);color:var(--text-muted);">${record.source}</span></td>
        <td style="color:var(--accent-teal);">${record.latency_ms}ms</td>
      `;
      tbody.insertBefore(tr, tbody.firstChild);
      if (tbody.children.length > 500) tbody.removeChild(tbody.lastChild);
    }
  }
});

EventBus.on("fault:internet_changed", (isDown) => {
  if (!isDown) {
    const hub = window.allDevices.find(d => d.category === "wg2");
    if (hub && hub.bufferQueue && hub.bufferQueue.length > 0) {
      const flushed = hub.flushBuffer();
      UI.showToast(`Internet reconectada: Hub descarregou ${flushed.length} pacotes acumulados em lote!`);
      for (const ev of flushed) {
        CloudMock.receiveFromDevice(ev);
      }
    }
  }
  document.getElementById("pnode-inet")?.classList.toggle("failed", isDown);
  const badge = document.getElementById("pipeline-status-badge");
  if (badge) {
    badge.textContent = isDown ? "OFFLINE (SEM WAN)" : "ONLINE";
    badge.style.color = isDown ? "var(--accent-red)" : "var(--accent-teal)";
  }
});

EventBus.on("fault:hub_changed", (isOffline) => {
  document.getElementById("pnode-hub")?.classList.toggle("failed", isOffline);
});

EventBus.on("hub:buffer_updated", (len) => {
  const ind = document.getElementById("hub-buffer-indicator");
  if (ind) ind.textContent = `Buffer Hub: ${len} pacotes`;
});

EventBus.on("cloud:quota_updated", ({ used, limit }) => {
  const text = document.getElementById("cloud-quota-text");
  if (text) text.textContent = `${used} / ${limit}`;
  const pct = Math.min(100, (used / limit) * 100);
  const bar = document.getElementById("cloud-quota-bar");
  if (bar) {
    bar.style.width = `${pct}%`;
    if (pct >= 100) bar.style.background = "var(--accent-red)";
  }
});

/* ==========================================================================
   GERADOR DE PRESETS (CARREGAMENTO DINÂMICO DE DISPOSITIVOS)
   ========================================================================== */
window.loadPreset = function(presetType = "full") {
  // Limpa malhas existentes na cena
  if (SceneBuilder.sensorVisuals) {
    for (const visual of SceneBuilder.sensorVisuals.visuals.values()) {
      if (visual.group) SceneBuilder.scene.remove(visual.group);
    }
    SceneBuilder.sensorVisuals.visuals.clear();
  }
  window.allDevices = [];

  // Infraestrutura de Comunicação
  const hub = new ZigbeeHub({ id: "HUB-01", name: "HUB Zigbee 3.0", category: "wg2", protocol: "zigbee", pos: { x: 4.5, y: 1.0, z: 6.8 }, room: "Corredor Central" });
  const router = new WifiRouter({ id: "RTR-01", name: "Roteador Wi-Fi 2.4GHz", category: "router", protocol: "wifi", pos: { x: 4.5, y: 1.0, z: 8.2 }, room: "Corredor Central" });
  window.allDevices.push(hub, router);

  // Sensores de Movimento PIR
  const pirs = [
    new PirSensor({ id: "PIR-01", name: "PIR-01 Corredor-Entrada", category: "pir", protocol: "zigbee", pos: { x: 4.5, y: 2.3, z: 13.7 }, room: "Corredor Central", rotY: 180 }),
    new PirSensor({ id: "PIR-02", name: "PIR-02 Corredor-Fundo", category: "pir", protocol: "zigbee", pos: { x: 4.5, y: 2.3, z: 3.7 }, room: "Corredor Central", rotY: 0 }),
    new PirSensor({ id: "PIR-03", name: "PIR-03 Cozinha", category: "pir", protocol: "zigbee", pos: { x: 0.3, y: 2.3, z: 7.2 }, room: "Cozinha", rotY: 45 }),
    new PirSensor({ id: "PIR-04", name: "PIR-04 Lavanderia", category: "pir", protocol: "wifi", pos: { x: 0.3, y: 2.3, z: 3.7 }, room: "Lavanderia", rotY: 45 }),
    new PirSensor({ id: "PIR-05", name: "PIR-05 Banheiro", category: "pir", protocol: "zigbee", pos: { x: 8.8, y: 2.3, z: 8.0 }, room: "Banheiro Social", rotY: -135 }),
    new PirSensor({ id: "PIR-06", name: "PIR-06 Quarto 1", category: "pir", protocol: "zigbee", pos: { x: 8.8, y: 2.3, z: 13.7 }, room: "Quarto 1", rotY: -135 }),
    new PirSensor({ id: "PIR-07", name: "PIR-07 Quarto 2", category: "pir", protocol: "zigbee", pos: { x: 8.8, y: 2.3, z: 3.7 }, room: "Quarto 2", rotY: -45 }),
    new PirSensor({ id: "PIR-08", name: "PIR-08 Quarto 3", category: "pir", protocol: "zigbee", pos: { x: 8.8, y: 2.3, z: 0.3 }, room: "Quarto 3", rotY: -45 })
  ];

  // Sensores Magnéticos de Abertura
  const contacts = [
    new ContactSensor({ id: "CT-01", name: "CT-01 Porta Entrada", category: "mcs", protocol: "wifi", pos: { x: 4.5, y: 2.0, z: 14.0 }, room: "Corredor Central", doorId: "DOOR_ENTRANCE" }),
    new ContactSensor({ id: "CT-02", name: "CT-02 Porta Quarto 3", category: "mcs", protocol: "wifi", pos: { x: 4.5, y: 2.0, z: 3.5 }, room: "Quarto 3", doorId: "DOOR_Q3" }),
    new ContactSensor({ id: "CT-03", name: "CT-03 Porta Quarto 2", category: "mcs", protocol: "wifi", pos: { x: 5.2, y: 2.0, z: 5.6 }, room: "Quarto 2", doorId: "DOOR_Q2" }),
    new ContactSensor({ id: "CT-04", name: "CT-04 Porta Banheiro", category: "mcs", protocol: "wifi", pos: { x: 5.2, y: 2.0, z: 8.9 }, room: "Banheiro Social", doorId: "DOOR_WC" }),
    new ContactSensor({ id: "CT-05", name: "CT-05 Porta Quarto 1", category: "mcs", protocol: "wifi", pos: { x: 5.2, y: 2.0, z: 12.0 }, room: "Quarto 1", doorId: "DOOR_Q1" }),
    new ContactSensor({ id: "CT-06", name: "CT-06 Porta Cozinha", category: "mcs", protocol: "wifi", pos: { x: 3.8, y: 2.0, z: 8.7 }, room: "Cozinha", doorId: "DOOR_COZ_CORR" }),
    new ContactSensor({ id: "CT-07", name: "CT-07 Porta Lavanderia", category: "mcs", protocol: "wifi", pos: { x: 1.6, y: 2.0, z: 7.0 }, room: "Lavanderia", doorId: "DOOR_LAV_COZ" }),
    new ContactSensor({ id: "CT-08", name: "CT-08 Janela Cozinha", category: "mcs", protocol: "wifi", pos: { x: 0.0, y: 1.5, z: 8.8 }, room: "Cozinha", windowId: "WIN_COZ" }),
    new ContactSensor({ id: "CT-09", name: "CT-09 Janela Quarto 1", category: "mcs", protocol: "wifi", pos: { x: 9.0, y: 1.5, z: 12.2 }, room: "Quarto 1", windowId: "WIN_Q1" }),
    new ContactSensor({ id: "CT-10", name: "CT-10 Janela Quarto 2", category: "mcs", protocol: "wifi", pos: { x: 9.0, y: 1.5, z: 5.6 }, room: "Quarto 2", windowId: "WIN_Q2" }),
    new ContactSensor({ id: "CT-11", name: "CT-11 Janela Quarto 3", category: "mcs", protocol: "wifi", pos: { x: 4.5, y: 1.5, z: 0.0 }, room: "Quarto 3", windowId: "WIN_Q3" })
  ];

  // Tomadas Inteligentes
  const plugs = [
    new SmartPlug({ id: "PL-01", name: "PL-01 Geladeira (20A)", category: "cz", protocol: "wifi", pos: { x: 3.3, y: 0.4, z: 10.2 }, room: "Cozinha", hasMeter: true, profile: "fridge" }),
    new SmartPlug({ id: "PL-02", name: "PL-02 Lavadora (20A)", category: "cz", protocol: "wifi", pos: { x: 0.4, y: 0.4, z: 4.0 }, room: "Lavanderia", hasMeter: true, profile: "washer" }),
    new SmartPlug({ id: "PL-03", name: "PL-03 TV Q3 (20A)", category: "cz", protocol: "wifi", pos: { x: 8.7, y: 0.4, z: 1.0 }, room: "Quarto 3", hasMeter: true, profile: "tv" }),
    new SmartPlug({ id: "PL-04", name: "PL-04 PC Quarto 2 (20A)", category: "cz", protocol: "wifi", pos: { x: 8.7, y: 0.4, z: 4.6 }, room: "Quarto 2", hasMeter: true, profile: "pc" }),
    new SmartPlug({ id: "PL-05", name: "PL-05 Ventilador Q1 (20A)", category: "cz", protocol: "wifi", pos: { x: 8.7, y: 0.4, z: 13.0 }, room: "Quarto 1", hasMeter: true, profile: "fan" }),
    new SmartPlug({ id: "PL-06", name: "PL-06 Cozinha (10A)", category: "cz", protocol: "wifi", pos: { x: 0.3, y: 1.0, z: 9.0 }, room: "Cozinha", hasMeter: false, profile: "generic" })
  ];

  // Lâmpadas Inteligentes
  const bulbs = [
    new SmartBulb({ id: "BL-01", name: "Lâmpada Quarto 3", category: "dj", protocol: "wifi", pos: { x: 4.5, y: 2.6, z: 1.8 }, room: "Quarto 3" }),
    new SmartBulb({ id: "BL-02", name: "Lâmpada Quarto 2", category: "dj", protocol: "wifi", pos: { x: 7.1, y: 2.6, z: 5.6 }, room: "Quarto 2" }),
    new SmartBulb({ id: "BL-03", name: "Lâmpada Quarto 1", category: "dj", protocol: "wifi", pos: { x: 7.1, y: 2.6, z: 12.0 }, room: "Quarto 1" }),
    new SmartBulb({ id: "BL-04", name: "Lâmpada Corredor-Fundo", category: "dj", protocol: "zigbee", pos: { x: 4.5, y: 2.6, z: 5.5 }, room: "Corredor Central" }),
    new SmartBulb({ id: "BL-05", name: "Lâmpada Corredor-Entrada", category: "dj", protocol: "zigbee", pos: { x: 4.5, y: 2.6, z: 11.5 }, room: "Corredor Central" }),
    new SmartBulb({ id: "BL-06", name: "Lâmpada Cozinha", category: "dj", protocol: "zigbee", pos: { x: 1.9, y: 2.6, z: 8.7 }, room: "Cozinha" }),
    new SmartBulb({ id: "BL-07", name: "Lâmpada Lavanderia", category: "dj", protocol: "zigbee", pos: { x: 1.9, y: 2.6, z: 5.2 }, room: "Lavanderia" }),
    new SmartBulb({ id: "BL-08", name: "Lâmpada Banheiro", category: "dj", protocol: "zigbee", pos: { x: 7.1, y: 2.6, z: 8.9 }, room: "Banheiro Social" })
  ];

  // Câmeras e Cortinas
  const cameras = [
    new Camera({ id: "CAM-01", name: "CAM-01 Corredor Entrada", category: "sp", protocol: "wifi", pos: { x: 4.5, y: 2.5, z: 13.8 }, room: "Corredor Central" }),
    new Camera({ id: "CAM-02", name: "CAM-02 Cozinha", category: "sp", protocol: "wifi", pos: { x: 0.3, y: 2.4, z: 10.3 }, room: "Cozinha" })
  ];

  const curtains = [
    new CurtainMotor({ id: "CM-01", name: "CM-01 Cortina Quarto 1", category: "cl", protocol: "wifi", pos: { x: 9.0, y: 2.2, z: 12.2 }, room: "Quarto 1", windowId: "WIN_Q1" }),
    new CurtainMotor({ id: "CM-02", name: "CM-02 Cortina Quarto 3", category: "cl", protocol: "wifi", pos: { x: 4.5, y: 2.2, z: 0.0 }, room: "Quarto 3", windowId: "WIN_Q3" })
  ];

  if (presetType === "minimal") {
    window.allDevices.push(pirs[0], contacts[0], plugs[0], bulbs[2], bulbs[3], cameras[0], curtains[0]);
  } else if (presetType === "medium") {
    window.allDevices.push(
      pirs[0], pirs[2], pirs[4], pirs[5],
      contacts[0], contacts[3], contacts[4], contacts[5],
      plugs[0], plugs[3], plugs[4],
      bulbs[2], bulbs[3], bulbs[5], bulbs[7],
      cameras[0], curtains[0]
    );
  } else {
    window.allDevices.push(...pirs, ...contacts, ...plugs, ...bulbs, ...cameras, ...curtains);
  }

  // Registra dispositivos na nuvem e cria malhas 3D desacopladas
  for (const dev of window.allDevices) {
    SceneBuilder.createDeviceMesh(dev);
    CloudMock.registerDevice(dev);
  }

  RadioModel.updateZigbeeMesh(window.allDevices);
  SceneBuilder.updateZigbeeMeshLines(window.allDevices);
  UI.renderInventory();

  // API Explorer
  const selApi = document.getElementById("api-device-select");
  if (selApi) {
    selApi.innerHTML = "";
    for (const dev of window.allDevices) {
      const opt = document.createElement("option");
      opt.value = dev.id;
      opt.textContent = `${dev.name} (${dev.id})`;
      selApi.appendChild(opt);
    }
  }

  UI.logNotification("system", `Preset [${presetType}] carregado (${window.allDevices.length} dispositivos ativos).`, "info");
};

// Carrega preset completo padrão
window.loadPreset("full");

/* ==========================================================================
   LOOP DE ANIMAÇÃO PRINCIPAL (60 FPS)
   ========================================================================== */
let lastFrameTime = performance.now();
let chartTimer = 0;
let summaryTimer = 0;

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const deltaRealSec = Math.min((now - lastFrameTime) / 1000.0, 0.1);
  lastFrameTime = now;

  // 1. Atualiza Relógio Virtual
  SimClock.update();
  const deltaSimSec = deltaRealSec * SimClock.speed * (SimClock.paused ? 0 : 1);
  const clockEl = document.getElementById("clock-display");
  if (clockEl) clockEl.textContent = SimClock.getFormattedSimTime();

  // 2. Atualiza Rotinas do Morador
  HouseActivity.update(deltaSimSec, window.allDevices);
  const hudRoom = document.getElementById("hud-active-room");
  if (hudRoom) hudRoom.textContent = HouseActivity.currentRoom;
  const hudAct = document.getElementById("hud-sim-activity");
  if (hudAct) hudAct.textContent = HouseActivity.currentActivity;

  // 3. Atualiza Dispositivos
  for (const dev of window.allDevices) {
    dev.update(deltaSimSec);
  }

  // 4. Automações e Polling
  AutomationEngine.update(deltaSimSec);
  Collector.updatePolling(deltaSimSec, window.allDevices);

  // 5. Renderização 3D Three.js
  SceneBuilder.update(deltaRealSec);

  // 6. Atualização dos Gráficos (throttled a cada 0.5s reais)
  chartTimer += deltaRealSec;
  if (chartTimer > 0.5) {
    chartTimer = 0;
    Charts.update(window.allDevices);
  }

  // 7. Resumo Textual para LLM (a cada 4s reais)
  summaryTimer += deltaRealSec;
  if (summaryTimer > 4.0) {
    summaryTimer = 0;
    const summaryEl = document.getElementById("llm-state-summary");
    if (summaryEl) {
      summaryEl.textContent = DataStore.generateLlmSummary(window.allDevices);
    }
  }

  // 8. Debug Panel
  debugPanel.update();
}

animate();
