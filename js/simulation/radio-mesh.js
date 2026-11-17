/**
 * ==============================================================================
 * RF RADIO PROPAGATION & ZIGBEE MESH TOPOLOGY
 * js/simulation/radio-mesh.js
 * 
 * Modelo log-distance de atenuação RF, LQI, perda de pacotes e rotas Dijkstra.
 * ISOLAMENTO: Proibido Three.js ou DOM. Waypoints são emitidos como {x, y, z}.
 * ==============================================================================
 */

import { CONFIG, HouseModel } from './config.js';

export class RadioModelClass {
  constructor() {
    this.hubPos = { x: 4.5, y: 1.0, z: 6.8 };
    this.routerPos = { x: 4.5, y: 1.0, z: 8.2 };
    this.cloudPos = { x: 4.5, y: 6.2, z: -2.5 };
  }

  calculateLink(pos1, pos2, protocol = "zigbee") {
    const d = Math.hypot(pos1.x - pos2.x, pos1.z - pos2.z);
    const walls = HouseModel.countWallIntersections(pos1.x, pos1.z, pos2.x, pos2.z);

    const rfConf = protocol === "zigbee" ? CONFIG.rf.zigbee : CONFIG.rf.wifi;
    let rssi = CONFIG.rf.p0 - 10.0 * rfConf.n * Math.log10(Math.max(d, 1.0)) - (walls * rfConf.w);

    if (typeof window !== "undefined" && window.FaultInjector && window.FaultInjector.rfInterference) {
      rssi -= 15.0;
    }

    const lqi = Math.round(
      Math.max(0, Math.min(255, ((rssi - rfConf.sens) / (CONFIG.rf.p0 - rfConf.sens)) * 255))
    );

    const margin = rssi - rfConf.sens;
    let lossProb = 1.0 / (1.0 + Math.exp(0.35 * (margin - 6.0)));

    if (typeof window !== "undefined" && window.FaultInjector) {
      lossProb += window.FaultInjector.globalPacketLoss;
    }
    lossProb = Math.max(0.0, Math.min(1.0, lossProb));

    return {
      distance: Number(d.toFixed(2)),
      walls,
      rssi: Number(rssi.toFixed(1)),
      lqi,
      lossProb,
      protocol
    };
  }

  simulateTransmission(lossProb) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (Math.random() >= lossProb) {
        return { success: true, attempts: attempt };
      }
    }
    return { success: false, attempts: 3 };
  }

  updateZigbeeMesh(devices) {
    const routers = devices.filter(d => (d.category === "wg2" || d.isRouter) && d.protocol === "zigbee" && d.status === "online");
    const hub = devices.find(d => d.category === "wg2");
    if (!hub) return;

    const adj = new Map();
    for (const r of routers) {
      adj.set(r.id, []);
    }

    for (let i = 0; i < routers.length; i++) {
      for (let j = i + 1; j < routers.length; j++) {
        const r1 = routers[i];
        const r2 = routers[j];
        const link = this.calculateLink(r1.pos, r2.pos, "zigbee");
        if (link.rssi >= CONFIG.rf.zigbee.sens) {
          const cost = 255.0 / Math.max(link.lqi, 1);
          adj.get(r1.id).push({ to: r2.id, cost, lqi: link.lqi, link });
          adj.get(r2.id).push({ to: r1.id, cost, lqi: link.lqi, link });
        }
      }
    }

    const dist = new Map();
    const prev = new Map();
    const unvisited = new Set(routers.map(r => r.id));

    for (const r of routers) {
      dist.set(r.id, Infinity);
    }
    dist.set(hub.id, 0);

    while (unvisited.size > 0) {
      let curr = null;
      let minD = Infinity;
      for (const id of unvisited) {
        if (dist.get(id) < minD) {
          minD = dist.get(id);
          curr = id;
        }
      }
      if (curr === null || minD === Infinity) break;
      unvisited.delete(curr);

      for (const edge of (adj.get(curr) || [])) {
        if (unvisited.has(edge.to)) {
          const alt = dist.get(curr) + edge.cost;
          if (alt < dist.get(edge.to)) {
            dist.set(edge.to, alt);
            prev.set(edge.to, curr);
          }
        }
      }
    }

    for (const dev of devices) {
      if (dev.protocol !== "zigbee") continue;
      if (dev.id === hub.id) {
        dev.parent = null;
        dev.hops = 0;
        dev.rssi = -40;
        dev.lqi = 255;
        continue;
      }

      if (dev.isRouter) {
        const parentId = prev.get(dev.id);
        dev.parent = parentId || hub.id;
        let hops = 0;
        let step = dev.id;
        while (step && step !== hub.id && hops < 10) {
          step = prev.get(step);
          hops++;
        }
        dev.hops = hops;
        const linkToParent = this.calculateLink(dev.pos, (devices.find(d => d.id === dev.parent) || hub).pos, "zigbee");
        dev.rssi = linkToParent.rssi;
        dev.lqi = linkToParent.lqi;
      } else {
        let bestRouter = hub;
        let bestLink = this.calculateLink(dev.pos, hub.pos, "zigbee");

        for (const r of routers) {
          const link = this.calculateLink(dev.pos, r.pos, "zigbee");
          if (link.lqi > bestLink.lqi) {
            bestLink = link;
            bestRouter = r;
          }
        }

        dev.parent = bestRouter.id;
        dev.hops = (bestRouter.hops || 0) + 1;
        dev.rssi = bestLink.rssi;
        dev.lqi = bestLink.lqi;
      }
    }
  }

  getPacketWaypoints(device, devices) {
    const points = [];
    points.push({ x: device.pos.x, y: device.pos.y, z: device.pos.z });

    if (device.protocol === "zigbee") {
      let curr = device;
      let safety = 0;
      while (curr && curr.parent && curr.category !== "wg2" && safety < 8) {
        const parentDev = devices.find(d => d.id === curr.parent);
        if (parentDev) {
          points.push({ x: parentDev.pos.x, y: parentDev.pos.y, z: parentDev.pos.z });
          curr = parentDev;
        } else {
          break;
        }
        safety++;
      }
      points.push({ x: this.hubPos.x, y: this.hubPos.y, z: this.hubPos.z });
      points.push({ x: this.routerPos.x, y: this.routerPos.y, z: this.routerPos.z });
    } else {
      points.push({ x: this.routerPos.x, y: this.routerPos.y, z: this.routerPos.z });
    }

    const midArc = {
      x: (this.routerPos.x + this.cloudPos.x) / 2.0,
      y: Math.max(this.routerPos.y, this.cloudPos.y) + 1.5,
      z: (this.routerPos.z + this.cloudPos.z) / 2.0
    };
    points.push(midArc);
    points.push({ x: this.cloudPos.x, y: this.cloudPos.y, z: this.cloudPos.z });

    return points;
  }
}

export const RadioModel = new RadioModelClass();
if (typeof window !== "undefined") {
  window.RadioModel = RadioModel;
}
