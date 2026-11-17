/**
 * ==============================================================================
 * IOT DEVICE MODELS (CORE SIMULATION & STATE)
 * js/simulation/device-models.js
 * 
 * Modelos polimórficos de dispositivos (Tuya DPs, bateria, lógica de estado).
 * ISOLAMENTO: ZERO Three.js e ZERO manipulação direta de DOM.
 * Toda a sincronização visual com a cena e a UI ocorre via EventBus e Contratos.
 * ==============================================================================
 */

import { CONFIG } from './config.js';
import { EventBus } from '../contracts/event-bus.js';
import { createSensorContract } from '../contracts/sensor-schema.js';

export class Device {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.category = config.category;
    this.protocol = config.protocol; // "zigbee" ou "wifi"
    this.pos = { x: config.pos.x, y: config.pos.y, z: config.pos.z };
    this.room = config.room;
    this.status = config.status || "online";
    this.battery = config.battery !== undefined ? config.battery : 100;
    this.isRouter = !!config.isRouter;
    this.rotY = config.rotY || 0;
    this.hasBattery = config.hasBattery !== undefined ? config.hasBattery : false;

    this.parent = null;
    this.hops = 0;
    this.rssi = -50;
    this.lqi = 200;

    this.dps = new Map();
    this.dpsHistory = [];
    this.lastPayload = null;
    this.showLabel = true;
  }

  getShortStatus() {
    if (this.status === "offline") return "OFF";
    return "OK";
  }

  toContract() {
    return createSensorContract(this);
  }

  setDP(code, value, silent = false) {
    const oldVal = this.dps.get(code);
    if (oldVal === value && !silent) return;
    this.dps.set(code, value);

    EventBus.emit("device:dp_updated", {
      deviceId: this.id,
      code,
      value,
      shortStatus: this.getShortStatus()
    });

    if (!silent) {
      this.emitEvent(code, value);
    }
  }

  getDP(code) {
    return this.dps.get(code);
  }

  drainBattery(amount) {
    if (!this.hasBattery) return;
    this.battery = Math.max(0, Number((this.battery - amount).toFixed(2)));
    this.dps.set("battery_percentage", Math.round(this.battery));
    if (this.battery <= 0) {
      this.status = "offline";
      EventBus.emit("device:status_changed", { device: this, status: "offline", reason: "battery_empty" });
    }
  }

  toggleOffline() {
    this.status = this.status === "online" ? "offline" : "online";
    EventBus.emit("device:status_changed", { device: this, status: this.status, reason: "manual_toggle" });
  }

  switchProtocol() {
    if (this.category === "wg2" || this.category === "router") return;
    this.protocol = this.protocol === "zigbee" ? "wifi" : "zigbee";
    EventBus.emit("device:protocol_changed", { device: this, protocol: this.protocol });
  }

  triggerVisualPulse() {
    EventBus.emit("device:pulse", { id: this.id, category: this.category, protocol: this.protocol });
  }

  emitEvent(dpCode, value) {
    if (this.status !== "online") return;

    if (this.hasBattery) {
      const drain = this.protocol === "wifi" ? 0.015 : 0.002;
      this.drainBattery(drain);
    }

    this.triggerVisualPulse();

    const eventData = {
      device_id: this.id,
      device_name: this.name,
      room: this.room,
      type: this.category,
      protocol: this.protocol,
      dp_code: dpCode,
      value: value,
      battery: this.hasBattery ? Math.round(this.battery) : 100,
      rssi: this.rssi,
      lqi: this.lqi,
      hops: this.hops,
      pos: { ...this.pos }
    };

    this.lastPayload = eventData;
    EventBus.emit("device:event_emitted", eventData);
    EventBus.emit("sensor:state_updated", this.toContract());
  }

  forceEvent() {}

  update(deltaSec) {}
}

export class PirSensor extends Device {
  constructor(config) {
    super({ ...config, hasBattery: true });
    this.lockoutRemaining = 0;
    this.lockoutDuration = CONFIG.sim.pirLockoutSec;
    this.setDP("pir", "none", true);
    this.setDP("battery_percentage", 100, true);
    this.setDP("bright_value", 400, true);
  }

  triggerDetection(currentRoomLux = 400) {
    if (this.status !== "online") return;
    this.setDP("bright_value", Math.round(currentRoomLux), true);
    if (this.lockoutRemaining <= 0) {
      this.setDP("pir", "pir");
      this.lockoutRemaining = this.lockoutDuration;
      EventBus.emit("pir:triggered", { device: this, room: this.room });
      if (typeof window !== "undefined" && window.logNotification) {
        window.logNotification("automation", `Detecção de presença em [${this.room}] via ${this.id}`);
      }
    }
  }

