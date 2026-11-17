/**
 * ==============================================================================
 * SENSOR 3D VISUAL PROXIES & RF MESH LINES
 * js/scene/sensor-visuals.js
 * 
 * Gerencia a representação tridimensional de todos os sensores, anéis de protocolo,
 * LEDs de pulso, cones de visão e rótulos flutuantes CSS2D.
 * ISOLAMENTO: Desacoplado do estado lógico dos dispositivos. Reage a eventos do EventBus.
 * ==============================================================================
 */

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONFIG } from '../simulation/config.js';
import { EventBus } from '../contracts/event-bus.js';

export class SensorVisualsManager {
  constructor(scene) {
    this.scene = scene;
    this.visuals = new Map(); // deviceId -> VisualProxy
    this.dataPackets = [];
    this.meshLines = null;

    this.initEventListeners();
  }

  initEventListeners() {
    EventBus.on("device:pulse", ({ id }) => {
      this.triggerPulseAnimation(id);
    });

    EventBus.on("device:dp_updated", ({ deviceId, code, value, shortStatus }) => {
      this.updateDeviceLabel(deviceId, shortStatus);
      // Se for lâmpada inteligente, atualiza emissão 3D
      const visual = this.visuals.get(deviceId);
      if (visual && visual.category === "dj" && code === "switch_led") {
        if (visual.bulbMesh) {
          visual.bulbMesh.material.emissiveIntensity = value ? 0.8 : 0.05;
        }
      }
    });

    EventBus.on("device:status_changed", ({ device, status }) => {
      const visual = this.visuals.get(device.id);
      if (visual && visual.labelElement) {
        visual.labelElement.classList.toggle("offline", status === "offline");
        const statusEl = visual.labelElement.querySelector(".dev-status");
        if (statusEl) statusEl.textContent = status === "offline" ? "OFF" : "OK";
      }
    });
  }

