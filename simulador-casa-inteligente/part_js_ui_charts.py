# part_js_ui_charts.py - Interface do Usuário, Chart.js e Loop Principal
JS_UI_CHARTS = '''    /* ==========================================================================
       14. UI - CONTROLADOR DA INTERFACE GRÁFICA, MODAIS E MODO EDIÇÃO
       ========================================================================== */
    class UIController {
      constructor() {
        window.UI = this;
        this.selectedDevice = null;
        this.isEditMode = false;
        this.eventsPaused = false;
        this.pipelineStats = { sent: 0, hub: 0, cloud: 0, collector: 0, lost: 0, latencies: [] };
        this.notifications = [];
        this.unreadNotifCount = 0;
        this.activeNotifFilter = 'all';
        this.toastTimer = null;
        this.initEventListeners();

        // Processa notificações acumuladas antes da inicialização completa da UI
        if (window._pendingNotifs && window._pendingNotifs.length > 0) {
          for (const n of window._pendingNotifs) {
            this.logNotification(n.category, n.message, n.type);
          }
          window._pendingNotifs = [];
        }
        this.logNotification("system", "Sistema de Monitoramento IoT inicializado com sucesso.", "info");
      }

      initEventListeners() {
        // Relógio e Velocidade
        document.getElementById("btn-play-pause").addEventListener("click", () => {
          const paused = SimClock.togglePause();
          document.getElementById("play-icon").textContent = paused ? "▶" : "⏸";
          document.getElementById("btn-play-pause").classList.toggle("active", paused);
        });

        document.getElementById("select-sim-speed").addEventListener("change", (e) => {
          SimClock.setSpeed(e.target.value);
        });

        // Presets
        document.getElementById("select-preset").addEventListener("change", (e) => {
          window.loadPreset(e.target.value);
        });

        // Câmeras
        document.getElementById("select-camera").addEventListener("change", (e) => {
          SceneBuilder.setCameraView(e.target.value);
          this.updateCameraButtons(e.target.value);
        });
        document.getElementById("tool-view-persp").addEventListener("click", () => {
          SceneBuilder.setCameraView("perspective");
          this.updateCameraButtons("perspective");
        });
        document.getElementById("tool-view-top").addEventListener("click", () => {
          SceneBuilder.setCameraView("top");
          this.updateCameraButtons("top");
        });
        document.getElementById("tool-view-free").addEventListener("click", () => {
          SceneBuilder.setCameraView("free");
          this.updateCameraButtons("free");
        });

        // Paredes
        document.getElementById("select-wall-mode").addEventListener("change", (e) => {
          SceneBuilder.applyWallMode(e.target.value);
        });

        // Alternâncias Visuais (Cones iniciam DESLIGADOS para cena limpa)
        window.uiToggles = { labels: true, devLabels: true, mesh: true, cones: false, packets: true };

        const toggleBtn = (id, key, callback) => {
          const btn = document.getElementById(id);
          if (!btn) return;
          btn.addEventListener("click", (e) => {
            window.uiToggles[key] = !window.uiToggles[key];
            e.currentTarget.classList.toggle("active", window.uiToggles[key]);
            if (callback) callback(window.uiToggles[key]);
          });
        };

        toggleBtn("btn-toggle-labels", "labels", (show) => {
          for (const l of SceneBuilder.roomLabels) l.visible = show;
          const chk = document.getElementById("checkbox-room-labels-master");
          if (chk) chk.checked = show;
          const statusTxt = document.getElementById("room-labels-status-text");
          if (statusTxt) {
            statusTxt.textContent = show ? "VISÍVEIS" : "OCULTOS";
            statusTxt.style.color = show ? "var(--accent-teal)" : "var(--text-muted)";
          }
        });
        toggleBtn("btn-toggle-dev-labels", "devLabels", (show) => {
          this.applySensorLabelsVisibility(show);
        });
        toggleBtn("btn-toggle-mesh", "mesh", () => {
          SceneBuilder.updateZigbeeMeshLines(window.allDevices);
        });
        toggleBtn("btn-toggle-cones", "cones", (show) => {
          for (const d of window.allDevices) {
            if (d.detectionConeMesh) d.detectionConeMesh.visible = show;
          }
        });
        toggleBtn("btn-toggle-packets", "packets");

        // Modo Edição
        document.getElementById("btn-toggle-edit").addEventListener("click", () => this.toggleEditMode());
        document.getElementById("btn-close-edit").addEventListener("click", () => this.toggleEditMode(false));
        document.getElementById("btn-add-device").addEventListener("click", () => {
          document.getElementById("add-device-modal").classList.add("active");
        });
        document.getElementById("btn-close-add-modal").addEventListener("click", () => {
          document.getElementById("add-device-modal").classList.remove("active");
        });
        document.getElementById("btn-confirm-add-device").addEventListener("click", () => this.handleAddDevice());

        document.getElementById("btn-save-layout").addEventListener("click", () => this.saveLayoutLocalStorage());
        document.getElementById("btn-export-layout").addEventListener("click", () => this.exportLayoutJson());

        // Reiniciar Simulação
        document.getElementById("btn-reset-sim").addEventListener("click", () => {
          if (confirm("Deseja reiniciar a simulação e o relógio?")) {
            location.reload();
          }
        });

        // Busca e Filtros no Inventário
        document.getElementById("input-device-search").addEventListener("input", () => this.renderInventory());
        for (const pill of document.querySelectorAll(".filter-pill")) {
          pill.addEventListener("click", (e) => {
            document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
            e.currentTarget.classList.add("active");
            this.renderInventory();
          });
        }

        // Navegação de Abas (inclui aba de Notificações)
        for (const btn of document.querySelectorAll(".tab-btn")) {
          btn.addEventListener("click", (e) => {
            const targetId = e.currentTarget.getAttribute("data-tab");
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
            e.currentTarget.classList.add("active");
            const pane = document.getElementById(targetId);
            if (pane) pane.classList.add("active");

            // Ao abrir aba de alertas, limpa badge de não lidas
            if (targetId === "tab-notifications") {
              this.unreadNotifCount = 0;
              const badge = document.getElementById("notif-badge");
              if (badge) badge.style.display = "none";
            }
          });
        }

        // Suporte a hash e query params para navegação direta e testes
        if (window.location.hash) {
          const hashId = window.location.hash.replace("#", "");
          const matchingBtn = document.querySelector(`.tab-btn[data-tab="${hashId}"]`);
          if (matchingBtn) matchingBtn.click();
        }
        if (window.location.search.includes("drawer=open")) {
          setTimeout(() => document.getElementById("drawer-handle-bar")?.click(), 300);
        }

        // Filtros da Aba de Notificações
        for (const pill of document.querySelectorAll(".notif-filter")) {
          pill.addEventListener("click", (e) => {
            document.querySelectorAll(".notif-filter").forEach(p => p.classList.remove("active"));
            e.currentTarget.classList.add("active");
            this.activeNotifFilter = e.currentTarget.getAttribute("data-filter");
            this.renderNotifications();
          });
        }

        // Botão Limpar Notificações
        document.getElementById("btn-clear-notifs")?.addEventListener("click", () => {
          this.clearNotifications();
        });

        // Rolagem horizontal dos botões do cabeçalho via roda do mouse (wheel)
        const headerCenterControls = document.querySelector(".header-center-controls");
        if (headerCenterControls) {
          headerCenterControls.addEventListener("wheel", (e) => {
            if (e.deltaY !== 0) {
              e.preventDefault();
              headerCenterControls.scrollLeft += e.deltaY * 0.9;
            }
          }, { passive: false });
        }

        // Drawer Inferior de Gráficos
        const drawer = document.getElementById("bottom-drawer");
        const viewportContainer = document.getElementById("viewport-container");
        const toastContainer = document.getElementById("toast-container");
        document.getElementById("drawer-handle-bar").addEventListener("click", () => {
          const isCollapsed = drawer.classList.toggle("collapsed");
          document.getElementById("drawer-toggle-icon").textContent = isCollapsed ? "▲ Expandir" : "▼ Recolher";
          if (viewportContainer) {
            viewportContainer.classList.toggle("drawer-open", !isCollapsed);
          }
          if (toastContainer) {
            toastContainer.classList.toggle("drawer-open", !isCollapsed);
          }
        });

        // Modal de Dispositivo
        document.getElementById("btn-close-modal").addEventListener("click", () => {
          document.getElementById("device-detail-modal").classList.remove("active");
        });

        // API Explorer
        document.getElementById("btn-call-api").addEventListener("click", () => this.handleApiExplorerCall());

        // Exportações de Dados
        document.getElementById("btn-export-csv").addEventListener("click", () => DataStore.exportCsv());
        document.getElementById("btn-export-json").addEventListener("click", () => DataStore.exportJson());
        document.getElementById("btn-export-jsonl").addEventListener("click", () => DataStore.exportJsonl());
        document.getElementById("btn-export-window").addEventListener("click", () => DataStore.exportAggregatedDataset());
        document.getElementById("btn-clear-db").addEventListener("click", () => {
          if (confirm("Limpar todo o banco de dados IndexedDB?")) {
            DataStore.clearDatabase();
            document.getElementById("events-table-body").innerHTML = "";
            this.showToast("Banco de dados limpo com sucesso!");
          }
        });

        // Resumo para LLM
        document.getElementById("btn-copy-llm").addEventListener("click", () => {
          const text = document.getElementById("llm-state-summary").textContent;
          navigator.clipboard.writeText(text).then(() => {
            this.showToast("Resumo textual copiado para a área de transferência!");
          });
        });

        // Falhas
        document.getElementById("fault-internet-down").addEventListener("change", (e) => FaultInjector.setInternetDown(e.target.checked));
        document.getElementById("fault-hub-offline").addEventListener("change", (e) => FaultInjector.setHubOffline(e.target.checked));
        document.getElementById("opt-hub-buffer").addEventListener("change", (e) => CONFIG.rf.hubBufferEnabled = e.target.checked);
        document.getElementById("fault-rf-interference").addEventListener("change", (e) => FaultInjector.setRfInterference(e.target.checked));
        document.getElementById("fault-cloud-spike").addEventListener("change", (e) => FaultInjector.setCloudLatencySpike(e.target.checked));
        document.getElementById("fault-trial-expired").addEventListener("change", (e) => FaultInjector.setTrialExpired(e.target.checked));
        document.getElementById("slider-global-loss").addEventListener("input", (e) => {
          FaultInjector.setGlobalPacketLoss(Number(e.target.value));
          document.getElementById("label-global-loss").textContent = `${e.target.value}%`;
        });

        // Automações
        document.getElementById("rule-pir-light")?.addEventListener("change", (e) => AutomationEngine.rules.pirLight.enabled = e.target.checked);
        document.getElementById("rule-pir-target")?.addEventListener("change", (e) => AutomationEngine.rules.pirLight.target = e.target.value);
        document.getElementById("rule-night-door")?.addEventListener("change", (e) => AutomationEngine.rules.nightDoor.enabled = e.target.checked);
        document.getElementById("rule-night-target")?.addEventListener("change", (e) => AutomationEngine.rules.nightDoor.target = e.target.value);
        document.getElementById("rule-solar-curtain")?.addEventListener("change", (e) => AutomationEngine.rules.solarCurtain.enabled = e.target.checked);
        document.getElementById("rule-solar-target")?.addEventListener("change", (e) => AutomationEngine.rules.solarCurtain.target = e.target.value);
        
        // Configura ouvintes da aba de Rótulos & Etiquetas 3D
        this.setupLabelsTabListeners();

        // Atalhos de Teclado
        window.addEventListener("keydown", (e) => {
          if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

          switch (e.key.toLowerCase()) {
            case " ":
              e.preventDefault();
              document.getElementById("btn-play-pause").click();
              break;
            case "1":
              document.getElementById("tool-view-persp").click();
              break;
            case "2":
              document.getElementById("tool-view-top").click();
              break;
            case "3":
              document.getElementById("tool-view-free").click();
              break;
            case "l":
              document.getElementById("btn-toggle-labels").click();
              break;
            case "k":
              document.getElementById("btn-toggle-dev-labels").click();
              break;
            case "m":
              document.getElementById("btn-toggle-mesh").click();
              break;
            case "p":
              document.getElementById("btn-toggle-packets").click();
              break;
            case "e":
              this.toggleEditMode();
              break;
            case "+":
            case "=":
              this.cycleSimSpeed(1);
              break;
            case "-":
              this.cycleSimSpeed(-1);
              break;
          }
        });

        // Raycast de clique no Canvas para seleção de dispositivos ou interação de cômodo
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        const canvas = document.getElementById("three-canvas");
        canvas.addEventListener("pointerdown", (e) => {
          const rect = canvas.getBoundingClientRect();
          this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

          this.raycaster.setFromCamera(this.mouse, SceneBuilder.camera);
          const intersects = this.raycaster.intersectObjects(SceneBuilder.scene.children, true);

          if (intersects.length > 0) {
            // 1. Procura se clicou em um dispositivo
            let devHit = null;
            for (const hit of intersects) {
              let obj = hit.object;
              while (obj && !obj.userData?.isDevice) obj = obj.parent;
              if (obj && obj.userData?.deviceId) {
                devHit = window.allDevices.find(d => d.id === obj.userData.deviceId);
                break;
              }
            }

            if (devHit) {
              this.selectDevice(devHit);
              return;
            }

            // 2. Se clicou no piso, seleciona o cômodo para foco da atividade residencial
            const floorHit = intersects.find(h => h.object.userData?.isFloor);
            if (floorHit) {
              const pt = floorHit.point;
              HouseActivity.setDestinationCoord(pt.x, pt.z);
              this.showToast(`Cômodo selecionado: ${HouseActivity.currentRoom}`);
            }
          }
        });
      }

      cycleSimSpeed(dir) {
        const speeds = [1, 10, 60, 600, 3600];
        const sel = document.getElementById("select-sim-speed");
        let idx = speeds.indexOf(Number(sel.value)) + dir;
        if (idx < 0) idx = 0;
        if (idx >= speeds.length) idx = speeds.length - 1;
        sel.value = speeds[idx];
        SimClock.setSpeed(speeds[idx]);
        this.showToast(`Velocidade da simulação: ${speeds[idx]}x`);
      }

      updateCameraButtons(view) {
        document.getElementById("select-camera").value = view;
        document.getElementById("tool-view-persp").classList.toggle("active", view === "perspective");
        document.getElementById("tool-view-top").classList.toggle("active", view === "top");
        document.getElementById("tool-view-free").classList.toggle("active", view === "free");
      }

      toggleEditMode(force) {
        this.isEditMode = force !== undefined ? force : !this.isEditMode;
        document.getElementById("btn-toggle-edit").classList.toggle("active", this.isEditMode);
        document.getElementById("edit-mode-bar").style.display = this.isEditMode ? "flex" : "none";
        this.showToast(this.isEditMode ? "Modo Edição ativado. Arraste dispositivos ou adicione novos." : "Modo Edição desativado.");
      }

      renderInventory() {
        const listEl = document.getElementById("device-list-container");
        const query = document.getElementById("input-device-search").value.toLowerCase();
        const activeFilter = document.querySelector(".filter-pill.active")?.getAttribute("data-filter") || "all";

        listEl.innerHTML = "";
        let visibleCount = 0;

        for (const dev of window.allDevices) {
          if (query && !dev.name.toLowerCase().includes(query) && !dev.room.toLowerCase().includes(query)) continue;
          if (activeFilter === "zigbee" && dev.protocol !== "zigbee") continue;
          if (activeFilter === "wifi" && dev.protocol !== "wifi") continue;
          if (activeFilter === "pir" && dev.category !== "pir") continue;
          if (activeFilter === "mcs" && dev.category !== "mcs") continue;
          if (activeFilter === "cz" && dev.category !== "cz") continue;
          if (activeFilter === "dj" && dev.category !== "dj") continue;

          visibleCount++;
          const card = document.createElement("div");
          card.className = `device-card ${dev.status === "offline" ? "offline" : ""} ${this.selectedDevice?.id === dev.id ? "selected" : ""}`;

          let protoClass = "proto-wifi";
          if (dev.category === "wg2") protoClass = "proto-hub";
          else if (dev.protocol === "zigbee") protoClass = "proto-zigbee";

          card.innerHTML = `
            <div class="device-card-header">
              <span class="device-name">${dev.name}</span>
              <span class="proto-badge ${protoClass}">${dev.protocol}</span>
            </div>
            <div class="device-room">${dev.room}</div>
            <div class="device-metrics">
              <span class="metric-item">🔋 <span class="metric-val">${dev.hasBattery ? Math.round(dev.battery) + "%" : "AC"}</span></span>
              <span class="metric-item">📶 <span class="metric-val">${dev.rssi} dBm</span></span>
              <span class="metric-item">🔀 <span class="metric-val">${dev.hops} salto${dev.hops > 1 ? "s" : ""}</span></span>
            </div>
          `;

          card.addEventListener("click", () => this.selectDevice(dev));
          listEl.appendChild(card);
        }

        document.getElementById("inventory-count-badge").textContent = visibleCount;
        this.renderLabelsTab();
      }

      selectDevice(device) {
        this.selectedDevice = device;
        this.renderInventory();

        // Destaca no 3D
        if (device.meshGroup) {
          device.triggerVisualPulse();
        }

        // Abre Modal de Detalhes
        const modal = document.getElementById("device-detail-modal");
        document.getElementById("modal-device-title").textContent = `${device.name} (${device.id})`;
        const body = document.getElementById("modal-device-body");

        let dpRows = "";
        for (const [code, val] of device.dps.entries()) {
          dpRows += `<tr><td><b>${code}</b></td><td>${val}</td></tr>`;
        }

        body.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:6px;">
            <div>
              <div style="font-size:10px;color:var(--text-muted);">Protocolo & Cômodo:</div>
              <div style="font-weight:700;">${device.protocol.toUpperCase()} • ${device.room}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:10px;color:var(--text-muted);">Enlace RF (LQI / RSSI):</div>
              <div style="font-family:monospace;font-weight:700;color:var(--accent-teal);">${device.lqi} / ${device.rssi} dBm</div>
            </div>
          </div>

          <div>
            <div style="font-size:10.5px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">Pontos de Dados (DPs Atuais):</div>
            <table class="dp-table">
              <thead><tr><th>Código DP</th><th>Valor Atual</th></tr></thead>
              <tbody>${dpRows || '<tr><td colspan="2">Nenhum DP publicado</td></tr>'}</tbody>
            </table>
          </div>

          <div style="display:flex;gap:6px;margin-top:6px;">
            <button id="modal-btn-force" class="btn-action primary" style="flex:1;">⚡ Forçar Evento</button>
            <button id="modal-btn-offline" class="btn-action" style="flex:1;">${device.status === 'online' ? 'Desconectar' : 'Reconectar'}</button>
            <button id="modal-btn-proto" class="btn-action" style="flex:1;">Trocar Protocolo</button>
          </div>
        `;

        document.getElementById("modal-btn-force").onclick = () => {
          device.forceEvent();
          this.selectDevice(device);
        };
        document.getElementById("modal-btn-offline").onclick = () => {
          device.toggleOffline();
          this.selectDevice(device);
        };
        document.getElementById("modal-btn-proto").onclick = () => {
          device.switchProtocol();
          RadioModel.updateZigbeeMesh(window.allDevices);
          SceneBuilder.updateZigbeeMeshLines(window.allDevices);
          this.selectDevice(device);
        };

        modal.classList.add("active");
      }

      applySensorLabelsVisibility(show) {
        window.uiToggles.devLabels = show;
        const btn = document.getElementById("btn-toggle-dev-labels");
        if (btn) btn.classList.toggle("active", show);
        const chk = document.getElementById("checkbox-sensor-labels-master");
        if (chk) chk.checked = show;
        const statusTxt = document.getElementById("sensor-labels-status-text");
        if (statusTxt) {
          statusTxt.textContent = show ? "VISÍVEIS" : "OCULTOS";
          statusTxt.style.color = show ? "var(--accent-teal)" : "var(--text-muted)";
        }
        for (const dev of window.allDevices) {
          if (dev.labelObject) {
            dev.labelObject.visible = show && (dev.showLabel !== false);
          }
        }
        this.updateSensorLabelsBadge();
      }

      updateSensorLabelsBadge() {
        const badge = document.getElementById("sensor-labels-badge");
        if (!badge) return;
        const activeCount = window.uiToggles.devLabels
          ? window.allDevices.filter(d => d.showLabel !== false).length
          : 0;
        badge.textContent = `${activeCount} Ativo${activeCount !== 1 ? 's' : ''}`;
        badge.style.borderColor = activeCount > 0 ? "var(--accent-teal)" : "var(--border-color)";
        badge.style.color = activeCount > 0 ? "var(--accent-teal)" : "var(--text-muted)";
      }

      setupLabelsTabListeners() {
        // Master Rótulos dos Cômodos
        const chkRoom = document.getElementById("checkbox-room-labels-master");
        if (chkRoom) {
          chkRoom.addEventListener("change", (e) => {
            window.uiToggles.labels = e.target.checked;
            const btn = document.getElementById("btn-toggle-labels");
            if (btn) btn.classList.toggle("active", window.uiToggles.labels);
            for (const l of SceneBuilder.roomLabels) l.visible = window.uiToggles.labels;
            const statusTxt = document.getElementById("room-labels-status-text");
            if (statusTxt) {
              statusTxt.textContent = window.uiToggles.labels ? "VISÍVEIS" : "OCULTOS";
              statusTxt.style.color = window.uiToggles.labels ? "var(--accent-teal)" : "var(--text-muted)";
            }
          });
        }

        // Master Rótulos dos Sensores
        const chkSens = document.getElementById("checkbox-sensor-labels-master");
        if (chkSens) {
          chkSens.addEventListener("change", (e) => {
            this.applySensorLabelsVisibility(e.target.checked);
          });
        }

        // Opções de Conteúdo da Etiqueta
        const chkName = document.getElementById("chk-lbl-show-name");
        if (chkName) chkName.addEventListener("change", (e) => document.body.classList.toggle("hide-lbl-name", !e.target.checked));
        const chkProto = document.getElementById("chk-lbl-show-proto");
        if (chkProto) chkProto.addEventListener("change", (e) => document.body.classList.toggle("hide-lbl-proto", !e.target.checked));
        const chkState = document.getElementById("chk-lbl-show-state");
        if (chkState) chkState.addEventListener("change", (e) => document.body.classList.toggle("hide-lbl-state", !e.target.checked));

        // Ações em Lote
        document.getElementById("btn-lbl-all-on")?.addEventListener("click", () => {
          for (const d of window.allDevices) d.showLabel = true;
          this.applySensorLabelsVisibility(true);
          this.renderLabelsTab();
        });
        document.getElementById("btn-lbl-all-off")?.addEventListener("click", () => {
          for (const d of window.allDevices) d.showLabel = false;
          this.applySensorLabelsVisibility(false);
          this.renderLabelsTab();
        });
        document.getElementById("btn-lbl-only-zigbee")?.addEventListener("click", () => {
          for (const d of window.allDevices) d.showLabel = (d.protocol === "zigbee");
          this.applySensorLabelsVisibility(true);
          this.renderLabelsTab();
        });
        document.getElementById("btn-lbl-only-wifi")?.addEventListener("click", () => {
          for (const d of window.allDevices) d.showLabel = (d.protocol === "wifi");
          this.applySensorLabelsVisibility(true);
          this.renderLabelsTab();
        });

        // Campo de Busca na lista de etiquetas
        document.getElementById("input-label-dev-search")?.addEventListener("input", () => {
          this.renderLabelsTab();
        });
      }

      renderLabelsTab() {
        const container = document.getElementById("labels-device-list-container");
        if (!container) return;
        const query = (document.getElementById("input-label-dev-search")?.value || "").toLowerCase();

        container.innerHTML = "";
        let count = 0;

        for (const dev of window.allDevices) {
          if (query && !dev.name.toLowerCase().includes(query) && !dev.room.toLowerCase().includes(query) && !dev.id.toLowerCase().includes(query)) {
            continue;
          }
          count++;

          const row = document.createElement("div");
          row.className = "label-device-row";

          let protoClass = "proto-wifi";
          if (dev.category === "wg2") protoClass = "proto-hub";
          else if (dev.protocol === "zigbee") protoClass = "proto-zigbee";

          const isChecked = dev.showLabel !== false;

          row.innerHTML = `
            <div class="label-device-left">
              <input type="checkbox" class="lbl-dev-chk" ${isChecked ? "checked" : ""} title="Ativar/Desativar rótulo 3D deste dispositivo" style="cursor:pointer;accent-color:var(--accent-teal);">
              <div>
                <div class="label-device-name">${dev.name}</div>
                <div class="label-device-room">${dev.room} • <span style="font-family:monospace;">${dev.id}</span></div>
              </div>
            </div>
            <div class="label-device-right">
              <span class="proto-badge ${protoClass}" style="font-size:7.5px;padding:1px 4px;">${dev.protocol}</span>
              <button class="btn-locate-dev" title="Focar câmera no dispositivo 3D">🎯</button>
            </div>
          `;

          // Checkbox individual de rótulo
          const chk = row.querySelector(".lbl-dev-chk");
          chk.addEventListener("change", (e) => {
            dev.showLabel = e.target.checked;
            if (dev.labelObject) {
              dev.labelObject.visible = window.uiToggles.devLabels && dev.showLabel;
            }
            this.updateSensorLabelsBadge();
          });

          // Botão Focar no 3D
          const btnLocate = row.querySelector(".btn-locate-dev");
          btnLocate.addEventListener("click", (e) => {
            e.stopPropagation();
            this.locateDeviceIn3D(dev);
          });

          container.appendChild(row);
        }

        const countEl = document.getElementById("lbl-device-filter-count");
        if (countEl) countEl.textContent = `${count} ite${count !== 1 ? 'ns' : 'm'}`;
        this.updateSensorLabelsBadge();
      }

      locateDeviceIn3D(device) {
        if (!device || !device.pos) return;
        device.triggerVisualPulse();

        // Animação de câmera suave para focar no sensor
        const targetX = device.pos.x;
        const targetZ = device.pos.z + 3.5;
        const targetY = device.pos.y + 2.5;

        const startPos = { ...SceneBuilder.camera.position };
        const startTime = performance.now();
        const duration = 600;

        function animateCam(time) {
          const elapsed = time - startTime;
          const t = Math.min(1.0, elapsed / duration);
          const ease = t * (2 - t);
          SceneBuilder.camera.position.x = startPos.x + (targetX - startPos.x) * ease;
          SceneBuilder.camera.position.y = startPos.y + (targetY - startPos.y) * ease;
          SceneBuilder.camera.position.z = startPos.z + (targetZ - startPos.z) * ease;
          SceneBuilder.controls.target.set(device.pos.x, device.pos.y, device.pos.z);
          SceneBuilder.controls.update();

          if (t < 1.0) requestAnimationFrame(animateCam);
        }
        requestAnimationFrame(animateCam);

        if (device.showLabel === false || !window.uiToggles.devLabels) {
          this.showToast(`Rótulo de ${device.id} está desativado. Ative-o para visualizá-lo.`);
        }
      }

      handleApiExplorerCall() {
        const devId = document.getElementById("api-device-select").value;
        const endpoint = document.getElementById("api-endpoint-select").value;
        const respBox = document.getElementById("api-response-box");

        respBox.textContent = "Executando chamada REST...";
        setTimeout(() => {
          const res = CloudMock.callRestApi(endpoint, devId);
          respBox.textContent = `HTTP/1.1 ${res.status} ${res.message}\\n` +
            `Content-Type: application/json\\n` +
            `X-Tuya-Timestamp: ${Date.now()}\\n\\n` +
            JSON.stringify(res.data || { error: res.message }, null, 2);
        }, 150);
      }

      handleAddDevice() {
        const type = document.getElementById("new-dev-type").value;
        const proto = document.getElementById("new-dev-proto").value;
        const room = document.getElementById("new-dev-room").value;
        const count = window.allDevices.length + 1;
        const id = `DEV-${String(count).padStart(2, '0')}`;
        const name = `${type.toUpperCase()} Custom ${id}`;

        let newDev = null;
        const baseConf = { id, name, category: type, protocol: proto, pos: { x: 4.5, y: 1.2, z: 7.0 }, room };

        if (type === "pir") newDev = new PirSensor(baseConf);
        else if (type === "mcs") newDev = new ContactSensor(baseConf);
        else if (type === "cz") newDev = new SmartPlug(baseConf);
        else if (type === "dj") newDev = new SmartBulb(baseConf);
        else if (type === "sp") newDev = new Camera(baseConf);
        else if (type === "cl") newDev = new CurtainMotor(baseConf);
        else newDev = new Device(baseConf);

        window.allDevices.push(newDev);
        SceneBuilder.createDeviceMesh(newDev);
        RadioModel.updateZigbeeMesh(window.allDevices);
        SceneBuilder.updateZigbeeMeshLines(window.allDevices);
        CloudMock.registerDevice(newDev);
        this.renderInventory();
        document.getElementById("add-device-modal").classList.remove("active");
        this.showToast(`Dispositivo ${name} adicionado com sucesso!`);
      }

      saveLayoutLocalStorage() {
        const layout = window.allDevices.map(d => ({ id: d.id, pos: d.pos, room: d.room, protocol: d.protocol }));
        localStorage.setItem("smart_home_layout", JSON.stringify(layout));
        this.logNotification("system", "Layout salvo no localStorage com sucesso!");
      }

      exportLayoutJson() {
        const layout = window.allDevices.map(d => ({ id: d.id, name: d.name, pos: d.pos, room: d.room, protocol: d.protocol }));
        DataStore.downloadFile("layout_casa_inteligente.json", JSON.stringify(layout, null, 2), "application/json");
      }

      logNotification(category, message, type = "info") {
        const timeStr = SimClock.simTime.toTimeString().split(' ')[0];

        // Se a última notificação tiver a mesma mensagem, incrementa contador para evitar spam
        const last = this.notifications[0];
        if (last && last.message === message && last.category === category) {
          last.count = (last.count || 1) + 1;
          last.timeStr = timeStr;
          this.renderNotifications();
          return;
        }

        const item = {
          id: Date.now() + Math.random(),
          timeStr,
          category, // "automation", "fault", "system"
          message,
          type,     // "info", "warn", "error"
          count: 1
        };

        this.notifications.unshift(item);
        if (this.notifications.length > 200) {
          this.notifications.pop();
        }

        // Atualiza contador na aba se o usuário não estiver com ela aberta
        const notifPane = document.getElementById("tab-notifications");
        if (!notifPane || !notifPane.classList.contains("active")) {
          this.unreadNotifCount = (this.unreadNotifCount || 0) + 1;
          const badge = document.getElementById("notif-badge");
          if (badge) {
            badge.textContent = this.unreadNotifCount > 99 ? "99+" : this.unreadNotifCount;
            badge.style.display = "inline-block";
          }
        }

        this.renderNotifications();

        // Se for falha ou aviso importante, exibe 1 toast discreto sem acumulação
        if (type === "warn" || type === "error") {
          this.showDiscreetToast(message, type);
        }
      }

      renderNotifications() {
        const container = document.getElementById("notif-list-container");
        if (!container) return;

        const filter = this.activeNotifFilter || "all";
        const filtered = this.notifications.filter(n => {
          if (filter === "all") return true;
          return n.category === filter;
        });

        if (filtered.length === 0) {
          container.innerHTML = '<div class="notif-empty" id="notif-empty-state">Nenhum alerta registrado para o filtro selecionado.</div>';
          return;
        }

        let html = "";
        for (const item of filtered) {
          const typeClass = item.type === "warn" ? "warn" : (item.type === "error" ? "error" : (item.category === "system" ? "system" : ""));
          const tagLabel = item.category === "automation" ? "Automação" : (item.category === "fault" ? "Falha" : "Sistema");
          const tagClass = item.category === "automation" ? "automation" : (item.category === "fault" ? "fault" : "system");
          const countBadge = item.count > 1 ? `<span class="notif-repeat-badge">x${item.count}</span>` : "";

          html += `
            <div class="notif-item ${typeClass}">
              <div class="notif-header">
                <span class="notif-tag ${tagClass}">${tagLabel}</span>
                <span>${item.timeStr}</span>
              </div>
              <div style="color:var(--text-main);">${item.message} ${countBadge}</div>
            </div>
          `;
        }

        container.innerHTML = html;
      }

      clearNotifications() {
        this.notifications = [];
        this.unreadNotifCount = 0;
        const badge = document.getElementById("notif-badge");
        if (badge) badge.style.display = "none";
        this.renderNotifications();
      }

      showDiscreetToast(msg, type = "info", duration = 1400) {
        const container = document.getElementById("toast-container");
        if (!container) return;
        // Substitui o toast atual para NUNCA ter pilhas ou cobrir a tela
        container.innerHTML = "";
        clearTimeout(this.toastTimer);
        const t = document.createElement("div");
        t.className = `toast ${type === 'warn' ? 'warn' : ''} ${type === 'error' ? 'error' : ''}`;
        t.innerHTML = msg;
        container.appendChild(t);
        this.toastTimer = setTimeout(() => {
          t.style.opacity = '0';
          t.style.transform = 'translateY(6px) scale(0.96)';
          setTimeout(() => t.remove(), 180);
        }, duration);
      }

      showToast(msg, type = "info") {
        this.logNotification("system", msg, type);
      }
    }
    const UI = new UIController();

    /* ==========================================================================
       15. CHARTS - GRÁFICOS EM TEMPO REAL COM CHART.JS (UMD)
       ========================================================================== */
    class ChartsController {
      constructor() {
        this.chartEvents = null;
        this.chartPower = null;
        this.chartLatency = null;
        this.updateInterval = 0;
        this.initCharts();
      }

      initCharts() {
        Chart.defaults.color = "#4B5563";
        Chart.defaults.borderColor = "#E5E7EB";
        if (Chart.defaults.font) {
          Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
          Chart.defaults.font.size = 10;
        }

        // 1. Gráfico de Eventos por Cômodo (Barra Horizontal)
        const ctx1 = document.getElementById("chart-events-room").getContext("2d");
        this.chartEvents = new Chart(ctx1, {
          type: "bar",
          data: {
            labels: ["Quarto 1", "Quarto 2", "Quarto 3", "Cozinha", "Lavanderia", "Corredor", "Banheiro"],
            datasets: [{
              label: "Eventos",
              data: [0, 0, 0, 0, 0, 0, 0],
              backgroundColor: "rgba(0, 56, 255, 0.8)",
              hoverBackgroundColor: "#0038FF",
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, ticks: { precision: 0 } }
            }
          }
        });

        // 2. Gráfico de Potência das Tomadas (Linhas)
        const ctx2 = document.getElementById("chart-power-plugs").getContext("2d");
        this.chartPower = new Chart(ctx2, {
          type: "line",
          data: {
            labels: Array(15).fill(""),
            datasets: [
              { label: "Geladeira", data: Array(15).fill(0), borderColor: "#0038FF", borderWidth: 2, pointRadius: 0, tension: 0.35 },
              { label: "Lavadora", data: Array(15).fill(0), borderColor: "#7C3AED", borderWidth: 2, pointRadius: 0, tension: 0.35 },
              { label: "Computador", data: Array(15).fill(0), borderColor: "#F59E0B", borderWidth: 2, pointRadius: 0, tension: 0.35 },
              { label: "TV", data: Array(15).fill(0), borderColor: "#10B981", borderWidth: 2, pointRadius: 0, tension: 0.35 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { boxWidth: 8, boxHeight: 8 } } },
            scales: {
              x: { display: false },
              y: { beginAtZero: true, max: 450, title: { display: true, text: "Watts" } }
            }
          }
        });

        // 3. Gráfico de Latência e Perda
        const ctx3 = document.getElementById("chart-latency-loss").getContext("2d");
        this.chartLatency = new Chart(ctx3, {
          type: "bar",
          data: {
            labels: ["0-50ms", "50-100ms", "100-200ms", "200-500ms", ">500ms"],
            datasets: [{
              label: "Distribuição",
              data: [0, 0, 0, 0, 0],
              backgroundColor: "rgba(0, 56, 255, 0.75)",
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true }
            }
          }
        });
      }

      update(devices) {
        // Atualiza Gráfico de Eventos
        const roomCounts = { "Quarto 1": 0, "Quarto 2": 0, "Quarto 3": 0, "Cozinha": 0, "Lavanderia": 0, "Corredor Central": 0, "Banheiro Social": 0 };
        for (const row of DataStore.ringBuffer) {
          if (roomCounts[row.room] !== undefined) roomCounts[row.room]++;
        }
        this.chartEvents.data.datasets[0].data = [
          roomCounts["Quarto 1"],
          roomCounts["Quarto 2"],
          roomCounts["Quarto 3"],
          roomCounts["Cozinha"],
          roomCounts["Lavanderia"],
          roomCounts["Corredor Central"],
          roomCounts["Banheiro Social"]
        ];
        this.chartEvents.update("none");

        // Atualiza Potência em tempo real
        const pFridge = devices.find(d => d.id === "PL-01")?.getDP("cur_power") || 0;
        const pWasher = devices.find(d => d.id === "PL-02")?.getDP("cur_power") || 0;
        const pPc = devices.find(d => d.id === "PL-04")?.getDP("cur_power") || 0;
        const pTv = devices.find(d => d.id === "PL-03")?.getDP("cur_power") || 0;

        const pushData = (dsIndex, val) => {
          this.chartPower.data.datasets[dsIndex].data.shift();
          this.chartPower.data.datasets[dsIndex].data.push(val);
        };
        pushData(0, pFridge);
        pushData(1, pWasher);
        pushData(2, pPc);
        pushData(3, pTv);
        this.chartPower.update("none");

        document.getElementById("chart2-total-watts").textContent = `${Math.round(pFridge + pWasher + pPc + pTv)} W`;

        // Histograma de Latência
        const bins = [0, 0, 0, 0, 0];
        for (const row of DataStore.ringBuffer.slice(0, 100)) {
          const l = row.latency_ms || 100;
          if (l < 50) bins[0]++;
          else if (l < 100) bins[1]++;
          else if (l < 200) bins[2]++;
          else if (l < 500) bins[3]++;
          else bins[4]++;
        }
        this.chartLatency.data.datasets[0].data = bins;
        this.chartLatency.update("none");
      }
    }

    /* ==========================================================================
       16. INICIALIZAÇÃO DA SIMULAÇÃO E PRESETS
       ========================================================================== */
    window.allDevices = [];

    // Gerador de Dispositivos por Preset
    window.loadPreset = function(presetType = "full") {
      // Limpa cena existente de dispositivos e rótulos 3D
      for (const d of window.allDevices) {
        if (d.meshGroup) SceneBuilder.scene.remove(d.meshGroup);
        if (d.labelObject) SceneBuilder.scene.remove(d.labelObject);
      }
      SceneBuilder.deviceLabels = [];
      window.allDevices = [];

      // Infraestrutura
      const hub = new ZigbeeHub({ id: "HUB-01", name: "HUB Zigbee 3.0", category: "wg2", protocol: "zigbee", pos: { x: 4.5, y: 1.0, z: 6.8 }, room: "Corredor Central" });
      const router = new WifiRouter({ id: "RTR-01", name: "Roteador Wi-Fi 2.4GHz", category: "router", protocol: "wifi", pos: { x: 4.5, y: 1.0, z: 8.2 }, room: "Corredor Central" });
      window.allDevices.push(hub, router);

      // Sensores PIR de Movimento
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
        // Routers Zigbee
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
        // Preset Completo (todos os 38 dispositivos)
        window.allDevices.push(...pirs, ...contacts, ...plugs, ...bulbs, ...cameras, ...curtains);
      }

      // Cria malhas 3D e cadastra na Nuvem Tuya
      for (const dev of window.allDevices) {
        SceneBuilder.createDeviceMesh(dev);
        CloudMock.registerDevice(dev);
      }

      RadioModel.updateZigbeeMesh(window.allDevices);
      SceneBuilder.updateZigbeeMeshLines(window.allDevices);
      UI.renderInventory();

      // Preenche select do API Explorer
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

      window.logNotification("system", `Preset [${presetType}] carregado (${window.allDevices.length} dispositivos ativos).`, "info");
    };

    /* ==========================================================================
       17. CONEXÃO DE EVENTOS E PIPELINE DE DADOS
       ========================================================================== */
    EventBus.on("device:event_emitted", (eventData) => {
      UI.pipelineStats.sent++;
      document.getElementById("pstat-dev-sent").textContent = UI.pipelineStats.sent;

      const dev = window.allDevices.find(d => d.id === eventData.device_id);
      if (!dev) return;

      // Notificação visível na extremidade esquerda inferior da casa (não empilha, desaparece rapidamente)
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

      // 1. Simula envio de rádio RF e perda de pacotes
      const link = RadioModel.calculateLink(dev.pos, RadioModel.hubPos, dev.protocol);
      const trans = RadioModel.simulateTransmission(link.lossProb);

      if (!trans.success) {
        UI.pipelineStats.lost++;
        const total = UI.pipelineStats.sent;
        const lossRate = ((UI.pipelineStats.lost / total) * 100).toFixed(1);
        document.getElementById("metric-loss-rate").textContent = `${lossRate}%`;
        document.getElementById("inet-loss-rate-label").textContent = `Perda média: ${lossRate}%`;
        document.getElementById("chart3-loss").textContent = `${lossRate}% perda`;
        return;
      }

      // 2. Animação 3D de Pacote Voando
      const waypoints = RadioModel.getPacketWaypoints(dev, window.allDevices);
      SceneBuilder.spawnDataPacket(waypoints, dev.protocol);

      // 3. Processamento no Hub / Roteador
      UI.pipelineStats.hub++;
      document.getElementById("pstat-hub-proc").textContent = UI.pipelineStats.hub;

      // 4. Se for dispositivo de rede elétrica, Coletor Local LAN captura imediatamente
      if (!dev.hasBattery) {
        Collector.recordLocalLan(eventData);
      }

      // 5. Encaminhamento para a Nuvem Tuya Mock
      if (FaultInjector.internetDown) {
        if (CONFIG.rf.hubBufferEnabled && dev.protocol === "zigbee") {
          const hub = window.allDevices.find(d => d.category === "wg2");
          if (hub) hub.enqueueBuffer(eventData);
        }
        return;
      }

      const cloudRes = CloudMock.receiveFromDevice(eventData);
      if (cloudRes.delivered) {
        UI.pipelineStats.cloud++;
        document.getElementById("pstat-cloud-recv").textContent = UI.pipelineStats.cloud;

        // Atualiza stream visual do Message Service
        const streamEl = document.getElementById("cloud-message-stream");
        const jsonStr = JSON.stringify(cloudRes.pushPayload, null, 2);
        streamEl.textContent = jsonStr;
      }
    });

    // Evento Gravado pelo Coletor -> Atualiza UI e Tabela de Eventos
    EventBus.on("collector:event_recorded", (record) => {
      UI.pipelineStats.collector++;
      document.getElementById("pstat-col-total").textContent = UI.pipelineStats.collector;
      document.getElementById("pstat-db-rows").textContent = `${DataStore.ringBuffer.length} linhas`;
      document.getElementById("dataset-total-rows").textContent = `${DataStore.ringBuffer.length} registros`;

      // Atualiza latência média
      UI.pipelineStats.latencies.push(record.latency_ms);
      if (UI.pipelineStats.latencies.length > 50) UI.pipelineStats.latencies.shift();
      const avgLat = Math.round(UI.pipelineStats.latencies.reduce((a, b) => a + b, 0) / UI.pipelineStats.latencies.length);
      document.getElementById("metric-avg-latency").textContent = `${avgLat} ms`;

      // Adiciona linha na tabela de Eventos ao Vivo se não pausada
      if (!UI.eventsPaused) {
        const tbody = document.getElementById("events-table-body");
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
    });

    // Flusha o buffer do Hub quando a Internet é restabelecida
    EventBus.on("fault:internet_changed", (isDown) => {
      if (!isDown) {
        const hub = window.allDevices.find(d => d.category === "wg2");
        if (hub && hub.bufferQueue.length > 0) {
          const flushed = hub.flushBuffer();
          UI.showToast(`Internet reconectada: Hub descarregou ${flushed.length} pacotes acumulados em lote!`);
          for (const ev of flushed) {
            CloudMock.receiveFromDevice(ev);
          }
        }
      }
      document.getElementById("pnode-inet").classList.toggle("failed", isDown);
      document.getElementById("pipeline-status-badge").textContent = isDown ? "OFFLINE (SEM WAN)" : "ONLINE";
      document.getElementById("pipeline-status-badge").style.color = isDown ? "var(--accent-red)" : "var(--accent-teal)";
    });

    EventBus.on("fault:hub_changed", (isOffline) => {
      document.getElementById("pnode-hub").classList.toggle("failed", isOffline);
    });

    EventBus.on("hub:buffer_updated", (len) => {
      document.getElementById("hub-buffer-indicator").textContent = `Buffer Hub: ${len} pacotes`;
    });

    EventBus.on("cloud:quota_updated", ({ used, limit }) => {
      document.getElementById("cloud-quota-text").textContent = `${used} / ${limit}`;
      const pct = Math.min(100, (used / limit) * 100);
      document.getElementById("cloud-quota-bar").style.width = `${pct}%`;
      if (pct >= 100) {
        document.getElementById("cloud-quota-bar").style.background = "var(--accent-red)";
      }
    });

    /* ==========================================================================
       18. LOOP DE ANIMAÇÃO E ATUALIZAÇÃO (60 FPS)
       ========================================================================== */
    const SceneBuilder = new SceneBuilderClass(
      document.getElementById("viewport-container"),
      document.getElementById("css2d-container")
    );
    const Charts = new ChartsController();
    window.SceneBuilder = SceneBuilder;
    window.Charts = Charts;
    window.DataStore = DataStore;
    window.SimClock = SimClock;

    // Inicializa preset completo padrão
    window.loadPreset("full");

    let lastFrameTime = performance.now();
    let chartTimer = 0;
    let summaryTimer = 0;

    function animate() {
      requestAnimationFrame(animate);

      const now = performance.now();
      const deltaRealSec = Math.min((now - lastFrameTime) / 1000.0, 0.1);
      lastFrameTime = now;

      // 1. Atualiza Relógio e Dia/Noite
      SimClock.update();
      const deltaSimSec = deltaRealSec * SimClock.speed * (SimClock.paused ? 0 : 1);
      document.getElementById("clock-display").textContent = SimClock.getFormattedSimTime();

      // 2. Atualiza Atividade Residencial Autônoma e Sensores
      HouseActivity.update(deltaSimSec, window.allDevices, SceneBuilder.doorObjects);
      const hudRoom = document.getElementById("hud-active-room");
      if (hudRoom) hudRoom.textContent = HouseActivity.currentRoom;
      const hudAct = document.getElementById("hud-sim-activity");
      if (hudAct) hudAct.textContent = HouseActivity.currentActivity;

      // 3. Atualiza Dispositivos (pulsos, temporizadores, cortinas)
      for (const dev of window.allDevices) {
        dev.update(deltaSimSec);
      }

      // 4. Atualiza Automações e Polling do Coletor
      AutomationEngine.update(deltaSimSec);
      Collector.updatePolling(deltaSimSec, window.allDevices);

      // 5. Renderização 3D Three.js
      SceneBuilder.update(deltaRealSec);

      // 6. Atualização periódica dos gráficos (a cada 0.5s reais para fluidez)
      chartTimer += deltaRealSec;
      if (chartTimer > 0.5) {
        chartTimer = 0;
        Charts.update(window.allDevices);
      }

      // 7. Atualização do resumo textual para LLM (a cada 4s reais)
      summaryTimer += deltaRealSec;
      if (summaryTimer > 4.0) {
        summaryTimer = 0;
        document.getElementById("llm-state-summary").textContent = DataStore.generateLlmSummary(window.allDevices);
      }
    }

    animate();
  </script>
</body>
</html>
'''