  checkDetection(activeRoom, currentRoomLux = 400) {
    if (this.status !== "online") return;
    if (activeRoom === this.room) {
      this.triggerDetection(currentRoomLux);
    }
  }

  update(deltaSimSec) {
    super.update(deltaSimSec);
    if (this.lockoutRemaining > 0) {
      this.lockoutRemaining -= deltaSimSec;
      if (this.lockoutRemaining <= 0) {
        this.lockoutRemaining = 0;
        this.setDP("pir", "none");
      }
    }
  }

  forceEvent() {
    const next = this.getDP("pir") === "pir" ? "none" : "pir";
    this.setDP("pir", next);
    if (next === "pir") {
      EventBus.emit("pir:triggered", { device: this, room: this.room });
      if (typeof window !== "undefined" && window.logNotification) {
        window.logNotification("automation", `Presença forçada manualmente em [${this.room}] (${this.id})`);
      }
    }
  }

  getShortStatus() {
    if (this.status === "offline") return "OFF";
    return this.getDP("pir") === "pir" ? "MOV" : "ok";
  }
}

export class ContactSensor extends Device {
  constructor(config) {
    super({ ...config, hasBattery: true });
    this.doorId = config.doorId || null;
    this.windowId = config.windowId || null;
    this.setDP("doorcontact_state", "closed", true);
    this.setDP("battery_percentage", 100, true);
  }

  setOpen(isOpen) {
    const stateStr = isOpen ? "open" : "closed";
    if (this.getDP("doorcontact_state") !== stateStr) {
      this.setDP("doorcontact_state", stateStr);
      if (typeof window !== "undefined" && window.logNotification) {
        window.logNotification("system", `Sensor [${this.id}] (${this.name}): ${isOpen ? 'ABERTO' : 'FECHADO'}`);
      }
    }
  }

  forceEvent() {
    const cur = this.getDP("doorcontact_state") === "open";
    this.setOpen(!cur);
  }

  getShortStatus() {
    if (this.status === "offline") return "OFF";
    return this.getDP("doorcontact_state") === "open" ? "ABERTA" : "fechada";
  }
}

export class SmartPlug extends Device {
  constructor(config) {
    super({ ...config, hasBattery: false });
    this.hasMeter = config.hasMeter !== undefined ? config.hasMeter : true;
    this.profile = config.profile || "generic";
    this.cycleTimer = 0;
    this.addEle = 0.0;
    this.setDP("switch_1", true, true);
    this.setDP("cur_voltage", 127.0, true);
    this.setDP("cur_power", 0.0, true);
    this.setDP("cur_current", 0, true);
    this.setDP("add_ele", 0.0, true);
  }

  updatePower(deltaSimSec, residentRoom) {
    if (this.status !== "online" || !this.getDP("switch_1")) {
      if (this.getDP("cur_power") > 0) {
        this.setDP("cur_power", 0.0);
        this.setDP("cur_current", 0);
      }
      return;
    }

    this.cycleTimer += deltaSimSec;
    let powerW = 0.0;
    const inSameRoom = residentRoom === this.room;

    switch (this.profile) {
      case "fridge":
        const cyclePhase = (this.cycleTimer % 600) / 600.0;
        powerW = cyclePhase < 0.4 ? 115.0 + Math.sin(this.cycleTimer * 0.1) * 8.0 : 2.2;
        break;
      case "washer":
        powerW = inSameRoom ? 380.0 + Math.sin(this.cycleTimer * 0.5) * 60.0 : 1.5;
        break;
      case "tv":
        powerW = inSameRoom ? 95.0 + Math.random() * 10.0 : 0.8;
        break;
      case "pc":
        powerW = inSameRoom ? 175.0 + Math.random() * 25.0 : 3.5;
        break;
      case "fan":
        powerW = inSameRoom ? 45.0 : 0.0;
        break;
      default:
        powerW = 10.0;
        break;
    }

    if (this.hasMeter) {
      const oldP = this.getDP("cur_power");
      if (Math.abs(powerW - oldP) > 5.0 || Math.floor(this.cycleTimer / 30) !== Math.floor((this.cycleTimer - deltaSimSec) / 30)) {
        const v = 127.0 + (Math.random() - 0.5) * 2.0;
        const currentMa = Math.round((powerW / v) * 1000);
        this.addEle += (powerW * (deltaSimSec / 3600.0)) / 1000.0;

        this.setDP("cur_voltage", Number(v.toFixed(1)), true);
        this.setDP("cur_current", currentMa, true);
        this.setDP("add_ele", Number(this.addEle.toFixed(3)), true);
        this.setDP("cur_power", Number(powerW.toFixed(1)));
      }
    }
  }

