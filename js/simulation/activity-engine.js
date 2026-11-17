/**
 * ==============================================================================
 * RESIDENT BEHAVIOR & AUTOMATION ENGINE
 * js/simulation/activity-engine.js
 * 
 * Rotina horária do morador, disparo de eventos e motor de automações (Tuya Cloud vs Local Hub).
 * ISOLAMENTO: Proibido Three.js ou estilos CSS.
 * ==============================================================================
 */

import { CONFIG, HouseModel } from './config.js';
import { SimClock } from './clock.js';
import { EventBus } from '../contracts/event-bus.js';

export class HouseActivityClass {
  constructor() {
    this.pos = { x: 7.1, y: 0.0, z: 13.0 };
    this.currentRoom = "Quarto 1";
    this.currentActivity = "Descanso Noturno";
    this.lastCheckedRoutineMinute = -1;
    this.eventTimer = 0;
    this.doorTimer = 0;

    this.routineSchedule = [
      { time: "06:30", room: "Quarto 1", activity: "Despertar no Quarto 1" },
      { time: "06:45", room: "Banheiro Social", activity: "Higiene matinal no Banheiro" },
      { time: "07:15", room: "Cozinha", activity: "Café da manhã na Cozinha" },
      { time: "08:00", room: "Corredor Central", activity: "Atividades e Circulação" },
      { time: "12:00", room: "Cozinha", activity: "Preparo de Almoço na Cozinha" },
      { time: "13:30", room: "Quarto 2", activity: "Trabalho e Estudo no Quarto 2" },
      { time: "18:00", room: "Corredor Central", activity: "Retorno e Circulação" },
      { time: "19:00", room: "Cozinha", activity: "Jantar na Cozinha" },
      { time: "20:30", room: "Quarto 3", activity: "Assistindo TV no Quarto 3" },
      { time: "22:00", room: "Banheiro Social", activity: "Banho no Banheiro Social" },
      { time: "22:45", room: "Quarto 1", activity: "Descanso Noturno no Quarto 1" }
    ];
  }

  setActiveRoom(roomName) {
    if (!roomName) return;
    this.currentRoom = roomName;
    EventBus.emit("house:room_changed", this.currentRoom);
  }

  findRoomAt(x, z) {
    if (!CONFIG || !CONFIG.rooms) return null;
    return CONFIG.rooms.find(r => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2);
  }

  setDestinationCoord(x, z) {
    this.pos = { x, y: 0.0, z };
    const room = this.findRoomAt(x, z);
    if (room) {
      this.setActiveRoom(room.name);
      this.currentActivity = `Foco manual em ${room.name}`;
      if (typeof window !== "undefined" && window.logNotification) {
        window.logNotification("system", `Cômodo ativo alterado para ${room.name}.`, "info");
      }
    }
  }

  update(deltaSimSec, devices) {
    this.checkSchedule();

    this.eventTimer += deltaSimSec;
    if (this.eventTimer >= 8.0) {
      this.eventTimer = 0;
      this.triggerAmbientActivity(devices);
    }

    this.doorTimer += deltaSimSec;
    if (this.doorTimer >= 35.0) {
      this.doorTimer = 0;
      this.triggerDoorActivity(devices);
    }

    for (const dev of devices) {
      if (dev.category === "cz") {
        dev.updatePower(deltaSimSec, this.currentRoom);
      } else if (dev.category === "sp") {
        dev.checkDetection(this.currentRoom);
      }
    }
  }

  checkSchedule() {
    const curMin = SimClock.simTime.getHours() * 60 + SimClock.simTime.getMinutes();
    if (curMin === this.lastCheckedRoutineMinute) return;
    this.lastCheckedRoutineMinute = curMin;

    for (const item of this.routineSchedule) {
      const [h, m] = item.time.split(":").map(Number);
      const schedMin = h * 60 + m;
      if (curMin === schedMin) {
        this.currentRoom = item.room;
        this.currentActivity = item.activity;
        EventBus.emit("house:activity_changed", item.activity);
        EventBus.emit("house:room_changed", item.room);
        break;
      }
    }
  }

