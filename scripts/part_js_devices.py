# part_js_devices.py - Classes de Dispositivos e Subclasses com DPs Tuya
JS_DEVICES = '''    /* ==========================================================================
       6. DEVICE E SUBCLASSES - MODELOS POLIMÓRFICOS DE DISPOSITIVOS IOT
       ========================================================================== */
    class Device {
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

        // Armazenamento de DataPoints (DPs)
        this.dps = new Map();
        this.dpsHistory = [];

        // Referências visuais 3D
        this.meshGroup = null;
        this.ledMesh = null;
        this.pulseMesh = null;
        this.pulseAnimTime = 0;
        this.labelObject = null;
        this.labelElement = null;
        this.showLabel = true;
      }

      getShortStatus() {
        if (this.status === "offline") return "OFF";
        return "OK";
      }

      updateLabel() {
        if (!this.labelElement) return;
        const statusEl = this.labelElement.querySelector(".dev-status");
        if (statusEl) {
          statusEl.textContent = this.getShortStatus();
        }
      }

      setDP(code, value, silent = false) {
        const oldVal = this.dps.get(code);
        if (oldVal === value && !silent) return;
        this.dps.set(code, value);
        this.updateLabel();

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
          this.updateLabel();
          EventBus.emit("device:status_changed", { device: this, status: "offline", reason: "battery_empty" });
        }
      }

      toggleOffline() {
        this.status = this.status === "online" ? "offline" : "online";
        this.updateLabel();
        EventBus.emit("device:status_changed", { device: this, status: this.status, reason: "manual_toggle" });
      }

      switchProtocol() {
        if (this.category === "wg2" || this.category === "router") return;
        this.protocol = this.protocol === "zigbee" ? "wifi" : "zigbee";
        EventBus.emit("device:protocol_changed", { device: this, protocol: this.protocol });
      }

      triggerVisualPulse() {
        this.pulseAnimTime = 1.0; // Inicia animação de pulso
        if (this.ledMesh) {
          this.ledMesh.material.emissiveIntensity = 3.0;
          setTimeout(() => {
            if (this.ledMesh) this.ledMesh.material.emissiveIntensity = 0.8;
          }, 200);
        }
        if (this.labelElement) {
          this.labelElement.classList.remove("active-pulse");
          void this.labelElement.offsetWidth;
          this.labelElement.classList.add("active-pulse");
          setTimeout(() => {
            if (this.labelElement) this.labelElement.classList.remove("active-pulse");
          }, 900);
        }
      }

      emitEvent(dpCode, value) {
        if (this.status !== "online") return;

        // Drena bateria por evento de envio de rádio
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

        EventBus.emit("device:event_emitted", eventData);
      }

      forceEvent() {
        // Implementado nas subclasses
      }

      update(deltaSec) {
        if (this.pulseAnimTime > 0) {
          this.pulseAnimTime -= deltaSec * 2.0;
          if (this.pulseMesh) {
            const scale = 1.0 + (1.0 - this.pulseAnimTime) * 3.0;
            this.pulseMesh.scale.set(scale, scale, scale);
            this.pulseMesh.material.opacity = Math.max(0, this.pulseAnimTime);
            this.pulseMesh.visible = this.pulseAnimTime > 0;
          }
        }
      }
    }

    // SENSOR DE MOVIMENTO PIR
    class PirSensor extends Device {
      constructor(config) {
        super({ ...config, hasBattery: true });
        this.lockoutRemaining = 0;
        this.lockoutDuration = CONFIG.sim.pirLockoutSec;
        this.detectionConeMesh = null;
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
          window.logNotification("automation", `Detecção de presença em [${this.room}] via ${this.id}`);
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
          window.logNotification("automation", `Presença forçada manualmente em [${this.room}] (${this.id})`);
        }
      }

      getShortStatus() {
        if (this.status === "offline") return "OFF";
        return this.getDP("pir") === "pir" ? "MOV" : "ok";
      }
    }

    // SENSOR DE ABERTURA MAGNÉTICO
    class ContactSensor extends Device {
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
          window.logNotification("system", `Sensor [${this.id}] (${this.name}): ${isOpen ? 'ABERTO' : 'FECHADO'}`);
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

    // TOMADA INTELIGENTE COM MEDIDOR
    class SmartPlug extends Device {
      constructor(config) {
        super({ ...config, hasBattery: false });
        this.hasMeter = config.hasMeter !== undefined ? config.hasMeter : true;
        this.profile = config.profile || "generic"; // fridge, washer, tv, pc, fan, generic
        this.cycleTimer = 0;
        this.addEle = 0.0; // kWh acumulado
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
            // Geladeira: compressor liga 40% do tempo (~120W) e standby (~2W)
            const cyclePhase = (this.cycleTimer % 600) / 600.0;
            powerW = cyclePhase < 0.4 ? 115.0 + Math.sin(this.cycleTimer * 0.1) * 8.0 : 2.2;
            break;
          case "washer":
            // Lavadora: opera em ciclos de alta potência se morador estiver usando
            powerW = inSameRoom ? 380.0 + Math.sin(this.cycleTimer * 0.5) * 60.0 : 1.5;
            break;
          case "tv":
            // TV: ligada quando morador está no Quarto 3
            powerW = inSameRoom ? 95.0 + Math.random() * 10.0 : 0.8;
            break;
          case "pc":
            // Computador: ativo com morador no Quarto 2
            powerW = inSameRoom ? 175.0 + Math.random() * 25.0 : 3.5;
            break;
          case "fan":
            // Ventilador: ligado em repouso
            powerW = inSameRoom ? 45.0 : 0.0;
            break;
          default:
            powerW = 10.0;
            break;
        }

        if (this.hasMeter) {
          const oldP = this.getDP("cur_power");
          // Emite evento se variar significativamente ou periodicamente
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

    // LÂMPADA INTELIGENTE (ROUTER ZIGBEE OU WI-FI)
    class SmartBulb extends Device {
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

    // CÂMERA WI-FI COM DETECÇÃO DE PESSOAS
    class Camera extends Device {
      constructor(config) {
        super({ ...config, hasBattery: false });
        this.fovConeMesh = null;
        this.setDP("person_detected", false, true);
      }

      checkDetection(activeRoom) {
        if (this.status !== "online") return;
        const detected = activeRoom === this.room;
        if (this.getDP("person_detected") !== detected) {
          this.setDP("person_detected", detected);
          if (detected) {
            window.logNotification("automation", `Câmera [${this.id}] detectou presença em [${this.room}]`);
          }
        }
      }

      forceEvent() {
        const next = !this.getDP("person_detected");
        this.setDP("person_detected", next);
        window.logNotification("automation", `Câmera [${this.id}] ${next ? 'detectou presença' : 'em repouso'}`);
      }

      getShortStatus() {
        if (this.status === "offline") return "OFF";
        return this.getDP("person_detected") ? "PESSOA" : (this.getDP("motion_tracking") ? "REC" : "STBY");
      }
    }

    // MOTOR DE CORTINA INTELIGENTE
    class CurtainMotor extends Device {
      constructor(config) {
        super({ ...config, hasBattery: false });
        this.windowId = config.windowId || null;
        this.percent = 0; // 0 = fechada, 100 = aberta
        this.targetPercent = 0;
        this.curtainMesh = null;
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

    // HUB ZIGBEE 3.0 (COORDENADOR wg2)
    class ZigbeeHub extends Device {
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

    // ROTEADOR WI-FI
    class WifiRouter extends Device {
      constructor(config) {
        super({ ...config, hasBattery: false, isRouter: false });
        this.setDP("online", true, true);
      }

      getShortStatus() {
        return "WAN";
      }
    }
'''
