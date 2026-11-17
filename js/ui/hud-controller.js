/**
 * ==============================================================================
 * HUD & INTERACTION CONTROLLER
 * js/ui/hud-controller.js
 * 
 * Controlador da interface gráfica, painéis, modais, notificações e Tour Interativo.
 * ISOLAMENTO: Comunicação com a cena 3D e a simulação via EventBus e objetos globais controlados.
 * ==============================================================================
 */

import { SimClock } from '../simulation/clock.js';
import { DataStore } from '../simulation/datastore.js';
import { EventBus } from '../contracts/event-bus.js';

export class UIController {
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
    this.setupLabelsTabListeners();

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
    document.getElementById("btn-play-pause")?.addEventListener("click", () => {
      const paused = SimClock.togglePause();
      const icon = document.getElementById("play-icon");
      if (icon) icon.textContent = paused ? "▶" : "⏸";
      document.getElementById("btn-play-pause")?.classList.toggle("active", paused);
    });

    document.getElementById("select-sim-speed")?.addEventListener("change", (e) => {
      SimClock.setSpeed(e.target.value);
    });

    // Presets
    document.getElementById("select-preset")?.addEventListener("change", (e) => {
      if (typeof window.loadPreset === "function") {
        window.loadPreset(e.target.value);
      }
    });

    // Câmeras
    document.getElementById("select-camera")?.addEventListener("change", (e) => {
      EventBus.emit("scene:camera_view", e.target.value);
      this.updateCameraButtons(e.target.value);
    });
    document.getElementById("tool-view-persp")?.addEventListener("click", () => {
      EventBus.emit("scene:camera_view", "perspective");
      this.updateCameraButtons("perspective");
    });
    document.getElementById("tool-view-top")?.addEventListener("click", () => {
      EventBus.emit("scene:camera_view", "top");
      this.updateCameraButtons("top");
    });
    document.getElementById("tool-view-free")?.addEventListener("click", () => {
      EventBus.emit("scene:camera_view", "free");
      this.updateCameraButtons("free");
    });

    // Paredes
    document.getElementById("select-wall-mode")?.addEventListener("change", (e) => {
      EventBus.emit("scene:wall_mode", e.target.value);
    });