  triggerAmbientActivity(devices) {
    if (!devices || devices.length === 0) return;
    const pirsInRoom = devices.filter(d => d.category === "pir" && d.room === this.currentRoom && d.status === "online");
    const allPirs = devices.filter(d => d.category === "pir" && d.status === "online");
    const targetPir = pirsInRoom.length > 0
      ? pirsInRoom[Math.floor(Math.random() * pirsInRoom.length)]
      : allPirs[Math.floor(Math.random() * allPirs.length)];

    if (targetPir) {
      targetPir.setDP("pir", "pir");
      targetPir.lockoutRemaining = targetPir.lockoutDuration || 6;
      EventBus.emit("pir:triggered", { device: targetPir, room: targetPir.room });
    }
  }

  triggerDoorActivity(devices) {
    const doors = HouseModel.doorDefs;
    if (!doors || doors.length === 0) return;
    const door = doors[Math.floor(Math.random() * doors.length)];
    if (!door) return;

    EventBus.emit("door:state_changed", { doorId: door.id, isOpen: true });
    const sensor = devices.find(d => d.doorId === door.id);
    if (sensor) sensor.setOpen(true);

    setTimeout(() => {
      EventBus.emit("door:state_changed", { doorId: door.id, isOpen: false });
      if (sensor) sensor.setOpen(false);
    }, 5000);
  }
}

export const HouseActivity = new HouseActivityClass();
export const Resident = HouseActivity;

export class AutomationEngineClass {
  constructor() {
    this.rules = {
      pirLight: {
        enabled: true,
        target: "cloud",
        name: "Iluminação por Presença"
      },
      nightDoor: {
        enabled: true,
        target: "local",
        name: "Recepção Noturna"
      },
      solarCurtain: {
        enabled: true,
        target: "cloud",
        name: "Cortina Solar"
      }
    };

    this.pirLightTimers = new Map();
    this.initListeners();
  }

  initListeners() {
    EventBus.on("pir:triggered", ({ device, room }) => {
      if (!this.rules.pirLight.enabled) return;
      const bulb = typeof window !== "undefined" && window.allDevices?.find(d => d.category === "dj" && d.room === room);
      if (bulb && bulb.getDP("switch_led")) {
        this.pirLightTimers.set(room, 120);
        return;
      }
      this.executeRule(this.rules.pirLight.target, "Iluminação por Presença", () => {
        if (bulb) {
          bulb.setOn(true);
          this.pirLightTimers.set(room, 120);
        }
      });
    });

    EventBus.on("device:event_emitted", (eventData) => {
      if (!this.rules.nightDoor.enabled) return;
      if (eventData.dp_code === "doorcontact_state" && eventData.value === "open" && eventData.device_id === "CT-01") {
        const hour = SimClock.simTime.getHours();
        const isNight = hour >= 18 || hour < 6;
        if (isNight) {
          this.executeRule(this.rules.nightDoor.target, "Recepção Noturna", () => {
            const corridorBulbs = (typeof window !== "undefined" && window.allDevices?.filter(d => d.category === "dj" && d.room === "Corredor Central")) || [];
            for (const b of corridorBulbs) {
              b.setOn(true);
            }
          });
        }
      }
    });

    EventBus.on("clock:tick", ({ externalLux }) => {
      if (!this.rules.solarCurtain.enabled) return;
      if (externalLux > 40000) {
        const curtain = typeof window !== "undefined" && window.allDevices?.find(d => d.id === "CM-01");
        if (curtain && curtain.percent < 90 && curtain.targetPercent < 90) {
          this.executeRule(this.rules.solarCurtain.target, "Cortina Solar", () => {
            curtain.setTarget(100);
          });
        }
      }
    });
  }

