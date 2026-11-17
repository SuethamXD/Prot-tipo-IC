/**
 * ==============================================================================
 * 3D SCENE MANAGER (THREE.JS ORCHESTRATOR)
 * js/scene/scene-manager.js
 * 
 * Orquestrador da cena 3D: renderizador WebGL, CSS2D, câmeras, iluminação dinâmica e tweens.
 * ISOLAMENTO: Camada 3D pura. Comunica-se com simulação e UI via EventBus.
 * ==============================================================================
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { HouseBuilder } from './house-builder.js';
import { SensorVisualsManager } from './sensor-visuals.js';
import { RaycasterManager } from './raycaster.js';
import { EventBus } from '../contracts/event-bus.js';

export class SceneManager {
  constructor(viewportContainer, css2dContainer) {
    this.container = viewportContainer;
    this.css2dContainer = css2dContainer;

    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.labelRenderer = null;
    this.controls = null;

    this.hemiLight = null;
    this.dirLight = null;
    this.cameraTween = null;
    this.currentCameraView = "perspective";

    this.init();
    this.houseBuilder = new HouseBuilder(this.scene);
    this.houseBuilder.buildAll();

    this.sensorVisuals = new SensorVisualsManager(this.scene);
    this.raycaster = new RaycasterManager(this.camera, this.renderer.domElement, this.scene);

    this.initEventListeners();
  }

  get doorObjects() {
    return this.houseBuilder.doorObjects;
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 150);
    this.camera.position.set(16.5, 14.5, 21.5);
    this.camera.lookAt(4.5, 0.5, 7.0);

    const canvas = document.getElementById("three-canvas");
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.css2dContainer.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(4.5, 0.5, 7.0);

    this.setupLighting();
    window.addEventListener("resize", () => this.onWindowResize());
  }

  setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.7);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 1.2);
    this.dirLight.position.set(12, 22, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 60;
    this.dirLight.shadow.camera.left = -12;
    this.dirLight.shadow.camera.right = 16;
    this.dirLight.shadow.camera.top = 16;
    this.dirLight.shadow.camera.bottom = -16;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
  }

  initEventListeners() {
    EventBus.on("clock:tick", ({ externalLux, dayPeriod, sunAltitude }) => {
      this.updateLighting(externalLux, dayPeriod, sunAltitude);
    });

    EventBus.on("door:state_changed", ({ doorId, isOpen }) => {
      const doorObj = this.houseBuilder.doorObjects.find(d => d.def.id === doorId);
      if (doorObj) doorObj.targetOpen = isOpen;
    });

    EventBus.on("floor:clicked", ({ room }) => {
      if (typeof window !== "undefined" && window.HouseActivity) {
        window.HouseActivity.setActiveRoom(room);
        window.HouseActivity.currentActivity = `Foco manual em ${room}`;
        if (window.logNotification) {
          window.logNotification("system", `Cômodo ativo alterado para ${room}.`, "info");
        }
      }
    });
  }

  updateLighting(lux, period, sunAltitude) {
    if (!this.dirLight || !this.hemiLight) return;

    if (period === "night") {
      this.dirLight.intensity = 0.05;
      this.dirLight.color.setHex(0x38bdf8);
      this.hemiLight.intensity = 0.2;
    } else if (period === "dawn" || period === "sunset") {
      this.dirLight.intensity = 0.7;
      this.dirLight.color.setHex(0xfb923c);
      this.hemiLight.intensity = 0.5;
    } else {
      this.dirLight.intensity = Math.min(1.4, Math.max(0.6, (lux / 40000)));
      this.dirLight.color.setHex(0xfff7ed);
      this.hemiLight.intensity = 0.75;
    }

    if (sunAltitude !== undefined) {
      const angle = (sunAltitude + 0.3) * (Math.PI / 2);
      this.dirLight.position.x = 4.5 + Math.cos(angle) * 18.0;
      this.dirLight.position.y = Math.max(2.0, Math.sin(angle) * 22.0);
    }
  }

  applyWallMode(mode) {
    this.houseBuilder.applyWallMode(mode);
  }

  setCameraView(viewName) {
    this.currentCameraView = viewName;
    let targetPos = new THREE.Vector3();
    let targetLook = new THREE.Vector3(4.5, 0.5, 7.0);

    if (viewName === "perspective") {
      targetPos.set(16.5, 14.5, 21.5);
    } else if (viewName === "top") {
      targetPos.set(4.5, 25.0, 7.001);
    } else {
      return;
    }

    this.cameraTween = {
      startPos: this.camera.position.clone(),
      endPos: targetPos,
      startLook: this.controls.target.clone(),
      endLook: targetLook,
      t: 0
    };
  }

  createDeviceMesh(device) {
    return this.sensorVisuals.createDeviceVisual(device);
  }

  spawnDataPacket(waypoints, protocol) {
    this.sensorVisuals.spawnDataPacket(waypoints, protocol);
  }

  updateZigbeeMeshLines(devices) {
    this.sensorVisuals.updateZigbeeMeshLines(devices);
  }

  onWindowResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }

  update(deltaSec) {
    if (this.cameraTween) {
      this.cameraTween.t += deltaSec * 2.5;
      const alpha = Math.min(1.0, this.cameraTween.t);
      this.camera.position.lerpVectors(this.cameraTween.startPos, this.cameraTween.endPos, alpha);
      this.controls.target.lerpVectors(this.cameraTween.startLook, this.cameraTween.endLook, alpha);
      if (alpha >= 1.0) this.cameraTween = null;
    }

    this.controls.update();
    this.houseBuilder.updateDoors(deltaSec);
    this.houseBuilder.updateCloud(performance.now());
    this.sensorVisuals.update(deltaSec);

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
}