    // Alternâncias Visuais
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
      if (window.SceneBuilder) {
        for (const l of window.SceneBuilder.houseBuilder.roomLabels) l.visible = show;
      }
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
      if (window.SceneBuilder && window.allDevices) {
        window.SceneBuilder.updateZigbeeMeshLines(window.allDevices);
      }
    });

    toggleBtn("btn-toggle-cones", "cones", (show) => {
      if (window.SceneBuilder?.sensorVisuals) {
        for (const v of window.SceneBuilder.sensorVisuals.visuals.values()) {
          if (v.detectionConeMesh) v.detectionConeMesh.visible = show;
        }
      }
    });

    toggleBtn("btn-toggle-packets", "packets");

    // Modal de Detalhes
    document.getElementById("btn-close-modal")?.addEventListener("click", () => {
      document.getElementById("device-detail-modal")?.classList.remove("active");
    });

    // Gaveta Retrátil Inferior de Gráficos
    document.getElementById("drawer-handle-bar")?.addEventListener("click", () => {
      const drawer = document.getElementById("bottom-drawer");
      drawer?.classList.toggle("collapsed");
    });

    // Tour Interativo
    document.getElementById("btn-start-tour")?.addEventListener("click", () => {
      if (window.Tour) window.Tour.toggleTour();
    });

    // API Explorer
    document.getElementById("btn-api-execute")?.addEventListener("click", () => this.handleApiExplorerCall());

    // Exportações de Dados
    document.getElementById("btn-export-csv")?.addEventListener("click", () => DataStore.exportCsv());
    document.getElementById("btn-export-json")?.addEventListener("click", () => DataStore.exportJson());
    document.getElementById("btn-export-jsonl")?.addEventListener("click", () => DataStore.exportJsonl());
    document.getElementById("btn-export-ml-dataset")?.addEventListener("click", () => DataStore.exportAggregatedDataset());
    document.getElementById("btn-clear-db")?.addEventListener("click", () => {
      if (confirm("Deseja apagar todos os registros do IndexedDB?")) {
        DataStore.clearDatabase();
        this.showToast("Banco de dados local limpo.");
      }
    });

    // Limpar Alertas
    document.getElementById("btn-clear-notifs")?.addEventListener("click", () => this.clearNotifications());

    // Injeção de Falhas
    document.getElementById("check-fault-internet")?.addEventListener("change", (e) => {
      if (window.FaultInjector) window.FaultInjector.setInternetDown(e.target.checked);
    });
    document.getElementById("check-fault-hub")?.addEventListener("change", (e) => {
      if (window.FaultInjector) window.FaultInjector.setHubOffline(e.target.checked);
    });
    document.getElementById("range-fault-loss")?.addEventListener("input", (e) => {
      document.getElementById("range-loss-val").textContent = `${e.target.value}%`;
      if (window.FaultInjector) window.FaultInjector.setGlobalPacketLoss(Number(e.target.value));
    });
    document.getElementById("check-fault-latency")?.addEventListener("change", (e) => {
      if (window.FaultInjector) window.FaultInjector.setCloudLatencySpike(e.target.checked);
    });
    document.getElementById("check-fault-trial")?.addEventListener("change", (e) => {
      if (window.FaultInjector) window.FaultInjector.setTrialExpired(e.target.checked);
    });
    document.getElementById("check-fault-rf")?.addEventListener("change", (e) => {
      if (window.FaultInjector) window.FaultInjector.setRfInterference(e.target.checked);
    });

    // Atalhos de Teclado
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      const key = e.key.toLowerCase();
      switch (key) {
        case " ":
          e.preventDefault();
          document.getElementById("btn-play-pause")?.click();
          break;
        case "1":
          document.getElementById("tool-view-persp")?.click();
          break;
        case "2":
          document.getElementById("tool-view-top")?.click();
          break;
        case "3":
          document.getElementById("tool-view-free")?.click();
          break;
        case "m":
          document.getElementById("btn-toggle-mesh")?.click();
          break;
        case "l":
          document.getElementById("btn-toggle-labels")?.click();
          break;
        case "c":
          document.getElementById("btn-toggle-cones")?.click();
          break;
        case "p":
          document.getElementById("btn-toggle-packets")?.click();
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

    // Eventos desacoplados emitidos pela camada 3D (Raycaster)
    EventBus.on("device:selected", ({ deviceId }) => {
      const dev = window.allDevices?.find(d => d.id === deviceId);
      if (dev) this.selectDevice(dev);
    });

    // Busca e Filtros no Inventário
    document.getElementById("input-device-search")?.addEventListener("input", () => this.renderInventory());
    for (const pill of document.querySelectorAll(".filter-pill")) {
      pill.addEventListener("click", (e) => {
        document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.renderInventory();
      });
    }

    // Clique nas Siglas para Filtrar Rapidamente (CT, PL, PIR, etc.)
    for (const badge of document.querySelectorAll(".sigla-badge")) {
      badge.addEventListener("click", (e) => {
        const sigla = e.currentTarget.getAttribute("data-sigla");
        const searchInput = document.getElementById("input-device-search");
        if (searchInput) {
          searchInput.value = (searchInput.value === sigla) ? "" : sigla;
          this.renderInventory();
        }
      });
    }

    // Navegação de Abas
    for (const btn of document.querySelectorAll(".tab-btn")) {
      btn.addEventListener("click", (e) => {
        const targetId = e.currentTarget.getAttribute("data-tab");
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
        e.currentTarget.classList.add("active");
        const pane = document.getElementById(targetId);
        if (pane) pane.classList.add("active");

        if (targetId === "tab-notifications") {
          this.unreadNotifCount = 0;
          const badge = document.getElementById("notif-badge");
          if (badge) badge.style.display = "none";
        }
      });
    }

    for (const pill of document.querySelectorAll(".notif-filter")) {
      pill.addEventListener("click", (e) => {
        document.querySelectorAll(".notif-filter").forEach(p => p.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.activeNotifFilter = e.currentTarget.getAttribute("data-filter");
        this.renderNotifications();
      });
    }
  }

  cycleSimSpeed(dir) {
    const speeds = [1, 10, 60, 600, 3600];
    const sel = document.getElementById("select-sim-speed");
    if (!sel) return;
    let idx = speeds.indexOf(Number(sel.value)) + dir;
    if (idx < 0) idx = 0;
    if (idx >= speeds.length) idx = speeds.length - 1;
    sel.value = speeds[idx];
    SimClock.setSpeed(speeds[idx]);
    this.showToast(`Velocidade da simulação: ${speeds[idx]}x`);
  }

  updateCameraButtons(view) {
    const sel = document.getElementById("select-camera");
    if (sel) sel.value = view;
    document.getElementById("tool-view-persp")?.classList.toggle("active", view === "perspective");
    document.getElementById("tool-view-top")?.classList.toggle("active", view === "top");
    document.getElementById("tool-view-free")?.classList.toggle("active", view === "free");
  }

  renderInventory() {
    const listEl = document.getElementById("device-list-container");
    if (!listEl) return;
    const query = (document.getElementById("input-device-search")?.value || "").toLowerCase();
    const activeFilter = document.querySelector(".filter-pill.active")?.getAttribute("data-filter") || "all";

    listEl.innerHTML = "";
    let visibleCount = 0;

    for (const dev of (window.allDevices || [])) {
      if (query && !dev.name.toLowerCase().includes(query) && !dev.room.toLowerCase().includes(query) && !dev.id.toLowerCase().includes(query)) continue;
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

      let siglaDesc = "";
      if (dev.id.startsWith("CT")) siglaDesc = "🚪 Contato (Porta)";
      else if (dev.id.startsWith("PL")) siglaDesc = "🔌 Tomada (Plugue)";
      else if (dev.id.startsWith("PIR")) siglaDesc = "🚶 Presença (PIR)";
      else if (dev.id.startsWith("BL")) siglaDesc = "💡 Lâmpada (Bulb)";
      else if (dev.id.startsWith("CM")) siglaDesc = "🪟 Cortina (Motor)";
      else if (dev.id.startsWith("HUB")) siglaDesc = "🌐 Gateway";
      else if (dev.id.startsWith("CAM")) siglaDesc = "📹 Câmera";
      else if (dev.id.startsWith("RTR")) siglaDesc = "📡 Roteador";

      card.innerHTML = `
        <div class="device-card-header">
          <span class="device-name">${dev.name}</span>
          <span class="proto-badge ${protoClass}">${dev.protocol}</span>
        </div>
        <div class="device-room-row">
          <span class="device-room">${dev.room}</span>
          ${siglaDesc ? `<span class="dev-type-badge">${siglaDesc}</span>` : ""}
        </div>
        <div class="device-metrics">
          <span class="metric-item">🔋 <span class="metric-val">${dev.hasBattery ? Math.round(dev.battery) + "%" : "AC"}</span></span>
          <span class="metric-item">📶 <span class="metric-val">${dev.rssi} dBm</span></span>
          <span class="metric-item">🔀 <span class="metric-val">${dev.hops} salto${dev.hops > 1 ? "s" : ""}</span></span>
        </div>
      `;

      card.addEventListener("click", () => this.selectDevice(dev));
      listEl.appendChild(card);
    }

    const badge = document.getElementById("inventory-count-badge");
    if (badge) badge.textContent = visibleCount;
    this.renderLabelsTab();
  }

  selectDevice(device) {
    this.selectedDevice = device;
    this.renderInventory();

    device.triggerVisualPulse();

    const modal = document.getElementById("device-detail-modal");
    if (!modal) return;
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
      if (window.RadioModel && window.SceneBuilder) {
        window.RadioModel.updateZigbeeMesh(window.allDevices);
        window.SceneBuilder.updateZigbeeMeshLines(window.allDevices);
      }
      this.selectDevice(device);
    };

    modal.classList.add("active");
  }

  applySensorLabelsVisibility(show) {
    window.uiToggles.devLabels = show;
    document.getElementById("btn-toggle-dev-labels")?.classList.toggle("active", show);
    const chk = document.getElementById("checkbox-sensor-labels-master");
    if (chk) chk.checked = show;
    const statusTxt = document.getElementById("sensor-labels-status-text");
    if (statusTxt) {
      statusTxt.textContent = show ? "VISÍVEIS" : "OCULTOS";
      statusTxt.style.color = show ? "var(--accent-teal)" : "var(--text-muted)";
    }
    if (window.SceneBuilder?.sensorVisuals) {
      for (const [id, v] of window.SceneBuilder.sensorVisuals.visuals.entries()) {
        const dev = window.allDevices?.find(d => d.id === id);
        if (v.labelObject) {
          v.labelObject.visible = show && (dev?.showLabel !== false);
        }
      }
    }
    this.updateSensorLabelsBadge();
  }

  updateSensorLabelsBadge() {
    const badge = document.getElementById("sensor-labels-badge");
    if (!badge) return;
    const activeCount = window.uiToggles.devLabels
      ? (window.allDevices || []).filter(d => d.showLabel !== false).length
      : 0;
    badge.textContent = `${activeCount} Ativo${activeCount !== 1 ? 's' : ''}`;
    badge.style.borderColor = activeCount > 0 ? "var(--accent-teal)" : "var(--border-color)";
    badge.style.color = activeCount > 0 ? "var(--accent-teal)" : "var(--text-muted)";
  }

  setupLabelsTabListeners() {
    const chkRoom = document.getElementById("checkbox-room-labels-master");
    if (chkRoom) {
      chkRoom.addEventListener("change", (e) => {
        window.uiToggles.labels = e.target.checked;
        document.getElementById("btn-toggle-labels")?.classList.toggle("active", window.uiToggles.labels);
        if (window.SceneBuilder) {
          for (const l of window.SceneBuilder.houseBuilder.roomLabels) l.visible = window.uiToggles.labels;
        }
        const statusTxt = document.getElementById("room-labels-status-text");
        if (statusTxt) {
          statusTxt.textContent = window.uiToggles.labels ? "VISÍVEIS" : "OCULTOS";
          statusTxt.style.color = window.uiToggles.labels ? "var(--accent-teal)" : "var(--text-muted)";
        }
      });
    }

    const chkSens = document.getElementById("checkbox-sensor-labels-master");
    if (chkSens) {
      chkSens.addEventListener("change", (e) => {
        this.applySensorLabelsVisibility(e.target.checked);
      });
    }

    document.getElementById("chk-lbl-show-name")?.addEventListener("change", (e) => document.body.classList.toggle("hide-lbl-name", !e.target.checked));
    document.getElementById("chk-lbl-show-proto")?.addEventListener("change", (e) => document.body.classList.toggle("hide-lbl-proto", !e.target.checked));
    document.getElementById("chk-lbl-show-state")?.addEventListener("change", (e) => document.body.classList.toggle("hide-lbl-state", !e.target.checked));

    document.getElementById("btn-lbl-all-on")?.addEventListener("click", () => {
      for (const d of (window.allDevices || [])) d.showLabel = true;
      this.applySensorLabelsVisibility(true);
      this.renderLabelsTab();
    });
    document.getElementById("btn-lbl-all-off")?.addEventListener("click", () => {
      for (const d of (window.allDevices || [])) d.showLabel = false;
      this.applySensorLabelsVisibility(false);
      this.renderLabelsTab();
    });
    document.getElementById("btn-lbl-only-zigbee")?.addEventListener("click", () => {
      for (const d of (window.allDevices || [])) d.showLabel = (d.protocol === "zigbee");
      this.applySensorLabelsVisibility(true);
      this.renderLabelsTab();
    });
    document.getElementById("btn-lbl-only-wifi")?.addEventListener("click", () => {
      for (const d of (window.allDevices || [])) d.showLabel = (d.protocol === "wifi");
      this.applySensorLabelsVisibility(true);
      this.renderLabelsTab();
    });

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

    for (const dev of (window.allDevices || [])) {
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

      const chk = row.querySelector(".lbl-dev-chk");
      chk.addEventListener("change", (e) => {
        dev.showLabel = e.target.checked;
        if (window.SceneBuilder?.sensorVisuals) {
          const v = window.SceneBuilder.sensorVisuals.visuals.get(dev.id);
          if (v?.labelObject) {
            v.labelObject.visible = window.uiToggles.devLabels && dev.showLabel;
          }
        }
        this.updateSensorLabelsBadge();
      });

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
    if (!device || !device.pos || !window.SceneBuilder) return;
    device.triggerVisualPulse();

    const targetX = device.pos.x;
    const targetZ = device.pos.z + 3.5;
    const targetY = device.pos.y + 2.5;

    const startPos = { ...window.SceneBuilder.camera.position };
    const startTime = performance.now();
    const duration = 600;

    function animateCam(time) {
      const elapsed = time - startTime;
      const t = Math.min(1.0, elapsed / duration);
      const ease = t * (2 - t);
      window.SceneBuilder.camera.position.x = startPos.x + (targetX - startPos.x) * ease;
      window.SceneBuilder.camera.position.y = startPos.y + (targetY - startPos.y) * ease;
      window.SceneBuilder.camera.position.z = startPos.z + (targetZ - startPos.z) * ease;
      window.SceneBuilder.controls.target.set(device.pos.x, device.pos.y, device.pos.z);
      window.SceneBuilder.controls.update();

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
      const res = window.CloudMock?.callRestApi(endpoint, devId);
      respBox.textContent = `HTTP/1.1 ${res.status} ${res.message}\n` +
        `Content-Type: application/json\n` +
        `X-Tuya-Timestamp: ${Date.now()}\n\n` +
        JSON.stringify(res.data || { error: res.message }, null, 2);
    }, 150);
  }

  logNotification(category, message, type = "info") {
    const timeStr = SimClock.simTime.toTimeString().split(' ')[0];
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
      category,
      message,
      type,
      count: 1
    };

    this.notifications.unshift(item);
    if (this.notifications.length > 200) {
      this.notifications.pop();
    }

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