  forceEvent() {
    const cur = this.getDP("switch_1");
    this.setDP("switch_1", !cur);
  }

  getShortStatus() {
    if (this.status === "offline") return "OFF";
    if (!this.getDP("switch_1")) return "OFF";
    return this.hasMeter ? `${Math.round(this.getDP("cur_power") || 0)}W` : "ON";
  }
}

export class SmartBulb extends Device {
  constructor(config) {
    super({ ...config, hasBattery: false, isRouter: config.protocol === "zigbee" });
    this.setDP("switch_led", false, true);
    this.setDP("work_mode", "white", true);
    this.setDP("bright_value_v2", 800, true);
    this.setDP("temp_value_v2", 500, true);
  }

  setOn(isOn) {
    if (this.getDP("switch_led") !== isOn) {
      this.setDP("switch_led", isOn);
    }
  }

  forceEvent() {
    this.setOn(!this.getDP("switch_led"));
  }

  getShortStatus() {
    if (this.status === "offline") return "OFF";
    return this.getDP("switch_led") ? "LIGADA" : "DESL";
  }
}

export class Camera extends Device {
  constructor(config) {
    super({ ...config, hasBattery: false });
    this.setDP("person_detected", false, true);
  }

  checkDetection(activeRoom) {
    if (this.status !== "online") return;
    const detected = activeRoom === this.room;
    if (this.getDP("person_detected") !== detected) {
      this.setDP("person_detected", detected);
      if (detected && typeof window !== "undefined" && window.logNotification) {
        window.logNotification("automation", `Câmera [${this.id}] detectou presença em [${this.room}]`);
      }
    }
  }

  forceEvent() {
    const next = !this.getDP("person_detected");
    this.setDP("person_detected", next);
    if (typeof window !== "undefined" && window.logNotification) {
      window.logNotification("automation", `Câmera [${this.id}] ${next ? 'detectou presença' : 'em repouso'}`);
    }
  }

  getShortStatus() {
    if (this.status === "offline") return "OFF";
    return this.getDP("person_detected") ? "PESSOA" : (this.getDP("motion_tracking") ? "REC" : "STBY");
  }
}

export class CurtainMotor extends Device {
  constructor(config) {
    super({ ...config, hasBattery: false });
    this.windowId = config.windowId || null;
    this.percent = 0;
    this.targetPercent = 0;
    this.setDP("control", "stop", true);
    this.setDP("percent_control", 0, true);
    this.setDP("percent_state", 0, true);
  }

  setTarget(percent) {
    this.targetPercent = Math.max(0, Math.min(100, percent));
    this.setDP("percent_control", this.targetPercent);
  }

  update(deltaSec) {
    super.update(deltaSec);
    if (this.percent !== this.targetPercent) {
      const step = deltaSec * 30.0;
      if (Math.abs(this.targetPercent - this.percent) <= step) {
        this.percent = this.targetPercent;
        this.setDP("percent_state", Math.round(this.percent));
        this.setDP("control", "stop");
      } else {
        this.percent += Math.sign(this.targetPercent - this.percent) * step;
        this.setDP("percent_state", Math.round(this.percent), true);
      }
    }
  }

  forceEvent() {
    const next = this.percent > 50 ? 0 : 100;
    this.setTarget(next);
  }

  getShortStatus() {
    if (this.status === "offline") return "OFF";
    const p = this.getDP("percent_control");
    return p === 0 ? "0%" : `${p}%`;
  }
}

export class ZigbeeHub extends Device {
  constructor(config) {
    super({ ...config, hasBattery: false, isRouter: true });
    this.bufferQueue = [];
    this.setDP("online", true, true);
  }

  enqueueBuffer(packet) {
    this.bufferQueue.push(packet);
    EventBus.emit("hub:buffer_updated", this.bufferQueue.length);
  }

  flushBuffer() {
    const flushed = [...this.bufferQueue];
    this.bufferQueue = [];
    EventBus.emit("hub:buffer_updated", 0);
    return flushed;
  }

  getShortStatus() {
    return "HUB";
  }
}

export class WifiRouter extends Device {
  constructor(config) {
    super({ ...config, hasBattery: false, isRouter: false });
    this.setDP("online", true, true);
  }

  getShortStatus() {
    return "WAN";
  }
}
