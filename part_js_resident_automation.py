# part_js_resident_automation.py - Atividade Residencial Autônoma, Motor de Automações e Injetor de Falhas
JS_RESIDENT_AUTOMATION = '''    /* ==========================================================================
       9. HOUSE ACTIVITY - SIMULADOR AUTÔNOMO DE ATIVIDADES RESIDENCIAIS (SEM AVATAR FÍSICO)
       ========================================================================== */
    class HouseActivityClass {
      constructor() {
        this.pos = { x: 7.1, y: 0.0, z: 13.0 }; // Ponto de referência em Quarto 1
        this.currentRoom = "Quarto 1";
        this.currentActivity = "Descanso Noturno";
        this.lastCheckedRoutineMinute = -1;
        this.eventTimer = 0;
        this.doorTimer = 0;

        // Tabela de Rotina Residencial com base no relógio da simulação
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
          window.logNotification("system", `Cômodo ativo alterado para ${room.name}.`, "info");
        }
      }

      update(deltaSimSec, devices, doors) {
        // 1. Processamento de Rotina Horária
        this.checkSchedule();

        // 2. Disparo periódico estocástico de sensores de presença (PIR)
        this.eventTimer += deltaSimSec;
        if (this.eventTimer >= 8.0) {
          this.eventTimer = 0;
          this.triggerAmbientActivity(devices);
        }

        // 3. Disparo ocasional de abertura de portas / janelas
        this.doorTimer += deltaSimSec;
        if (this.doorTimer >= 35.0) {
          this.doorTimer = 0;
          this.triggerDoorActivity(devices, doors);
        }

        // 4. Atualiza consumo das tomadas inteligentes de acordo com o cômodo ativo
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

        // Dispara sensor PIR no cômodo ativo ou cômodo com dispositivo online
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

      triggerDoorActivity(devices, doors) {
        if (!doors || doors.length === 0) return;
        const door = doors[Math.floor(Math.random() * doors.length)];
        if (!door) return;

        door.targetOpen = true;
        const sensor = devices.find(d => d.doorId === door.def.id);
        if (sensor) sensor.setOpen(true);

        setTimeout(() => {
          door.targetOpen = false;
          if (sensor) sensor.setOpen(false);
        }, 5000);
      }
    }
    const HouseActivity = new HouseActivityClass();
    const Resident = HouseActivity; // Compatibilidade transparente com propriedades legadas
    window.HouseActivity = HouseActivity;
    window.Resident = Resident;

    /* ==========================================================================
       10. AUTOMATIONENGINE - MOTOR DE REGRAS (NUVEM TUYA VS LOCAL NO HUB)
       ========================================================================== */
    class AutomationEngineClass {
      constructor() {
        this.rules = {
          pirLight: {
            enabled: true,
            target: "cloud", // "cloud" ou "local"
            name: "Iluminação por Presença"
          },
          nightDoor: {
            enabled: true,
            target: "local", // "local" no hub
            name: "Recepção Noturna"
          },
          solarCurtain: {
            enabled: true,
            target: "cloud",
            name: "Cortina Solar"
          }
        };

        this.pirLightTimers = new Map(); // room -> remaining sec
        this.initListeners();
      }

      initListeners() {
        // Regra 1: PIR detecta presença -> Acende lâmpada do cômodo
        EventBus.on("pir:triggered", ({ device, room }) => {
          if (!this.rules.pirLight.enabled) return;
          const bulb = window.allDevices?.find(d => d.category === "dj" && d.room === room);
          // Se a lâmpada já estiver acesa, apenas renova o temporizador
          if (bulb && bulb.getDP("switch_led")) {
            this.pirLightTimers.set(room, 120);
            return;
          }
          this.executeRule(this.rules.pirLight.target, "Iluminação por Presença", () => {
            if (bulb) {
              bulb.setOn(true);
              this.pirLightTimers.set(room, 120); // 2 minutos de temporizador
            }
          });
        });

        // Regra 2: Porta de entrada abre à noite -> Acende lâmpadas do corredor
        EventBus.on("device:event_emitted", (eventData) => {
          if (!this.rules.nightDoor.enabled) return;
          if (eventData.dp_code === "doorcontact_state" && eventData.value === "open" && eventData.device_id === "CT-01") {
            const hour = SimClock.simTime.getHours();
            const isNight = hour >= 18 || hour < 6;
            if (isNight) {
              this.executeRule(this.rules.nightDoor.target, "Recepção Noturna", () => {
                const corridorBulbs = window.allDevices?.filter(d => d.category === "dj" && d.room === "Corredor Central") || [];
                for (const b of corridorBulbs) {
                  b.setOn(true);
                }
              });
            }
          }
        });

        // Regra 3: Luz natural alta (> 40.000 lux) -> Abre cortina Quarto 1
        EventBus.on("clock:tick", ({ externalLux }) => {
          if (!this.rules.solarCurtain.enabled) return;
          if (externalLux > 40000) {
            const curtain = window.allDevices?.find(d => d.id === "CM-01");
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
          // Execução na Nuvem Tuya: requer Internet! Se Internet estiver caída, falha!
          if (FaultInjector.internetDown) {
            window.logNotification("fault", `Automação [${ruleName}] falhou: Internet indisponível para Cena Tuya!`, "error");
            return;
          }
          // Adiciona latência de ida e volta da Nuvem (~240ms)
          setTimeout(() => {
            actionCallback();
            window.logNotification("automation", `Automação [${ruleName}] executada via Nuvem Tuya (Latência: ~240ms)`);
          }, 240);
        } else {
          // Execução Local no HUB Zigbee: baixíssima latência (~30ms), funciona sem Internet!
          setTimeout(() => {
            actionCallback();
            window.logNotification("automation", `Automação [${ruleName}] executada Localmente no HUB (Latência: ~30ms)`);
          }, 30);
        }
      }

      update(deltaSimSec) {
        // Atualiza temporizadores de desligamento de lâmpadas por ausência
        for (const [room, time] of this.pirLightTimers.entries()) {
          const updated = time - deltaSimSec;
          if (updated <= 0) {
            this.pirLightTimers.delete(room);
            const bulb = window.allDevices?.find(d => d.category === "dj" && d.room === room);
            if (bulb) bulb.setOn(false);
          } else {
            this.pirLightTimers.set(room, updated);
          }
        }
      }
    }
    const AutomationEngine = new AutomationEngineClass();
    window.AutomationEngine = AutomationEngine;

    /* ==========================================================================
       11. FAULTINJECTOR - INJETOR DE FALHAS E CENÁRIOS DE ESTRESSE
       ========================================================================== */
    class FaultInjectorClass {
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
        window.logNotification("fault", isDown ? "⚠️ Internet Caída: Nuvem Tuya inacessível!" : "✅ Internet restabelecida!", isDown ? "warn" : "info");
      }

      setHubOffline(isOffline) {
        this.hubOffline = isOffline;
        const hub = window.allDevices?.find(d => d.category === "wg2");
        if (hub) hub.status = isOffline ? "offline" : "online";
        EventBus.emit("fault:hub_changed", isOffline);
        window.logNotification("fault", isOffline ? "⚠️ HUB Zigbee Desconectado: Rede em malha inativa!" : "✅ HUB Zigbee Online!", isOffline ? "error" : "info");
      }

      setGlobalPacketLoss(pct) {
        this.globalPacketLoss = pct / 100.0;
        EventBus.emit("fault:loss_changed", this.globalPacketLoss);
        window.logNotification("fault", `Perda de pacotes ajustada para ${pct}%`, pct > 0 ? "warn" : "info");
      }

      setCloudLatencySpike(hasSpike) {
        this.cloudLatencySpike = hasSpike;
        window.logNotification("fault", hasSpike ? "⚠️ Pico de Latência na Nuvem ativado (+2000ms)" : "Latência da Nuvem normalizada", hasSpike ? "warn" : "info");
      }

      setTrialExpired(expired) {
        this.trialExpired = expired;
        CloudMock.trialExpired = expired;
        window.logNotification("fault", expired ? "❌ Licença Tuya Expirada (HTTP 403 Forbidden)" : "Licença Tuya Ativa", expired ? "error" : "info");
      }

      setRfInterference(hasInterference) {
        this.rfInterference = hasInterference;
        window.logNotification("fault", hasInterference ? "⚠️ Interferência RF 2.4GHz ativada (-15 dBm de sinal)" : "Sinal RF normalizado", hasInterference ? "warn" : "info");
      }
    }
    const FaultInjector = new FaultInjectorClass();
    window.FaultInjector = FaultInjector;
'''
