# part_js_radio.py - Modelo de Rádio RF, Malha Zigbee com Dijkstra e Wi-Fi
JS_RADIO = '''    /* ==========================================================================
       5. RADIOMODEL - PROPAGAÇÃO RF, ENLACES ZIGBEE/WI-FI E MALHA MULTI-SALTO
       ========================================================================== */
    class RadioModelClass {
      constructor() {
        this.hubPos = { x: 4.5, y: 1.0, z: 6.8 };
        this.routerPos = { x: 4.5, y: 1.0, z: 8.2 };
        this.cloudPos = { x: 4.5, y: 6.2, z: -2.5 };
      }

      // Calcula RSSI, LQI e Perda para um par de coordenadas 3D
      calculateLink(pos1, pos2, protocol = "zigbee") {
        const d = Math.hypot(pos1.x - pos2.x, pos1.z - pos2.z);
        const walls = HouseModel.countWallIntersections(pos1.x, pos1.z, pos2.x, pos2.z);

        const rfConf = protocol === "zigbee" ? CONFIG.rf.zigbee : CONFIG.rf.wifi;
        let rssi = CONFIG.rf.p0 - 10.0 * rfConf.n * Math.log10(Math.max(d, 1.0)) - (walls * rfConf.w);

        // Aplica interferência global se injetada
        if (typeof FaultInjector !== "undefined" && FaultInjector.rfInterference) {
          rssi -= 15.0; // Reduz em 15 dBm
        }

        // LQI mapeado de [Sensibilidade, P0] para [0, 255]
        const lqi = Math.round(
          Math.max(0, Math.min(255, ((rssi - rfConf.sens) / (CONFIG.rf.p0 - rfConf.sens)) * 255))
        );

        // Probabilidade de perda via curva sigmoide em função da margem de sensibilidade
        const margin = rssi - rfConf.sens;
        let lossProb = 1.0 / (1.0 + Math.exp(0.35 * (margin - 6.0)));

        if (typeof FaultInjector !== "undefined") {
          lossProb += FaultInjector.globalPacketLoss;
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

      // Simula transmissão com até 3 retentativas
      simulateTransmission(lossProb) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (Math.random() >= lossProb) {
            return { success: true, attempts: attempt };
          }
        }
        return { success: false, attempts: 3 };
      }

      // Calcula rotas da malha Zigbee para todos os dispositivos usando Dijkstra
      updateZigbeeMesh(devices) {
        const routers = devices.filter(d => (d.category === "wg2" || d.isRouter) && d.protocol === "zigbee" && d.status === "online");
        const hub = devices.find(d => d.category === "wg2");
        if (!hub) return;

        // 1. Grafo de Roteadores (Hub + Lâmpadas Zigbee)
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

        // Dijkstra a partir do Hub para encontrar o caminho mais curto de cada Router até o Hub
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

        // 2. Associa cada dispositivo Zigbee (End Device ou Router) ao melhor Pai
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
            // Roteador: pai é o próximo salto na rota para o Hub
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
            // End Device (sensores PIR, magnéticos): escolhe o roteador com maior LQI
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

      // Calcula os pontos 3D da trajetória de um pacote de dados
      getPacketWaypoints(device, devices) {
        const points = [];
        points.push(new THREE.Vector3(device.pos.x, device.pos.y, device.pos.z));

        if (device.protocol === "zigbee") {
          // Dispositivo -> Pai -> ... -> Hub
          let curr = device;
          let safety = 0;
          while (curr && curr.parent && curr.category !== "wg2" && safety < 8) {
            const parentDev = devices.find(d => d.id === curr.parent);
            if (parentDev) {
              points.push(new THREE.Vector3(parentDev.pos.x, parentDev.pos.y, parentDev.pos.z));
              curr = parentDev;
            } else {
              break;
            }
            safety++;
          }
          // Do Hub vai para o Roteador Wi-Fi (cabo Ethernet)
          points.push(new THREE.Vector3(this.hubPos.x, this.hubPos.y, this.hubPos.z));
          points.push(new THREE.Vector3(this.routerPos.x, this.routerPos.y, this.routerPos.z));
        } else {
          // Wi-Fi: Dispositivo direto para o Roteador
          points.push(new THREE.Vector3(this.routerPos.x, this.routerPos.y, this.routerPos.z));
        }

        // Do Roteador sobe para a Nuvem
        const midArc = new THREE.Vector3(
          (this.routerPos.x + this.cloudPos.x) / 2.0,
          Math.max(this.routerPos.y, this.cloudPos.y) + 1.5,
          (this.routerPos.z + this.cloudPos.z) / 2.0
        );
        points.push(midArc);
        points.push(new THREE.Vector3(this.cloudPos.x, this.cloudPos.y, this.cloudPos.z));

        return points;
      }
    }
    const RadioModel = new RadioModelClass();
'''