export class TourController {
  constructor() {
    this.currentStep = 0;
    this.active = false;
    this.steps = this.buildSteps();
    this.init();
  }

  init() {
    document.getElementById("btn-tour-prev")?.addEventListener("click", () => this.prevStep());
    document.getElementById("btn-tour-next")?.addEventListener("click", () => this.nextStep());
    document.getElementById("btn-close-tour")?.addEventListener("click", () => this.endTour());

    window.addEventListener("keydown", (e) => {
      if (!this.active) return;
      if (e.key === "Escape") this.endTour();
      else if (e.key === "ArrowRight") this.nextStep();
      else if (e.key === "ArrowLeft") this.prevStep();
    });
  }

  toggleTour() {
    if (this.active) {
      this.endTour();
    } else {
      this.startTour(0);
    }
  }

  startTour(stepIndex = 0) {
    this.active = true;
    document.getElementById("btn-start-tour")?.classList.add("active");
    const card = document.getElementById("tour-card");
    if (card) card.style.display = "flex";
    this.renderStep(stepIndex);
  }

  endTour() {
    this.active = false;
    document.getElementById("btn-start-tour")?.classList.remove("active");
    const card = document.getElementById("tour-card");
    if (card) card.style.display = "none";
    document.getElementById("device-detail-modal")?.classList.remove("active");
    if (window.UI) {
      window.UI.showDiscreetToast("Guia concluído. Modo de exploração livre ativo!", "info", 1800);
    }
  }

  goToStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    this.renderStep(index);
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.goToStep(this.currentStep + 1);
    } else {
      this.endTour();
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }

  renderStep(index) {
    this.currentStep = index;
    const step = this.steps[index];

    const badge = document.getElementById("tour-step-badge");
    if (badge) badge.textContent = `Passo ${index + 1} de ${this.steps.length}`;
    const tag = document.getElementById("tour-section-tag");
    if (tag) tag.textContent = step.section;
    const icon = document.getElementById("tour-icon");
    if (icon) icon.textContent = step.icon;
    const title = document.getElementById("tour-title");
    if (title) title.textContent = step.title;
    const subtitle = document.getElementById("tour-subtitle");
    if (subtitle) subtitle.textContent = step.subtitle;
    const content = document.getElementById("tour-content");
    if (content) content.innerHTML = step.content;

    const progressPct = ((index + 1) / this.steps.length) * 100;
    const fill = document.getElementById("tour-progress-fill");
    if (fill) fill.style.width = `${progressPct}%`;

    const btnPrev = document.getElementById("btn-tour-prev");
    if (btnPrev) {
      btnPrev.disabled = index === 0;
      btnPrev.style.opacity = index === 0 ? "0.4" : "1";
      btnPrev.style.pointerEvents = index === 0 ? "none" : "auto";
    }

    const btnNext = document.getElementById("btn-tour-next");
    if (btnNext) {
      btnNext.textContent = index === this.steps.length - 1 ? "Concluir 🏆" : "Próximo ▶";
    }

    const dotsContainer = document.getElementById("tour-dots-container");
    if (dotsContainer) {
      dotsContainer.innerHTML = "";
      this.steps.forEach((_, i) => {
        const dot = document.createElement("div");
        dot.className = `tour-dot ${i === index ? "active" : ""}`;
        dot.title = `Ir para Passo ${i + 1}: ${this.steps[i].title}`;
        dot.addEventListener("click", () => this.goToStep(i));
        dotsContainer.appendChild(dot);
      });
    }

    const actionBox = document.getElementById("tour-action-box");
    if (actionBox) {
      if (step.actionText && step.onAction) {
        actionBox.style.display = "flex";
        actionBox.innerHTML = `<button class="tour-btn-action" id="btn-tour-step-action">${step.actionText}</button>`;
        document.getElementById("btn-tour-step-action")?.addEventListener("click", () => {
          step.onAction();
        });
      } else {
        actionBox.style.display = "none";
        actionBox.innerHTML = "";
      }
    }

    if (typeof step.setup === "function") {
      try {
        step.setup();
      } catch (e) {
        console.warn("Erro no setup do tour:", e);
      }
    }
  }

  buildSteps() {
    return [
      {
        section: "1.1 Plataforma Tuya",
        icon: "🏛️",
        title: "As 4 Camadas da Plataforma Tuya",
        subtitle: "Visão holística da arquitetura IoT em nuvem (PaaS)",
        content: `
          <p>A <strong>Tuya</strong> é uma plataforma IoT em nuvem (PaaS). A maioria dos dispositivos "Smart Life / Tuya Smart" de marcas diferentes compartilham o mesmo ecossistema com marcas brancas.</p>
          <ul>
            <li><strong>1. Dispositivo Físico:</strong> sensor ou atuador com módulo de rádio (Wi-Fi, Zigbee, BLE).</li>
            <li><strong>2. Nuvem Tuya:</strong> autentica dispositivos, armazena estado atual, roteia comandos e expõe APIs.</li>
            <li><strong>3. App Smart Life / Tuya Smart:</strong> interface para o usuário final.</li>
            <li><strong>4. Tuya IoT Platform (iot.tuya.com):</strong> portal onde se extraem dados programaticamente.</li>
          </ul>
          <div class="tour-callout"><strong>💡 No Simulador:</strong> A planta 3D representa o ambiente físico integrado à nuvem Tuya e ao Hub Zigbee central.</div>
        `,
        actionText: "🔭 Visão Panorâmica da Casa",
        onAction: () => {
          EventBus.emit("scene:camera_view", "perspective");
        },
        setup: () => {
          EventBus.emit("scene:camera_view", "perspective");
          const wallSelect = document.getElementById("select-wall-mode");
          if (wallSelect) {
            wallSelect.value = "cut";
            wallSelect.dispatchEvent(new Event("change"));
          }
        }
      },
      {
        section: "Cotação da IC",
        icon: "📦",
        title: "Itens Selecionados & Dispositivos Físicos",
        subtitle: "Sensores e atuadores prioritários selecionados para o laboratório",
        content: `
          <p>Após descartar itens inviáveis, a cotação oficial da IC selecionou os seguintes componentes ativos:</p>
          <ul>
            <li><strong>Abertura:</strong> Sensor porta/janela Tuya Wi-Fi e Zigbee.</li>
            <li><strong>Movimento:</strong> Sensores PIR Wi-Fi e PIR Zigbee (com tempo de cooldown e lux).</li>
            <li><strong>Energia:</strong> Tomadas 20A com medidor (cur_power, cur_voltage, cur_current).</li>
            <li><strong>Hub:</strong> Gateway Zigbee 3.0 coordenador (cabeado Ethernet ou sem fio).</li>
            <li><strong>Atuadores:</strong> Motor de cortina (posição em %) e Lâmpadas inteligentes CCT.</li>
          </ul>
        `,
        actionText: "🔍 Filtrar Sensores PIR de Presença",
        onAction: () => {
          document.querySelector(".filter-pill[data-filter='pir']")?.click();
        },
        setup: () => {
          document.querySelector(".filter-pill[data-filter='all']")?.click();
        }
      },
      {
        section: "1.2 Modelo de Dados",
        icon: "🏷️",
        title: "Data Points (DP): O Conceito Mais Importante",
        subtitle: "Como cada sensor e atuador é descrito na plataforma",
        content: `
          <p>Todo dispositivo Tuya é modelado por um conjunto de <strong>Data Points (DP)</strong>. Na prática científica, <em>dados do sensor = fluxo de eventos de DPs com timestamp</em>.</p>
          <ul>
            <li><strong>ID Numérico & Code Textual:</strong> Ex.: DP 1 (<code>doorcontact_state</code>), DP 19 (<code>cur_power</code>), DP 1 (<code>pir</code>).</li>
            <li><strong>Tipos de Dados:</strong> <code>bool</code>, <code>value</code>, <code>enum</code>, <code>string</code>, <code>raw</code>.</li>
            <li><strong>Modo de Acesso:</strong> <code>ro</code> (só reporta), <code>rw</code> (reporta e aceita comandos).</li>
          </ul>
        `,
        actionText: "📋 Inspecionar DPs do Sensor CT-05",
        onAction: () => {
          const dev = window.allDevices?.find(d => d.id === "CT-05");
          if (dev && window.UI) window.UI.selectDevice(dev);
        },
        setup: () => {
          const dev = window.allDevices?.find(d => d.id === "CT-05");
          if (dev && window.UI) window.UI.selectDevice(dev);
        }
      },
      {
        section: "4.1 Topologia Zigbee",
        icon: "🕸️",
        title: "Rede Zigbee 3.0 em Malha (IEEE 802.15.4)",
        subtitle: "Coordenador, Routers e End Devices no ecossistema residencial",
        content: `
          <p>O Zigbee opera na frequência de 2,4 GHz com topologia <strong>mesh</strong> (malha):</p>
          <ul>
            <li><strong>Coordenador (Hub/Gateway):</strong> Cria a rede, distribui chaves e faz ponte com a nuvem.</li>
            <li><strong>Routers:</strong> Lâmpadas e tomadas que retransmitem pacotes, estendendo o sinal.</li>
            <li><strong>End Devices:</strong> Sensores a bateria (PIR, portas). Dormem e comunicam-se via pai mais próximo.</li>
          </ul>
        `,
        actionText: "⚡ Focar no Hub & Malha RF 3D",
        onAction: () => {
          document.getElementById("btn-toggle-mesh")?.classList.add("active");
          EventBus.emit("scene:camera_view", "free");
        },
        setup: () => {
          document.getElementById("device-detail-modal")?.classList.remove("active");
          const btnMesh = document.getElementById("btn-toggle-mesh");
          if (btnMesh && !btnMesh.classList.contains("active")) btnMesh.click();
        }
      },
      {
        section: "1.4 & 4.3 Operação",
        icon: "🔋",
        title: "Sensores a Bateria & Cluster 0xEF00",
        subtitle: "Sleep agressivo, reporte sob demanda e empacotamento Tuya",
        content: `
          <p>Sensores a bateria possuem características técnicas determinantes:</p>
          <ul>
            <li><strong>Sono Profundo:</strong> Eles não aceitam consulta local. Você só os ouve quando acordam.</li>
            <li><strong>Tempo de Bloqueio (Cooldown):</strong> PIRs têm bloqueio após detecção para poupar bateria.</li>
            <li><strong>Cluster Proprietário (0xEF00):</strong> Sensores Zigbee Tuya empacotam DPs em um cluster fechado.</li>
          </ul>
        `,
        actionText: "📡 Disparar Evento & Pacote no Ar",
        onAction: () => {
          const pir = window.allDevices?.find(d => d.id === "PIR-01");
          if (pir) pir.forceEvent();
        },
        setup: () => {
          const btnPackets = document.getElementById("btn-toggle-packets");
          if (btnPackets && !btnPackets.classList.contains("active")) btnPackets.click();
        }
      },
      {
        section: "4.4 & 5 Coexistência",
        icon: "📶",
        title: "Wi-Fi x Zigbee: Coexistência e Canais 2.4GHz",
        subtitle: "Como evitar interferências de rádio e otimizar a infraestrutura",
        content: `
          <p>Wi-Fi e Zigbee compartilham a banda de 2,4 GHz. Para mitigar colisões e perdas de pacotes na residência:</p>
          <ul>
            <li><strong>Alocação de Canais:</strong> Wi-Fi nos canais 1, 6 ou 11 e Zigbee nos canais 15, 20, 25 ou 26.</li>
            <li><strong>Posicionamento Físico:</strong> Hub a mais de 1m de roteadores Wi-Fi.</li>
            <li><strong>SSID Dedicado:</strong> SSID exclusivo de 2,4 GHz para IoT.</li>
          </ul>
        `,
        actionText: "📶 Abrir Aba de Métricas de Rede",
        onAction: () => {
          document.querySelector(".tab-btn[data-tab='tab-network']")?.click();
        },
        setup: () => {
          document.querySelector(".tab-btn[data-tab='tab-network']")?.click();
        }
      },
      {
        section: "2.1 Nuvem Tuya",
        icon: "☁️",
        title: "Extração de Dados: Caminho Nuvem Oficial",
        subtitle: "Tuya IoT Platform, OpenAPI e Push WebSocket Message Service",
        content: `
          <p>A extração oficial via nuvem utiliza a Tuya IoT Platform:</p>
          <ul>
            <li><strong>Autenticação:</strong> OpenAPI com Access ID, Secret e HMAC-SHA256.</li>
            <li><strong>Push (Message Service):</strong> A Tuya empurra os eventos em tempo real via WebSocket/Pulsar.</li>
          </ul>
          <div class="tour-callout warning"><strong>⚠️ Regra de Ouro:</strong> A Tuya NÃO é seu banco de dados. Os logs expiram rápido!</div>
        `,
        actionText: "🌐 Abrir API Explorer da Nuvem",
        onAction: () => {
          document.querySelector(".tab-btn[data-tab='tab-cloud']")?.click();
        },
        setup: () => {
          document.querySelector(".tab-btn[data-tab='tab-cloud']")?.click();
        }
      },
      {
        section: "2.2 Controle Local",
        icon: "⚡",
        title: "Extração Local (LAN) & Interconexão Lógica",
        subtitle: "TinyTuya, localKey e por que os dispositivos não conversam entre si",
        content: `
          <p>Princípios arquiteturais fundamentais:</p>
          <ul>
            <li><strong>Comunicação Local:</strong> Dispositivos de rede elétrica aceitam conexão TCP na porta 6668 com TinyTuya.</li>
            <li><strong>Interconexão Lógica:</strong> Dispositivos Tuya NÃO conversam entre si diretamente. A inteligência roda no coletor.</li>
          </ul>
        `,
        actionText: "🔌 Ver Arquitetura de Coleta",
        onAction: () => {
          document.querySelector(".tab-btn[data-tab='tab-pipeline']")?.click();
        },
        setup: () => {
          document.querySelector(".tab-btn[data-tab='tab-pipeline']")?.click();
        }
      },
      {
        section: "6.0 Energia & NILM",
        icon: "📈",
        title: "Tomadas 20A com Medidor & NILM",
        subtitle: "Reconhecimento de aparelhos por assinatura de potência e segurança",
        content: `
          <p>Tomadas inteligentes com medição de energia:</p>
          <ul>
            <li><strong>Telemetria:</strong> Watts, Tensão, Corrente e kWh.</li>
            <li><strong>NILM:</strong> Modelos de ML que inferem o aparelho pela assinatura de consumo.</li>
          </ul>
        `,
        actionText: "📊 Expandir Gaveta de Gráficos de Potência",
        onAction: () => {
          const drawer = document.getElementById("bottom-drawer");
          if (drawer && drawer.classList.contains("collapsed")) {
            document.getElementById("drawer-handle-bar")?.click();
          }
        },
        setup: () => {
          const drawer = document.getElementById("bottom-drawer");
          if (drawer && drawer.classList.contains("collapsed")) {
            document.getElementById("drawer-handle-bar")?.click();
          }
        }
      },
      {
        section: "3.2 & 7.1 Pipeline",
        icon: "🔬",
        title: "O Pipeline de Dados para Machine Learning",
        subtitle: "Normalização JSON, Séries Temporais, Janelas de Tempo e Ground Truth",
        content: `
          <p>Para transformar eventos em ciência reprodutível:</p>
          <ul>
            <li><strong>Ingestão:</strong> Eventos normalizados em JSON imutável com duplo timestamp.</li>
            <li><strong>Persistência:</strong> IndexedDB local com exportação em CSV, JSON e JSONL.</li>
            <li><strong>Engenharia de Features:</strong> Janelas temporais de 5 minutos com Ground Truth.</li>
          </ul>
        `,
        actionText: "💾 Ver Dados Gravados no IndexedDB",
        onAction: () => {
          document.querySelector(".tab-btn[data-tab='tab-events']")?.click();
        },
        setup: () => {
          document.querySelector(".tab-btn[data-tab='tab-events']")?.click();
        }
      },
      {
        section: "7.2 Papel dos LLMs",
        icon: "🤖",
        title: "A Verdade sobre LLMs na Casa Inteligente",
        subtitle: "Onde Modelos de Linguagem fazem sentido e onde falham redondamente",
        content: `
          <p>Diretrizes para uso de LLMs:</p>
          <ul>
            <li><strong>Onde o LLM Brilha:</strong> Interface, tradução de dados em linguagem natural e Function Calling.</li>
            <li><strong>O que NÃO fazer:</strong> Não use LLM para modelar séries temporais numéricas diretas.</li>
          </ul>
        `,
        actionText: "🤖 Inspecionar Resumo para LLM",
        onAction: () => {
          document.querySelector(".tab-btn[data-tab='tab-pipeline']")?.click();
          document.getElementById("llm-state-summary")?.scrollIntoView({ behavior: "smooth" });
        },
        setup: () => {
          document.querySelector(".tab-btn[data-tab='tab-pipeline']")?.click();
        }
      },
      {
        section: "8.0 Roteiro da IC",
        icon: "🏆",
        title: "Roteiro da Pesquisa & Próximos Passos",
        subtitle: "Da Prova de Conceito digital à implementação física no laboratório",
        content: `
          <p>Parabéns! Você completou o Guia Técnico Interativo da Iniciação Científica.</p>
          <ul>
            <li><strong>Fase 0 (Concluída):</strong> Simulação, posicionamento 3D e validação da telemetria.</li>
            <li><strong>Fase 1:</strong> Aquisição do Hub Zigbee e sensores piloto.</li>
            <li><strong>Fase 2:</strong> Coletor Python + InfluxDB.</li>
            <li><strong>Fase 3:</strong> Coleta massiva e modelos de ML.</li>
          </ul>
        `,
        actionText: "🎉 Concluir Guia & Explorar Livremente",
        onAction: () => {
          this.endTour();
        },
        setup: () => {
          const drawer = document.getElementById("bottom-drawer");
          if (drawer && !drawer.classList.contains("collapsed")) {
            document.getElementById("drawer-handle-bar")?.click();
          }
        }
      }
    ];
  }
}