  createDeviceVisual(device) {
    const group = new THREE.Group();
    group.position.set(device.pos.x, device.pos.y, device.pos.z);

    let ringColor = CONFIG.colors.zigbeeAmber;
    if (device.category === "wg2") ringColor = CONFIG.colors.hubMagenta;
    else if (device.category === "router") ringColor = CONFIG.colors.routerWhite;
    else if (device.protocol === "wifi") ringColor = CONFIG.colors.wifiCyan;

    let baseMesh = null;
    let bulbMesh = null;

    if (device.category === "pir") {
      const geom = new THREE.ConeGeometry(0.08, 0.12, 4);
      const mat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.3 });
      baseMesh = new THREE.Mesh(geom, mat);
      baseMesh.rotation.y = (device.rotY || 0) * (Math.PI / 180);
    } else if (device.category === "dj") {
      const geom = new THREE.SphereGeometry(0.09, 16, 16);
      const isLit = device.getDP ? device.getDP("switch_led") : false;
      const mat = new THREE.MeshStandardMaterial({
        color: 0xFFFBEB,
        emissive: 0xFDE047,
        emissiveIntensity: isLit ? 0.8 : 0.05
      });
      baseMesh = new THREE.Mesh(geom, mat);
      bulbMesh = baseMesh;
    } else if (device.category === "cz") {
      const geom = new THREE.BoxGeometry(0.08, 0.1, 0.04);
      const mat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.4 });
      baseMesh = new THREE.Mesh(geom, mat);
    } else if (device.category === "sp") {
      const geom = new THREE.CylinderGeometry(0.05, 0.07, 0.12, 12);
      const mat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.3 });
      baseMesh = new THREE.Mesh(geom, mat);
      baseMesh.rotation.z = Math.PI / 4;
    } else {
      const geom = new THREE.BoxGeometry(0.12, 0.04, 0.12);
      const mat = new THREE.MeshStandardMaterial({ color: ringColor, roughness: 0.3 });
      baseMesh = new THREE.Mesh(geom, mat);
    }

    group.add(baseMesh);

    // Anel identificador de protocolo
    const ringGeom = new THREE.TorusGeometry(0.12, 0.015, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: ringColor });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    group.add(ringMesh);

    // LED de atividade
    const ledGeom = new THREE.SphereGeometry(0.025, 8, 8);
    const ledMat = new THREE.MeshStandardMaterial({
      color: ringColor,
      emissive: ringColor,
      emissiveIntensity: 0.8
    });
    const ledMesh = new THREE.Mesh(ledGeom, ledMat);
    ledMesh.position.set(0, 0.08, 0);
    group.add(ledMesh);

    // Pulso animado
    const pulseGeom = new THREE.RingGeometry(0.12, 0.16, 24);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const pulseMesh = new THREE.Mesh(pulseGeom, pulseMat);
    pulseMesh.rotation.x = -Math.PI / 2;
    pulseMesh.visible = false;
    group.add(pulseMesh);

    // Cone de detecção
    let detectionConeMesh = null;
    if (device.category === "pir" || device.category === "sp") {
      const radius = device.category === "pir" ? 1.8 : 1.5;
      const height = device.category === "pir" ? 2.8 : 2.5;
      const coneGeom = new THREE.ConeGeometry(radius, height, 16, 1, false);
      const coneMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: device.category === "pir" ? 0.08 : 0.06,
        wireframe: false,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      detectionConeMesh = new THREE.Mesh(coneGeom, coneMat);
      detectionConeMesh.rotation.x = Math.PI / 2;
      detectionConeMesh.position.z = height / 2.0;
      detectionConeMesh.visible = false;
      group.add(detectionConeMesh);
    }

    // Rótulo CSS2D
    const devLabelDiv = document.createElement("div");
    devLabelDiv.className = `device-label-pill proto-${device.protocol || "zigbee"}`;
    devLabelDiv.id = `label-dev-${device.id}`;
    devLabelDiv.title = `${device.name} (${(device.protocol || "").toUpperCase()}) - Clique para detalhes`;

    let dotColor = CONFIG.colors.zigbeeAmber;
    if (device.category === "wg2") dotColor = CONFIG.colors.hubMagenta;
    else if (device.category === "router") dotColor = CONFIG.colors.routerWhite;
    else if (device.protocol === "wifi") dotColor = CONFIG.colors.wifiCyan;

    devLabelDiv.innerHTML = `
      <span class="dev-dot" style="background:${dotColor};"></span>
      <span class="dev-id">${device.id}</span>
      <span class="dev-status" id="label-val-${device.id}">${device.getShortStatus ? device.getShortStatus() : "OK"}</span>
    `;

    devLabelDiv.addEventListener("click", (e) => {
      e.stopPropagation();
      EventBus.emit("device:selected", { deviceId: device.id, device });
    });

    const devLabelObj = new CSS2DObject(devLabelDiv);
    devLabelObj.position.set(0, 0.24, 0);
    const shouldShow = (window.uiToggles ? window.uiToggles.devLabels : true) && (device.showLabel !== false);
    devLabelObj.visible = shouldShow;
    group.add(devLabelObj);

    group.userData = { isDevice: true, deviceId: device.id };
    this.scene.add(group);

    const proxy = {
      id: device.id,
      category: device.category,
      group,
      baseMesh,
      bulbMesh,
      ledMesh,
      pulseMesh,
      detectionConeMesh,
      labelElement: devLabelDiv,
      labelObject: devLabelObj,
      pulseAnimTime: 0
    };

    this.visuals.set(device.id, proxy);
    return proxy;
  }

  triggerPulseAnimation(deviceId) {
    const visual = this.visuals.get(deviceId);
    if (!visual) return;

    visual.pulseAnimTime = 1.0;
    if (visual.ledMesh) {
      visual.ledMesh.material.emissiveIntensity = 3.0;
      setTimeout(() => {
        if (visual.ledMesh) visual.ledMesh.material.emissiveIntensity = 0.8;
      }, 200);
    }
    if (visual.labelElement) {
      visual.labelElement.classList.remove("active-pulse");
      void visual.labelElement.offsetWidth;
      visual.labelElement.classList.add("active-pulse");
      setTimeout(() => {
        if (visual.labelElement) visual.labelElement.classList.remove("active-pulse");
      }, 900);
    }
  }

  updateDeviceLabel(deviceId, shortStatus) {
    const visual = this.visuals.get(deviceId);
    if (!visual || !visual.labelElement) return;
    const statusEl = visual.labelElement.querySelector(".dev-status");
    if (statusEl) {
      statusEl.textContent = shortStatus;
    }
  }

  spawnDataPacket(waypoints, protocol) {
    if (!window.uiToggles?.packets) return;
    if (this.dataPackets.length >= 6) return;

    const threePoints = waypoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
    const color = protocol === "zigbee" ? CONFIG.colors.zigbeeAmber : CONFIG.colors.wifiCyan;
    const geom = new THREE.SphereGeometry(0.08, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geom, mat);

    this.scene.add(mesh);
    this.dataPackets.push({
      mesh,
      waypoints: threePoints,
      segIndex: 0,
      progress: 0.0,
      speed: 5.0
    });
  }

  updateZigbeeMeshLines(devices) {
    if (this.meshLines) {
      this.scene.remove(this.meshLines);
      this.meshLines.geometry.dispose();
      this.meshLines = null;
    }

    if (!window.uiToggles?.mesh) return;

    const points = [];
    const zigbeeDevs = devices.filter(d => d.protocol === "zigbee" && d.status === "online");

    for (const dev of zigbeeDevs) {
      if (dev.parent) {
        const parent = devices.find(d => d.id === dev.parent);
        if (parent) {
          points.push(new THREE.Vector3(dev.pos.x, dev.pos.y, dev.pos.z));
          points.push(new THREE.Vector3(parent.pos.x, parent.pos.y, parent.pos.z));
        }
      }
    }

    if (points.length > 0) {
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: CONFIG.colors.zigbeeAmber,
        transparent: true,
        opacity: 0.45,
        linewidth: 1
      });
      this.meshLines = new THREE.LineSegments(geom, mat);
      this.scene.add(this.meshLines);
    }
  }

  update(deltaSec) {
    // 1. Anima pulsos de dispositivos
    for (const visual of this.visuals.values()) {
      if (visual.pulseAnimTime > 0) {
        visual.pulseAnimTime -= deltaSec * 2.0;
        if (visual.pulseMesh) {
          const scale = 1.0 + (1.0 - visual.pulseAnimTime) * 3.0;
          visual.pulseMesh.scale.set(scale, scale, scale);
          visual.pulseMesh.material.opacity = Math.max(0, visual.pulseAnimTime);
          visual.pulseMesh.visible = visual.pulseAnimTime > 0;
        }
      }
    }

    // 2. Anima pacotes de dados voando
    for (let i = this.dataPackets.length - 1; i >= 0; i--) {
      const p = this.dataPackets[i];
      const p1 = p.waypoints[p.segIndex];
      const p2 = p.waypoints[p.segIndex + 1];

      if (!p1 || !p2) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.dataPackets.splice(i, 1);
        continue;
      }

      const segDist = p1.distanceTo(p2);
      p.progress += (p.speed * deltaSec) / Math.max(0.1, segDist);

      if (p.progress >= 1.0) {
        p.segIndex++;
        p.progress = 0.0;
        if (p.segIndex >= p.waypoints.length - 1) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          this.dataPackets.splice(i, 1);
          continue;
        }
      } else {
        p.mesh.position.lerpVectors(p1, p2, p.progress);
      }
    }
  }
}
