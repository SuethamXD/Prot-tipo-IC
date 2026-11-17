/**
 * ==============================================================================
 * VISUAL DEBUG PANEL (LIL-GUI)
 * js/ui/debug-panel.js
 * 
 * Painel flutuante de ajuste fino em tempo real:
 *   - Câmera: FOV, coordenadas mundiais e presets
 *   - Luzes: Sol direto, luz hemisférica, ciclo astronômico
 *   - Casa 3D: Altura de corte e transparência de paredes
 *   - Simulação: Velocidade e controle de execução
 * ==============================================================================
 */

import GUI from 'lil-gui';
import { SimClock } from '../simulation/clock.js';
import { CONFIG } from '../simulation/config.js';
import { EventBus } from '../contracts/event-bus.js';

export class DebugPanel {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.gui = new GUI({ title: "🛠️ Painel de Debug 3D & Sim", closeFolders: true });
    this.gui.domElement.style.position = "absolute";
    this.gui.domElement.style.top = "56px";
    this.gui.domElement.style.right = "12px";
    this.gui.domElement.style.zIndex = "999";

    this.params = {
      cameraFov: this.sceneManager.camera.fov,
      cameraView: "perspective",
      camPosX: Number(this.sceneManager.camera.position.x.toFixed(1)),
      camPosY: Number(this.sceneManager.camera.position.y.toFixed(1)),
      camPosZ: Number(this.sceneManager.camera.position.z.toFixed(1)),

      sunIntensity: this.sceneManager.dirLight.intensity,
      hemiIntensity: this.sceneManager.hemiLight.intensity,
      cycleMode: "auto",

      wallMode: "cut",
      cutHeight: CONFIG.house.cutWallHeight,

      simSpeed: SimClock.speed,
      paused: SimClock.paused,

      showMesh: true,
      showPackets: true,
      showLabels: true
    };

    this.initFolders();
  }

  initFolders() {
    // 1. Pasta Câmera
    const fCam = this.gui.addFolder("📷 Câmera 3D");
    fCam.add(this.params, "cameraView", ["perspective", "top", "free"]).name("Visão").onChange((v) => {
      this.sceneManager.setCameraView(v);
    });
    fCam.add(this.params, "cameraFov", 20, 90, 1).name("Campo de Visão (FOV)").onChange((val) => {
      this.sceneManager.camera.fov = val;
      this.sceneManager.camera.updateProjectionMatrix();
    });
    fCam.add(this.params, "camPosX").name("Posição X").listen().onChange((v) => {
      this.sceneManager.camera.position.x = v;
    });
    fCam.add(this.params, "camPosY").name("Posição Y").listen().onChange((v) => {
      this.sceneManager.camera.position.y = v;
    });
    fCam.add(this.params, "camPosZ").name("Posição Z").listen().onChange((v) => {
      this.sceneManager.camera.position.z = v;
    });

    // 2. Pasta Iluminação
    const fLight = this.gui.addFolder("☀️ Iluminação & Sol");
    fLight.add(this.params, "sunIntensity", 0, 3, 0.05).name("Intensidade Sol").onChange((v) => {
      this.sceneManager.dirLight.intensity = v;
    });
    fLight.add(this.params, "hemiIntensity", 0, 2, 0.05).name("Luz Ambiente").onChange((v) => {
      this.sceneManager.hemiLight.intensity = v;
    });
    fLight.add(this.params, "cycleMode", ["auto", "dawn", "day", "sunset", "night"]).name("Período").onChange((mode) => {
      if (mode !== "auto") {
        this.sceneManager.updateLighting(mode === "night" ? 5 : 50000, mode, 0.5);
      }
    });

    // 3. Pasta Arquitetura 3D
    const fHouse = this.gui.addFolder("🏠 Casa & Paredes");
    fHouse.add(this.params, "wallMode", ["cut", "transparent", "full"]).name("Modo Paredes").onChange((m) => {
      this.sceneManager.applyWallMode(m);
      const sel = document.getElementById("select-wall-mode");
      if (sel) sel.value = m;
    });
    fHouse.add(this.params, "cutHeight", 0.1, 2.7, 0.05).name("Altura Corte (m)").onChange((h) => {
      CONFIG.house.cutWallHeight = h;
      if (this.sceneManager.houseBuilder.currentWallMode === "cut") {
        this.sceneManager.applyWallMode("cut");
      }
    });

    // 4. Pasta Simulação IoT
    const fSim = this.gui.addFolder("⏱️ Simulação & RF");
    fSim.add(this.params, "simSpeed", [1, 10, 60, 600, 3600]).name("Velocidade").onChange((s) => {
      SimClock.setSpeed(s);
      const sel = document.getElementById("select-sim-speed");
      if (sel) sel.value = s;
    });
    fSim.add(this.params, "paused").name("Pausar").listen().onChange(() => {
      SimClock.togglePause();
    });
    fSim.add(this.params, "showMesh").name("Malha Zigbee").onChange((v) => {
      if (window.uiToggles) window.uiToggles.mesh = v;
      if (window.allDevices) this.sceneManager.updateZigbeeMeshLines(window.allDevices);
    });
    fSim.add(this.params, "showPackets").name("Pacotes Voando").onChange((v) => {
      if (window.uiToggles) window.uiToggles.packets = v;
    });
    fSim.add(this.params, "showLabels").name("Rótulos Sensores").onChange((v) => {
      if (window.UI) window.UI.applySensorLabelsVisibility(v);
    });

    EventBus.on("clock:pause_toggled", (paused) => {
      this.params.paused = paused;
    });
    EventBus.on("clock:speed_changed", (speed) => {
      this.params.simSpeed = speed;
    });
  }

  update() {
    this.params.camPosX = Number(this.sceneManager.camera.position.x.toFixed(1));
    this.params.camPosY = Number(this.sceneManager.camera.position.y.toFixed(1));
    this.params.camPosZ = Number(this.sceneManager.camera.position.z.toFixed(1));
  }
}