  executeRule(target, ruleName, actionCallback) {
    if (target === "cloud") {
      if (typeof window !== "undefined" && window.FaultInjector && window.FaultInjector.internetDown) {
        if (window.logNotification) {
          window.logNotification("fault", `Automação [${ruleName}] falhou: Internet indisponível para Cena Tuya!`, "error");
        }
        return;
      }
      setTimeout(() => {
        actionCallback();
        if (typeof window !== "undefined" && window.logNotification) {
          window.logNotification("automation", `Automação [${ruleName}] executada via Nuvem Tuya (Latência: ~240ms)`);
        }
      }, 240);
    } else {
      setTimeout(() => {
        actionCallback();
        if (typeof window !== "undefined" && window.logNotification) {
          window.logNotification("automation", `Automação [${ruleName}] executada Localmente no HUB (Latência: ~30ms)`);
        }
      }, 30);
    }
  }

  update(deltaSimSec) {
    for (const [room, time] of this.pirLightTimers.entries()) {
      const updated = time - deltaSimSec;
      if (updated <= 0) {
        this.pirLightTimers.delete(room);
        const bulb = typeof window !== "undefined" && window.allDevices?.find(d => d.category === "dj" && d.room === room);
        if (bulb) bulb.setOn(false);
      } else {
        this.pirLightTimers.set(room, updated);
      }
    }
  }
}

export const AutomationEngine = new AutomationEngineClass();

export class FaultInjectorClass {
  constructor() {
    this.internetDown = false;
    this.hubOffline = false;
    this.globalPacketLoss = 0.0;
    this.cloudLatencySpike = false;
    this.trialExpired = false;
    this.rfInterference = false;
  }

  setInternetDown(isDown) {
    this.internetDown = isDown;
    EventBus.emit("fault:internet_changed", isDown);
    if (typeof window !== "undefined" && window.logNotification) {
      window.logNotification("fault", isDown ? "⚠️ Internet Caída: Nuvem Tuya inacessível!" : "✅ Internet restabelecida!", isDown ? "warn" : "info");
    }
  }

  setHubOffline(isOffline) {
    this.hubOffline = isOffline;
    const hub = typeof window !== "undefined" && window.allDevices?.find(d => d.category === "wg2");
    if (hub) hub.status = isOffline ? "offline" : "online";
    EventBus.emit("fault:hub_changed", isOffline);
    if (typeof window !== "undefined" && window.logNotification) {
      window.logNotification("fault", isOffline ? "⚠️ HUB Zigbee Desconectado: Rede em malha inativa!" : "✅ HUB Zigbee Online!", isOffline ? "error" : "info");
    }
  }

  setGlobalPacketLoss(pct) {
    this.globalPacketLoss = pct / 100.0;
    EventBus.emit("fault:loss_changed", this.globalPacketLoss);
    if (typeof window !== "undefined" && window.logNotification) {
      window.logNotification("fault", `Perda de pacotes ajustada para ${pct}%`, pct > 0 ? "warn" : "info");
    }
  }

  setCloudLatencySpike(hasSpike) {
    this.cloudLatencySpike = hasSpike;
    if (typeof window !== "undefined" && window.logNotification) {
      window.logNotification("fault", hasSpike ? "⚠️ Pico de Latência na Nuvem ativado (+2000ms)" : "Latência da Nuvem normalizada", hasSpike ? "warn" : "info");
    }
  }

  setTrialExpired(expired) {
    this.trialExpired = expired;
    if (typeof window !== "undefined" && window.CloudMock) {
      window.CloudMock.trialExpired = expired;
    }
    if (typeof window !== "undefined" && window.logNotification) {
      window.logNotification("fault", expired ? "❌ Licença Tuya Expirada (HTTP 403 Forbidden)" : "Licença Tuya Ativa", expired ? "error" : "info");
    }
  }

  setRfInterference(hasInterference) {
    this.rfInterference = hasInterference;
    if (typeof window !== "undefined" && window.logNotification) {
      window.logNotification("fault", hasInterference ? "⚠️ Interferência RF 2.4GHz ativada (-15 dBm de sinal)" : "Sinal RF normalizado", hasInterference ? "warn" : "info");
    }
  }
}

export const FaultInjector = new FaultInjectorClass();
if (typeof window !== "undefined") {
  window.HouseActivity = HouseActivity;
  window.Resident = Resident;
  window.AutomationEngine = AutomationEngine;
  window.FaultInjector = FaultInjector;
}
