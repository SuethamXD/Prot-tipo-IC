/**
 * ==============================================================================
 * 3D HOUSE BUILDER (PROCEDURAL GEOMETRY)
 * js/scene/house-builder.js
 * 
 * Criação procedural da casa: lajes, pisos, paredes, esquadrias, portas e móveis.
 * ISOLAMENTO: Camada estritamente 3D (Three.js). ZERO regras de negócio IoT.
 * ==============================================================================
 */

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONFIG, HouseModel } from '../simulation/config.js';

export class HouseBuilder {
  constructor(scene) {
    this.scene = scene;
    this.materials = {};
    this.wallMeshes = [];
    this.doorObjects = [];
    this.roomLabels = [];
    this.cloudMesh = null;
    this.currentWallMode = "cut";

    this.initMaterials();
  }

  initMaterials() {
    this.materials.slab = new THREE.MeshStandardMaterial({ color: CONFIG.colors.slab, roughness: 0.6 });
    this.materials.wall = new THREE.MeshStandardMaterial({ color: CONFIG.colors.walls, roughness: 0.4 });
    this.materials.door = new THREE.MeshStandardMaterial({ color: CONFIG.colors.doors, roughness: 0.3 });
    this.materials.frame = new THREE.MeshStandardMaterial({ color: CONFIG.colors.windowFrame, roughness: 0.7 });
    this.materials.glass = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.windowGlass,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1
    });
    this.materials.furniture = new THREE.MeshStandardMaterial({ color: CONFIG.colors.furniture, roughness: 0.5 });
    this.materials.wood = new THREE.MeshStandardMaterial({ color: 0x8C6239, roughness: 0.4 });
    this.materials.metal = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.7, roughness: 0.3 });
  }

  buildAll() {
    this.buildBaseSlab();
    this.buildFloors();
    this.buildWalls();
    this.buildDoorsAndWindows();
    this.buildFurniture();
    this.buildRoomLabels();
    this.buildFloatingCloud();
  }

  buildBaseSlab() {
    const w = CONFIG.house.widthX + CONFIG.house.slabPadding * 2;
    const d = CONFIG.house.depthZ + CONFIG.house.slabPadding * 2;
    const geom = new THREE.BoxGeometry(w, CONFIG.house.slabThickness, d);
    const mesh = new THREE.Mesh(geom, this.materials.slab);
    mesh.position.set(
      CONFIG.house.widthX / 2.0,
      -CONFIG.house.slabThickness / 2.0,
      CONFIG.house.depthZ / 2.0
    );
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  buildFloors() {
    for (const room of CONFIG.rooms) {
      const w = room.x2 - room.x1;
      const d = room.z2 - room.z1;
      const geom = new THREE.PlaneGeometry(w, d);
      const mat = new THREE.MeshStandardMaterial({ color: room.floor, roughness: 0.55 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(room.x1 + w / 2.0, 0.005, room.z1 + d / 2.0);
      mesh.receiveShadow = true;
      mesh.userData = { isFloor: true, room: room.name };
      this.scene.add(mesh);
    }
  }

  buildWalls() {
    const hFull = CONFIG.house.heightY;
    const thick = CONFIG.house.wallThickness;

    for (const seg of HouseModel.wallSegments) {
      const dx = seg.p2[0] - seg.p1[0];
      const dz = seg.p2[1] - seg.p1[1];
      const length = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);

      const isLowWall = (seg.p1[0] === 0 && seg.p1[1] >= 10.5 && seg.p2[1] === 14) ||
                        (seg.p1[1] === 14 && seg.p1[0] === 0 && seg.p2[0] <= 3.8);
      const height = isLowWall ? CONFIG.house.lowWallHeight : hFull;

      const geom = new THREE.BoxGeometry(thick, height, length);
      const mesh = new THREE.Mesh(geom, this.materials.wall.clone());
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const midX = (seg.p1[0] + seg.p2[0]) / 2.0;
      const midZ = (seg.p1[1] + seg.p2[1]) / 2.0;
      mesh.position.set(midX, height / 2.0, midZ);
      mesh.rotation.y = angle;

      mesh.userData = {
        isWall: true,
        origHeight: height,
        isLowWall
      };

      this.wallMeshes.push(mesh);
      this.scene.add(mesh);
    }

    this.applyWallMode("cut");
  }

  applyWallMode(mode) {
    this.currentWallMode = mode;
    const cutH = CONFIG.house.cutWallHeight;

    for (const wall of this.wallMeshes) {
      if (mode === "cut") {
        const h = wall.userData.isLowWall ? Math.min(wall.userData.origHeight, cutH) : cutH;
        wall.scale.y = h / wall.userData.origHeight;
        wall.position.y = h / 2.0;
        wall.material.transparent = false;
        wall.material.opacity = 1.0;
      } else if (mode === "transparent") {
        wall.scale.y = 1.0;
        wall.position.y = wall.userData.origHeight / 2.0;
        wall.material.transparent = true;
        wall.material.opacity = 0.25;
      } else {
        wall.scale.y = 1.0;
        wall.position.y = wall.userData.origHeight / 2.0;
        wall.material.transparent = false;
        wall.material.opacity = 1.0;
      }
    }

    const labelY = mode === "cut" ? 0.8 : 2.8;
    for (const l of this.roomLabels) {
      l.position.y = labelY;
    }
  }

  buildDoorsAndWindows() {
    for (const doorDef of HouseModel.doorDefs) {
      const doorGroup = new THREE.Group();
      doorGroup.position.set(doorDef.x, 0, doorDef.z);

      const panelW = doorDef.width;
      const panelH = 2.1;
      const panelGeom = new THREE.BoxGeometry(0.04, panelH, panelW);
      const panelMesh = new THREE.Mesh(panelGeom, this.materials.door);
      panelMesh.position.set(0, panelH / 2.0, panelW / 2.0);
      panelMesh.castShadow = true;
      doorGroup.add(panelMesh);

      this.scene.add(doorGroup);
      this.doorObjects.push({
        def: doorDef,
        group: doorGroup,
        panel: panelMesh,
        isOpen: false,
        targetOpen: false,
        currentAngle: 0
      });
    }

    for (const winDef of HouseModel.windowDefs) {
      const winGroup = new THREE.Group();
      winGroup.position.set(winDef.x, winDef.y, winDef.z);

      const frameGeom = new THREE.BoxGeometry(
        winDef.axis === "x" ? winDef.width : 0.08,
        1.1,
        winDef.axis === "z" ? winDef.width : 0.08
      );
      const frameMesh = new THREE.Mesh(frameGeom, this.materials.frame);
      winGroup.add(frameMesh);

      const glassGeom = new THREE.BoxGeometry(
        winDef.axis === "x" ? winDef.width - 0.1 : 0.02,
        0.95,
        winDef.axis === "z" ? winDef.width - 0.1 : 0.02
      );
      const glassMesh = new THREE.Mesh(glassGeom, this.materials.glass);
      winGroup.add(glassMesh);

      this.scene.add(winGroup);
    }
  }

  buildFurniture() {
    const addBox = (x, y, z, w, h, d, mat = this.materials.furniture) => {
      const geom = new THREE.BoxGeometry(w, h, d);
      const m = new THREE.Mesh(geom, mat);
      m.position.set(x, y + h / 2.0, z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      return m;
    };

    addBox(4.5, 0, 1.2, 1.6, 0.45, 1.9);
    addBox(4.5, 0.45, 0.5, 1.7, 0.4, 0.1, this.materials.wood);
    addBox(1.2, 0, 1.2, 0.9, 1.9, 0.6);
    addBox(7.8, 0, 1.2, 0.9, 1.9, 0.6);

    addBox(7.8, 0, 5.4, 1.4, 0.45, 1.9);
    addBox(6.4, 0, 4.2, 1.2, 0.75, 0.6, this.materials.wood);

    addBox(7.1, 0, 12.8, 1.6, 0.45, 1.9);
    addBox(8.2, 0, 11.2, 0.8, 1.9, 0.6);

    addBox(0.4, 0, 8.7, 0.6, 0.88, 2.2);
    addBox(0.4, 0.88, 9.4, 0.5, 0.05, 0.6, this.materials.metal);
    addBox(3.3, 0, 10.0, 0.7, 1.75, 0.75, this.materials.metal);

    addBox(0.6, 0, 4.2, 0.65, 0.88, 0.65, this.materials.metal);
    addBox(0.6, 0, 5.6, 0.6, 0.85, 0.6);

    addBox(8.2, 0, 8.3, 0.4, 0.45, 0.55);
    addBox(6.2, 0, 8.3, 0.5, 0.82, 0.5);
    addBox(7.6, 0, 9.3, 0.9, 1.9, 0.9, this.materials.glass);

    addBox(4.5, 0, 7.5, 0.45, 0.9, 1.6, this.materials.wood);

    const cableGeom = new THREE.CylinderGeometry(0.008, 0.008, 1.4, 8);
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const cableMesh = new THREE.Mesh(cableGeom, cableMat);
    cableMesh.rotation.x = Math.PI / 2;
    cableMesh.position.set(4.5, 0.92, 7.5);
    this.scene.add(cableMesh);
  }

  buildRoomLabels() {
    for (const room of CONFIG.rooms) {
      if (room.type === "outside") continue;
      const div = document.createElement("div");
      div.className = "room-label-pill";
      div.innerHTML = `<span class="title">${room.name}</span><span class="subtitle">${room.subtitle}</span>`;

      const label = new CSS2DObject(div);
      const midX = (room.x1 + room.x2) / 2.0;
      const midZ = (room.z1 + room.z2) / 2.0;
      label.position.set(midX, 0.8, midZ);
      this.scene.add(label);
      this.roomLabels.push(label);
    }
  }

  buildFloatingCloud() {
    const cloudGroup = new THREE.Group();
    cloudGroup.position.set(4.5, 6.2, -2.5);

    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4
    });

    const spheres = [
      { r: 0.8, x: 0, y: 0, z: 0 },
      { r: 0.65, x: -0.7, y: -0.1, z: 0 },
      { r: 0.65, x: 0.7, y: -0.1, z: 0 },
      { r: 0.5, x: -0.4, y: 0.4, z: 0.2 },
      { r: 0.55, x: 0.35, y: 0.35, z: -0.1 }
    ];

    for (const s of spheres) {
      const g = new THREE.SphereGeometry(s.r, 16, 16);
      const m = new THREE.Mesh(g, cloudMat);
      m.position.set(s.x, s.y, s.z);
      cloudGroup.add(m);
    }

    const cloudDiv = document.createElement("div");
    cloudDiv.className = "room-label-pill";
    cloudDiv.style.borderColor = "var(--accent-cyan)";
    cloudDiv.innerHTML = `<span class="title" style="color:var(--accent-cyan)">Nuvem Tuya</span><span class="subtitle">Mock Server</span>`;
    const cloudLabel = new CSS2DObject(cloudDiv);
    cloudLabel.position.set(0, 1.2, 0);
    cloudGroup.add(cloudLabel);

    this.cloudMesh = cloudGroup;
    this.scene.add(cloudGroup);
  }

  updateDoors(deltaSec) {
    for (const door of this.doorObjects) {
      const targetAngle = door.targetOpen ? (Math.PI / 2.1) : 0;
      door.currentAngle += (targetAngle - door.currentAngle) * (deltaSec * 6.0);
      door.panel.rotation.y = door.currentAngle;
      door.isOpen = Math.abs(door.currentAngle) > 0.15;
    }
  }

  updateCloud(time) {
    if (this.cloudMesh) {
      this.cloudMesh.position.y = 6.2 + Math.sin(time * 0.0015) * 0.15;
    }
  }
}
