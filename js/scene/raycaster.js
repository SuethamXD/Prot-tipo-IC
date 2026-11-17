/**
 * ==============================================================================
 * 3D RAYCASTER & INTERACTION CONTROLLER
 * js/scene/raycaster.js
 * 
 * Captura cliques do mouse no canvas 3D e emite eventos de seleção e movimentação.
 * ISOLAMENTO: Desacoplado do DOM da interface e de regras de negócio.
 * ==============================================================================
 */

import * as THREE from 'three';
import { EventBus } from '../contracts/event-bus.js';

export class RaycasterManager {
  constructor(camera, domElement, scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.initListeners();
  }

  initListeners() {
    this.domElement.addEventListener("pointerdown", (e) => this.onPointerDown(e));
  }

  onPointerDown(e) {
    if (e.button !== 0) return; // Apenas clique com botão esquerdo

    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length === 0) return;

    for (const hit of intersects) {
      let obj = hit.object;
      while (obj && obj !== this.scene) {
        if (obj.userData?.isDevice && obj.userData?.deviceId) {
          EventBus.emit("device:selected", { deviceId: obj.userData.deviceId });
          return;
        }
        if (obj.userData?.isFloor && obj.userData?.room) {
          EventBus.emit("floor:clicked", {
            room: obj.userData.room,
            point: { x: hit.point.x, y: hit.point.y, z: hit.point.z }
          });
          return;
        }
        obj = obj.parent;
      }
    }
  }
}
