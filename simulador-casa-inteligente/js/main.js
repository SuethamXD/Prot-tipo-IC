/**
 * ==============================================================================
 * SMART HOME IoT SIMULATOR 3D (TUYA + ZIGBEE 3.0)
 * Main Application Bundle (ES2022 Module)
 * Architecture:
 *   1. CONFIG & SYSTEM CLOCK (js/modules/config.js)
 *   2. RF RADIO PROPAGATION & ZIGBEE MESH (js/modules/radio.js)
 *   3. IOT DEVICES & SENSORS (js/modules/devices.js)
 *   4. CLOUD TUYA & TELEMETRY COLLECTOR (js/modules/cloud-collector.js)
 *   5. RESIDENT BEHAVIOR & AUTOMATION ENGINE (js/modules/resident-automation.js)
 *   6. DATASTORE & 3D THREE.JS SCENE (js/modules/datastore-scene.js)
 *   7. UI CONTROLLERS, CHARTS & INTERACTIVE TOUR (js/modules/ui-charts.js)
 *   8. APP INITIALIZATION & ANIMATION LOOP
 * ==============================================================================
 */

<!-- JAVASCRIPT PRINCIPAL (ES2022 MODULE) -->
  
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

    /* ==========================================================================
       1. OBJETO CONFIG - TODAS AS CONSTANTES E PARÂMETROS AJUSTÁVEIS
       ========================================================================== */
    const CONFIG = {
      version: "1.0.0",
      title: "Simulador 3D de Casa Inteligente (Tuya + Zigbee)",
      
      // Dimensões da Casa em Metros (Pé-direito 2.7m, paredes 0.15m)
      house: {
        widthX: 9.0,
        depthZ: 14.0,
        heightY: 2.7,
        wallThickness: 0.15,
        cutWallHeight: 0.4,
        lowWallHeight: 1.0,
        slabThickness: 0.25,
        slabPadding: 0.6
      },

      // Cores Oficiais e Estilos
      colors: {
        bgNavyTop: 0x1B2A5C,
        bgNavyBottom: 0x0F1838,
        slab: 0x3B5A8C,
        walls: 0xF2F3F5,
        doors: 0xD9A03A,
        windowFrame: 0x0B0F1A,
        windowGlass: 0x70A5D8,
        furniture: 0x8C9BB0,
        patioFloor: 0x374151,
        floorOchre: 0xD9A82E,
        floorLightGray: 0xC9CCD1,
        floorBluishGray: 0xA0B0C4,
        zigbeeAmber: 0xFFB020,
        wifiCyan: 0x22D3EE,
        hubMagenta: 0xE040FB,
        routerWhite: 0xFFFFFF
      },

      // Tabela Oficial de Cômodos (conforme planta baixa da imagem 1)
      rooms: [
        { id: "q3", name: "Quarto 3", subtitle: "Final do Corredor", x1: 0.0, x2: 9.0, z1: 0.0, z2: 3.5, floor: 0xD9A82E, type: "bedroom" },
        { id: "lav", name: "Lavanderia", subtitle: "Direita (Sem Corredor)", x1: 0.0, x2: 3.8, z1: 3.5, z2: 7.0, floor: 0xC9CCD1, type: "utility" },
        { id: "coz", name: "Cozinha", subtitle: "Direita (Meio)", x1: 0.0, x2: 3.8, z1: 7.0, z2: 10.5, floor: 0xC9CCD1, type: "kitchen" },
        { id: "corr", name: "Corredor Central", subtitle: "Entrada Direita", x1: 3.8, x2: 5.2, z1: 3.5, z2: 14.0, floor: 0xC9CCD1, type: "corridor" },
        { id: "q2", name: "Quarto 2", subtitle: "Esquerda (Fundo)", x1: 5.2, x2: 9.0, z1: 3.5, z2: 7.8, floor: 0xD9A82E, type: "bedroom" },
        { id: "wc", name: "Banheiro Social", subtitle: "Esquerda (Meio)", x1: 5.2, x2: 9.0, z1: 7.8, z2: 10.0, floor: 0xA0B0C4, type: "bathroom" },
        { id: "q1", name: "Quarto 1", subtitle: "Esquerda (Frente)", x1: 5.2, x2: 9.0, z1: 10.0, z2: 14.0, floor: 0xD9A82E, type: "bedroom" },
        { id: "patio", name: "Área Externa", subtitle: "Entrada Lateral", x1: 0.0, x2: 3.8, z1: 10.5, z2: 14.0, floor: 0x374151, type: "outside" }
      ],

      // Parâmetros de Rádio e Propagação RF
      rf: {
        p0: -40.0, // dBm a 1m
        zigbee: {
          n: 2.2,
          w: 4.0, // dB por parede
          sens: -95.0, // dBm
          hopLatencyMin: 15,
          hopLatencyMax: 60
        },
        wifi: {
          n: 2.7,
          w: 5.0, // dB por parede
          sens: -85.0, // dBm
          latencyMin: 30,
          latencyMax: 150,
          batteryReconnectMinMs: 300,
          batteryReconnectMaxMs: 3000
        },
        internetLatencyMedianMs: 120,
        hubBufferEnabled: true
      },

      // Nuvem Tuya Mock
      cloud: {
        dailyQuotaLimit: 100,
        logRetentionHours: 24,
        trialExpired: false
      },

      // Coletor Local
      collector: {
        pushEnabled: true,
        pollEnabled: true,
        pollIntervalSec: 10,
        localLanEnabled: true
      },

      // Simulação e Morador
      sim: {
        startDateTime: "2026-10-03T06:25:00",
        pirLockoutSec: 30,
        residentSpeedMps: 1.25
      }
    };

    /* ==========================================================================
       2. EVENTBUS - BARRAMENTO CENTRAL DE EVENTOS
       ========================================================================== */
    class EventBusClass {
      constructor() {
        this.listeners = new Map();
      }
      on(event, callback) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
      }
      off(event, callback) {
        if (!this.listeners.has(event)) return;
        const arr = this.listeners.get(event).filter(cb => cb !== callback);
        this.listeners.set(event, arr);
      }
      emit(event, data) {
        if (this.listeners.has(event)) {
          for (const cb of this.listeners.get(event)) {
            try {
              cb(data);
            } catch (err) {
              console.error(`Erro no listener do evento ${event}:`, err);
            }
          }
        }
      }
    }
    const EventBus = new EventBusClass();

    // Sistema Global Confiável de Notificações
    window._pendingNotifs = [];
    window.logNotification = function(category, message, type = "info") {
      if (window.UI && typeof window.UI.logNotification === "function") {
        window.UI.logNotification(category, message, type);
      } else {
        window._pendingNotifs.push({ category, message, type });
      }
    };

    /* ==========================================================================
       3. SIMCLOCK - RELÓGIO SIMULADO, CICLO DIA/NOITE E ILUMINAÇÃO
       ========================================================================== */
    class SimClockClass {
      constructor() {
        this.simTime = new Date(CONFIG.sim.startDateTime);
        this.speed = 10;
        this.paused = false;
        this.lastRealTimestamp = performance.now();
        this.externalLux = 500;
        this.sunAltitude = 0; // radianos
        this.dayPeriod = "dawn"; // dawn, day, sunset, night
      }

      setSpeed(speedMultiplier) {
        this.speed = Number(speedMultiplier);
        EventBus.emit("clock:speed_changed", this.speed);
      }

      togglePause() {
        this.paused = !this.paused;
        EventBus.emit("clock:pause_toggled", this.paused);
        return this.paused;
      }

      update() {
        const now = performance.now();
        const deltaRealSec = (now - this.lastRealTimestamp) / 1000.0;
        this.lastRealTimestamp = now;

        if (!this.paused && deltaRealSec > 0 && deltaRealSec < 2.0) {
          const deltaSimMs = deltaRealSec * this.speed * 1000.0;
          this.simTime = new Date(this.simTime.getTime() + deltaSimMs);
          this.computeSunAndLux();
          EventBus.emit("clock:tick", {
            simTime: this.simTime,
            deltaSimSec: deltaRealSec * this.speed,
            externalLux: this.externalLux,
            dayPeriod: this.dayPeriod
          });
        }
      }

      computeSunAndLux() {
        const hours = this.simTime.getHours() + this.simTime.getMinutes() / 60.0 + this.simTime.getSeconds() / 3600.0;
        
        // Curva solar aproximada (Nascer às 06:00, zênite às 12:00, pôr às 18:30)
        let sunElevation = Math.sin(((hours - 6.0) / 12.5) * Math.PI);
        if (hours < 5.8 || hours > 18.7) sunElevation = -0.3; // Noite

        this.sunAltitude = sunElevation;

        if (hours >= 5.5 && hours < 6.8) {
          this.dayPeriod = "dawn";
          this.externalLux = Math.max(10, Math.round(5000 * Math.max(0, sunElevation)));
        } else if (hours >= 6.8 && hours < 17.5) {
          this.dayPeriod = "day";
          this.externalLux = Math.round(15000 + 75000 * Math.max(0, sunElevation));
        } else if (hours >= 17.5 && hours < 19.0) {
          this.dayPeriod = "sunset";
          this.externalLux = Math.max(20, Math.round(8000 * Math.max(0, sunElevation)));
        } else {
          this.dayPeriod = "night";
          this.externalLux = 2; // luar / noite escura
        }
      }

      getFormattedSimTime() {
        const y = this.simTime.getFullYear();
        const m = String(this.simTime.getMonth() + 1).padStart(2, '0');
        const d = String(this.simTime.getDate()).padStart(2, '0');
        const hh = String(this.simTime.getHours()).padStart(2, '0');
        const mm = String(this.simTime.getMinutes()).padStart(2, '0');
        const ss = String(this.simTime.getSeconds()).padStart(2, '0');
        return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
      }

      getIsoString() {
        // Formato com fuso local simulado -03:00
        const pad = (n) => String(n).padStart(2, '0');
        const y = this.simTime.getFullYear();
        const m = pad(this.simTime.getMonth() + 1);
        const d = pad(this.simTime.getDate());
        const hh = pad(this.simTime.getHours());
        const mm = pad(this.simTime.getMinutes());
        const ss = pad(this.simTime.getSeconds());
        const ms = String(this.simTime.getMilliseconds()).padStart(3, '0');
        return `${y}-${m}-${d}T${hh}:${mm}:${ss}.${ms}-03:00`;
      }
    }
    const SimClock = new SimClockClass();

    /* ==========================================================================
       4. HOUSEMODEL - GEOMETRIA, PORTAS, JANELAS, MOBÍLIA E GRAFO DE NAVEGAÇÃO
       ========================================================================== */
    class HouseModelClass {
      constructor() {
        this.rooms = CONFIG.rooms;

        // Portas Interativas (painel fino laranja #D9A03A que gira ao abrir)
        this.doorDefs = [
          { id: "DOOR_ENTRANCE", name: "Entrada Principal", x: 4.5, z: 14.0, width: 0.9, axis: "x", roomA: "corr", roomB: "patio" },
          { id: "DOOR_Q3", name: "Porta Quarto 3", x: 4.5, z: 3.5, width: 0.9, axis: "x", roomA: "corr", roomB: "q3" },
          { id: "DOOR_Q2", name: "Porta Quarto 2", x: 5.2, z: 5.6, width: 0.8, axis: "z", roomA: "corr", roomB: "q2" },
          { id: "DOOR_WC", name: "Porta Banheiro", x: 5.2, z: 8.9, width: 0.7, axis: "z", roomA: "corr", roomB: "wc" },
          { id: "DOOR_Q1", name: "Porta Quarto 1", x: 5.2, z: 12.0, width: 0.8, axis: "z", roomA: "corr", roomB: "q1" },
          { id: "DOOR_COZ_CORR", name: "Porta Cozinha/Corredor", x: 3.8, z: 8.7, width: 0.8, axis: "z", roomA: "corr", roomB: "coz" },
          // Lavanderia NÃO tem acesso pelo corredor; apenas pela Cozinha:
          { id: "DOOR_LAV_COZ", name: "Porta Lavanderia/Cozinha", x: 1.6, z: 7.0, width: 0.8, axis: "x", roomA: "coz", roomB: "lav" }
        ];

        // Janelas com moldura preta e vidro translúcido
        this.windowDefs = [
          { id: "WIN_Q3", name: "Janela Q3 Norte", x: 4.5, y: 1.5, z: 0.0, width: 1.8, axis: "x", room: "Quarto 3" },
          { id: "WIN_LAV", name: "Janela Lavanderia Oeste", x: 0.0, y: 1.5, z: 5.0, width: 1.2, axis: "z", room: "Lavanderia" },
          { id: "WIN_COZ", name: "Janela Cozinha Oeste", x: 0.0, y: 1.5, z: 8.8, width: 1.4, axis: "z", room: "Cozinha" },
          { id: "WIN_Q2", name: "Janela Q2 Leste", x: 9.0, y: 1.5, z: 5.6, width: 1.6, axis: "z", room: "Quarto 2" },
          { id: "WIN_WC", name: "Janela Banheiro Leste (Pequena)", x: 9.0, y: 1.8, z: 8.9, width: 0.8, axis: "z", room: "Banheiro Social" },
          { id: "WIN_Q1", name: "Janela Q1 Leste", x: 9.0, y: 1.5, z: 12.2, width: 1.6, axis: "z", room: "Quarto 1" }
        ];

        // Segmentos 2D de paredes para cálculo exato de atenuação de RF
        this.wallSegments = [
          // Perímetro externo da casa principal
          { p1: [0.0, 0.0], p2: [9.0, 0.0] },      // Parede Norte (Quarto 3)
          { p1: [9.0, 0.0], p2: [9.0, 14.0] },     // Parede Leste (Q3, Q2, WC, Q1)
          { p1: [3.8, 14.0], p2: [9.0, 14.0] },    // Parede Sul (Frente / Entrada)
          { p1: [0.0, 0.0], p2: [0.0, 10.5] },     // Parede Oeste (Q3, Lavanderia, Cozinha)
          
          // Muro baixo da área externa (1m)
          { p1: [0.0, 10.5], p2: [0.0, 14.0] },    // Muro Oeste Pátio
          { p1: [0.0, 14.0], p2: [3.8, 14.0] },    // Muro Sul Pátio

          // Paredes divisórias internas
          { p1: [0.0, 3.5], p2: [9.0, 3.5] },      // Divisão Quarto 3 com Lavanderia, Corredor e Quarto 2
          { p1: [0.0, 7.0], p2: [3.8, 7.0] },      // Divisão Lavanderia e Cozinha
          { p1: [0.0, 10.5], p2: [3.8, 10.5] },    // Divisão Cozinha e Área Externa
          
          // Paredes do Corredor Central
          { p1: [3.8, 3.5], p2: [3.8, 10.5] },    // Corredor lado Oeste (Lavanderia e Cozinha)
          { p1: [5.2, 3.5], p2: [5.2, 14.0] },    // Corredor lado Leste (Q2, WC, Q1)

          // Divisórias dos cômodos lado Leste
          { p1: [5.2, 7.8], p2: [9.0, 7.8] },      // Divisão Quarto 2 e Banheiro
          { p1: [5.2, 10.0], p2: [9.0, 10.0] }     // Divisão Banheiro e Quarto 1
        ];

        // Grafo de Navegação para Morador Virtual (centros de cômodos, portas e pontos de interesse)
        this.navNodes = {
          "Q3_CENTER": { x: 4.5, z: 1.7, room: "Quarto 3" },
          "Q3_BED": { x: 4.5, z: 0.9, room: "Quarto 3" },
          "LAV_CENTER": { x: 1.9, z: 5.2, room: "Lavanderia" },
          "LAV_MACHINE": { x: 0.8, z: 4.2, room: "Lavanderia" },
          "COZ_CENTER": { x: 1.9, z: 8.7, room: "Cozinha" },
          "COZ_FRIDGE": { x: 2.8, z: 9.8, room: "Cozinha" },
          "CORR_NORTH": { x: 4.5, z: 4.5, room: "Corredor Central" },
          "CORR_MID": { x: 4.5, z: 7.5, room: "Corredor Central" },
          "CORR_SOUTH": { x: 4.5, z: 12.0, room: "Corredor Central" },
          "PATIO_OUT": { x: 4.5, z: 15.2, room: "Área Externa" },
          "Q2_CENTER": { x: 7.1, z: 5.6, room: "Quarto 2" },
          "Q2_DESK": { x: 6.6, z: 4.2, room: "Quarto 2" },
          "WC_CENTER": { x: 7.1, z: 8.9, room: "Banheiro Social" },
          "Q1_CENTER": { x: 7.1, z: 12.0, room: "Quarto 1" },
          "Q1_BED": { x: 7.1, z: 13.0, room: "Quarto 1" },

          // Nós nas portas físicas (pontos de transição)
          "DOOR_Q3_NODE": { x: 4.5, z: 3.5, room: "Quarto 3", doorId: "DOOR_Q3" },
          "DOOR_LAV_NODE": { x: 1.6, z: 7.0, room: "Cozinha", doorId: "DOOR_LAV_COZ" },
          "DOOR_COZ_NODE": { x: 3.8, z: 8.7, room: "Corredor Central", doorId: "DOOR_COZ_CORR" },
          "DOOR_Q2_NODE": { x: 5.2, z: 5.6, room: "Corredor Central", doorId: "DOOR_Q2" },
          "DOOR_WC_NODE": { x: 5.2, z: 8.9, room: "Corredor Central", doorId: "DOOR_WC" },
          "DOOR_Q1_NODE": { x: 5.2, z: 12.0, room: "Corredor Central", doorId: "DOOR_Q1" },
          "DOOR_ENT_NODE": { x: 4.5, z: 14.0, room: "Corredor Central", doorId: "DOOR_ENTRANCE" }
        };

        // Arestas bidirecionais respeitando rigorosamente a arquitetura da casa
        // (A Lavanderia conecta-se APENAS à Cozinha, NUNCA diretamente ao Corredor!)
        this.navEdges = [
          ["Q3_BED", "Q3_CENTER"],
          ["Q3_CENTER", "DOOR_Q3_NODE"],
          ["DOOR_Q3_NODE", "CORR_NORTH"],
          
          ["LAV_MACHINE", "LAV_CENTER"],
          ["LAV_CENTER", "DOOR_LAV_NODE"],
          ["DOOR_LAV_NODE", "COZ_CENTER"],
          
          ["COZ_FRIDGE", "COZ_CENTER"],
          ["COZ_CENTER", "DOOR_COZ_NODE"],
          ["DOOR_COZ_NODE", "CORR_MID"],

          ["CORR_NORTH", "CORR_MID"],
          ["CORR_MID", "CORR_SOUTH"],
          ["CORR_SOUTH", "DOOR_ENT_NODE"],
          ["DOOR_ENT_NODE", "PATIO_OUT"],

          ["CORR_NORTH", "DOOR_Q2_NODE"],
          ["DOOR_Q2_NODE", "Q2_CENTER"],
          ["Q2_CENTER", "Q2_DESK"],

          ["CORR_MID", "DOOR_WC_NODE"],
          ["DOOR_WC_NODE", "WC_CENTER"],

          ["CORR_SOUTH", "DOOR_Q1_NODE"],
          ["DOOR_Q1_NODE", "Q1_CENTER"],
          ["Q1_CENTER", "Q1_BED"]
        ];

        this.buildNavGraph();
      }

      buildNavGraph() {
        this.graph = new Map();
        for (const nodeId in this.navNodes) {
          this.graph.set(nodeId, []);
        }
        for (const [u, v] of this.navEdges) {
          const nodeU = this.navNodes[u];
          const nodeV = this.navNodes[v];
          const dist = Math.hypot(nodeU.x - nodeV.x, nodeU.z - nodeV.z);
          this.graph.get(u).push({ to: v, cost: dist });
          this.graph.get(v).push({ to: u, cost: dist });
        }
      }

      // Algoritmo de Dijkstra para Caminho Mínimo
      findShortestPath(startNodeId, endNodeId) {
        if (!this.graph.has(startNodeId) || !this.graph.has(endNodeId)) return [];
        if (startNodeId === endNodeId) return [startNodeId];

        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set(this.graph.keys());

        for (const node of this.graph.keys()) {
          distances.set(node, Infinity);
        }
        distances.set(startNodeId, 0);

        while (unvisited.size > 0) {
          let current = null;
          let minDistance = Infinity;

          for (const node of unvisited) {
            const d = distances.get(node);
            if (d < minDistance) {
              minDistance = d;
              current = node;
            }
          }

          if (current === null || minDistance === Infinity) break;
          if (current === endNodeId) break;

          unvisited.delete(current);

          for (const edge of this.graph.get(current)) {
            if (unvisited.has(edge.to)) {
              const alt = distances.get(current) + edge.cost;
              if (alt < distances.get(edge.to)) {
                distances.set(edge.to, alt);
                previous.set(edge.to, current);
              }
            }
          }
        }

        const path = [];
        let curr = endNodeId;
        while (curr !== undefined) {
          path.unshift(curr);
          curr = previous.get(curr);
        }
        return path[0] === startNodeId ? path : [];
      }

      getClosestNode(x, z) {
        let closest = null;
        let minD = Infinity;
        for (const [nodeId, n] of Object.entries(this.navNodes)) {
          const d = Math.hypot(n.x - x, n.z - z);
          if (d < minD) {
            minD = d;
            closest = nodeId;
          }
        }
        return closest;
      }

      getRoomAt(x, z) {
        for (const room of this.rooms) {
          if (x >= room.x1 && x <= room.x2 && z >= room.z1 && z <= room.z2) {
            return room.name;
          }
        }
        return "Área Externa";
      }

      // Teste de interseção 2D exato entre dois pontos para contagem de paredes
      countWallIntersections(x1, z1, x2, z2) {
        let count = 0;
        const lineIntersects = (a, b, c, d, p, q, r, s) => {
          const det = (c - a) * (s - q) - (r - p) * (d - b);
          if (det === 0) return false;
          const lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
          const gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
          return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
        };

        for (const seg of this.wallSegments) {
          if (lineIntersects(x1, z1, x2, z2, seg.p1[0], seg.p1[1], seg.p2[0], seg.p2[1])) {
            count++;
          }
        }
        return count;
      }
    }
    const HouseModel = new HouseModelClass();

/* ==========================================================================
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

/* ==========================================================================
       6. DEVICE E SUBCLASSES - MODELOS POLIMÓRFICOS DE DISPOSITIVOS IOT
       ========================================================================== */
    class Device {
      constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.category = config.category;
        this.protocol = config.protocol; // "zigbee" ou "wifi"
        this.pos = { x: config.pos.x, y: config.pos.y, z: config.pos.z };
        this.room = config.room;
        this.status = config.status || "online";
        this.battery = config.battery !== undefined ? config.battery : 100;
        this.isRouter = !!config.isRouter;
        this.rotY = config.rotY || 0;
        this.hasBattery = config.hasBattery !== undefined ? config.hasBattery : false;

        this.parent = null;
        this.hops = 0;
        this.rssi = -50;
        this.lqi = 200;

        // Armazenamento de DataPoints (DPs)
        this.dps = new Map();
        this.dpsHistory = [];

        // Referências visuais 3D
        this.meshGroup = null;
        this.ledMesh = null;
        this.pulseMesh = null;
        this.pulseAnimTime = 0;
        this.labelObject = null;
        this.labelElement = null;
        this.showLabel = true;
      }

      getShortStatus() {
        if (this.status === "offline") return "OFF";
        return "OK";
      }

      updateLabel() {
        if (!this.labelElement) return;
        const statusEl = this.labelElement.querySelector(".dev-status");
        if (statusEl) {
          statusEl.textContent = this.getShortStatus();
        }
      }

      setDP(code, value, silent = false) {
        const oldVal = this.dps.get(code);
        if (oldVal === value && !silent) return;
        this.dps.set(code, value);
        this.updateLabel();

        if (!silent) {
          this.emitEvent(code, value);
        }
      }

      getDP(code) {
        return this.dps.get(code);
      }

      drainBattery(amount) {
        if (!this.hasBattery) return;
        this.battery = Math.max(0, Number((this.battery - amount).toFixed(2)));
        this.dps.set("battery_percentage", Math.round(this.battery));
        if (this.battery <= 0) {
          this.status = "offline";
          this.updateLabel();
          EventBus.emit("device:status_changed", { device: this, status: "offline", reason: "battery_empty" });
        }
      }

      toggleOffline() {
        this.status = this.status === "online" ? "offline" : "online";
        this.updateLabel();
        EventBus.emit("device:status_changed", { device: this, status: this.status, reason: "manual_toggle" });
      }

      switchProtocol() {
        if (this.category === "wg2" || this.category === "router") return;
        this.protocol = this.protocol === "zigbee" ? "wifi" : "zigbee";
        EventBus.emit("device:protocol_changed", { device: this, protocol: this.protocol });
      }

      triggerVisualPulse() {
        this.pulseAnimTime = 1.0; // Inicia animação de pulso
        if (this.ledMesh) {
          this.ledMesh.material.emissiveIntensity = 3.0;
          setTimeout(() => {
            if (this.ledMesh) this.ledMesh.material.emissiveIntensity = 0.8;
          }, 200);
        }
        if (this.labelElement) {
          this.labelElement.classList.remove("active-pulse");
          void this.labelElement.offsetWidth;
          this.labelElement.classList.add("active-pulse");
          setTimeout(() => {
            if (this.labelElement) this.labelElement.classList.remove("active-pulse");
          }, 900);
        }
      }

      emitEvent(dpCode, value) {
        if (this.status !== "online") return;

        // Drena bateria por evento de envio de rádio
        if (this.hasBattery) {
          const drain = this.protocol === "wifi" ? 0.015 : 0.002;
          this.drainBattery(drain);
        }

        this.triggerVisualPulse();

        const eventData = {
          device_id: this.id,
          device_name: this.name,
          room: this.room,
          type: this.category,
          protocol: this.protocol,
          dp_code: dpCode,
          value: value,
          battery: this.hasBattery ? Math.round(this.battery) : 100,
          rssi: this.rssi,
          lqi: this.lqi,
          hops: this.hops,
          pos: { ...this.pos }
        };

        EventBus.emit("device:event_emitted", eventData);
      }

      forceEvent() {
        // Implementado nas subclasses
      }

      update(deltaSec) {
        if (this.pulseAnimTime > 0) {
          this.pulseAnimTime -= deltaSec * 2.0;
          if (this.pulseMesh) {
            const scale = 1.0 + (1.0 - this.pulseAnimTime) * 3.0;
            this.pulseMesh.scale.set(scale, scale, scale);
            this.pulseMesh.material.opacity = Math.max(0, this.pulseAnimTime);
            this.pulseMesh.visible = this.pulseAnimTime > 0;
          }
        }
      }
    }

    // SENSOR DE MOVIMENTO PIR
    class PirSensor extends Device {
      constructor(config) {
        super({ ...config, hasBattery: true });
        this.lockoutRemaining = 0;
        this.lockoutDuration = CONFIG.sim.pirLockoutSec;
        this.detectionConeMesh = null;
        this.setDP("pir", "none", true);
        this.setDP("battery_percentage", 100, true);
        this.setDP("bright_value", 400, true);
      }

      triggerDetection(currentRoomLux = 400) {
        if (this.status !== "online") return;
        this.setDP("bright_value", Math.round(currentRoomLux), true);
        if (this.lockoutRemaining <= 0) {
          this.setDP("pir", "pir");
          this.lockoutRemaining = this.lockoutDuration;
          EventBus.emit("pir:triggered", { device: this, room: this.room });
          window.logNotification("automation", `Detecção de presença em [${this.room}] via ${this.id}`);
        }
      }

      checkDetection(activeRoom, currentRoomLux = 400) {
        if (this.status !== "online") return;
        if (activeRoom === this.room) {
          this.triggerDetection(currentRoomLux);
        }
      }

      update(deltaSimSec) {
        super.update(deltaSimSec);
        if (this.lockoutRemaining > 0) {
          this.lockoutRemaining -= deltaSimSec;
          if (this.lockoutRemaining <= 0) {
            this.lockoutRemaining = 0;
            this.setDP("pir", "none");
          }
        }
      }

      forceEvent() {
        const next = this.getDP("pir") === "pir" ? "none" : "pir";
        this.setDP("pir", next);
        if (next === "pir") {
          EventBus.emit("pir:triggered", { device: this, room: this.room });
          window.logNotification("automation", `Presença forçada manualmente em [${this.room}] (${this.id})`);
        }
      }

      getShortStatus() {
        if (this.status === "offline") return "OFF";
        return this.getDP("pir") === "pir" ? "MOV" : "ok";
      }
    }

    // SENSOR DE ABERTURA MAGNÉTICO
    class ContactSensor extends Device {
      constructor(config) {
        super({ ...config, hasBattery: true });
        this.doorId = config.doorId || null;
        this.windowId = config.windowId || null;
        this.setDP("doorcontact_state", "closed", true);
        this.setDP("battery_percentage", 100, true);
      }

      setOpen(isOpen) {
        const stateStr = isOpen ? "open" : "closed";
        if (this.getDP("doorcontact_state") !== stateStr) {
          this.setDP("doorcontact_state", stateStr);
          window.logNotification("system", `Sensor [${this.id}] (${this.name}): ${isOpen ? 'ABERTO' : 'FECHADO'}`);
        }
      }

      forceEvent() {
        const cur = this.getDP("doorcontact_state") === "open";
        this.setOpen(!cur);
      }

      getShortStatus() {
        if (this.status === "offline") return "OFF";
        return this.getDP("doorcontact_state") === "open" ? "ABERTA" : "fechada";
      }
    }

    // TOMADA INTELIGENTE COM MEDIDOR
    class SmartPlug extends Device {
      constructor(config) {
        super({ ...config, hasBattery: false });
        this.hasMeter = config.hasMeter !== undefined ? config.hasMeter : true;
        this.profile = config.profile || "generic"; // fridge, washer, tv, pc, fan, generic
        this.cycleTimer = 0;
        this.addEle = 0.0; // kWh acumulado
        this.setDP("switch_1", true, true);
        this.setDP("cur_voltage", 127.0, true);
        this.setDP("cur_power", 0.0, true);
        this.setDP("cur_current", 0, true);
        this.setDP("add_ele", 0.0, true);
      }

      updatePower(deltaSimSec, residentRoom) {
        if (this.status !== "online" || !this.getDP("switch_1")) {
          if (this.getDP("cur_power") > 0) {
            this.setDP("cur_power", 0.0);
            this.setDP("cur_current", 0);
          }
          return;
        }

        this.cycleTimer += deltaSimSec;
        let powerW = 0.0;
        const inSameRoom = residentRoom === this.room;

        switch (this.profile) {
          case "fridge":
            // Geladeira: compressor liga 40% do tempo (~120W) e standby (~2W)
            const cyclePhase = (this.cycleTimer % 600) / 600.0;
            powerW = cyclePhase < 0.4 ? 115.0 + Math.sin(this.cycleTimer * 0.1) * 8.0 : 2.2;
            break;
          case "washer":
            // Lavadora: opera em ciclos de alta potência se morador estiver usando
            powerW = inSameRoom ? 380.0 + Math.sin(this.cycleTimer * 0.5) * 60.0 : 1.5;
            break;
          case "tv":
            // TV: ligada quando morador está no Quarto 3
            powerW = inSameRoom ? 95.0 + Math.random() * 10.0 : 0.8;
            break;
          case "pc":
            // Computador: ativo com morador no Quarto 2
            powerW = inSameRoom ? 175.0 + Math.random() * 25.0 : 3.5;
            break;
          case "fan":
            // Ventilador: ligado em repouso
            powerW = inSameRoom ? 45.0 : 0.0;
            break;
          default:
            powerW = 10.0;
            break;
        }

        if (this.hasMeter) {
          const oldP = this.getDP("cur_power");
          // Emite evento se variar significativamente ou periodicamente
          if (Math.abs(powerW - oldP) > 5.0 || Math.floor(this.cycleTimer / 30) !== Math.floor((this.cycleTimer - deltaSimSec) / 30)) {
            const v = 127.0 + (Math.random() - 0.5) * 2.0;
            const currentMa = Math.round((powerW / v) * 1000);
            this.addEle += (powerW * (deltaSimSec / 3600.0)) / 1000.0;

            this.setDP("cur_voltage", Number(v.toFixed(1)), true);
            this.setDP("cur_current", currentMa, true);
            this.setDP("add_ele", Number(this.addEle.toFixed(3)), true);
            this.setDP("cur_power", Number(powerW.toFixed(1)));
          }
        }
      }

      forceEvent() {
        const cur = this.getDP("switch_1");
        this.setDP("switch_1", !cur);
      }

      getShortStatus() {
        if (this.status === "offline") return "OFF";
        if (!this.getDP("switch_1")) return "OFF";
        return this.hasMeter ? `${Math.round(this.getDP("cur_power") || 0)}W` : "ON";
      }
    }

    // LÂMPADA INTELIGENTE (ROUTER ZIGBEE OU WI-FI)
    class SmartBulb extends Device {
      constructor(config) {
        super({ ...config, hasBattery: false, isRouter: config.protocol === "zigbee" });
        this.setDP("switch_led", false, true);
        this.setDP("work_mode", "white", true);
        this.setDP("bright_value_v2", 800, true);
        this.setDP("temp_value_v2", 500, true);
      }

      setOn(isOn) {
        if (this.getDP("switch_led") !== isOn) {
          this.setDP("switch_led", isOn);
        }
      }

      forceEvent() {
        this.setOn(!this.getDP("switch_led"));
      }

      getShortStatus() {
        if (this.status === "offline") return "OFF";
        return this.getDP("switch_led") ? "LIGADA" : "DESL";
      }
    }

    // CÂMERA WI-FI COM DETECÇÃO DE PESSOAS
    class Camera extends Device {
      constructor(config) {
        super({ ...config, hasBattery: false });
        this.fovConeMesh = null;
        this.setDP("person_detected", false, true);
      }

      checkDetection(activeRoom) {
        if (this.status !== "online") return;
        const detected = activeRoom === this.room;
        if (this.getDP("person_detected") !== detected) {
          this.setDP("person_detected", detected);
          if (detected) {
            window.logNotification("automation", `Câmera [${this.id}] detectou presença em [${this.room}]`);
          }
        }
      }

      forceEvent() {
        const next = !this.getDP("person_detected");
        this.setDP("person_detected", next);
        window.logNotification("automation", `Câmera [${this.id}] ${next ? 'detectou presença' : 'em repouso'}`);
      }

      getShortStatus() {
        if (this.status === "offline") return "OFF";
        return this.getDP("person_detected") ? "PESSOA" : (this.getDP("motion_tracking") ? "REC" : "STBY");
      }
    }

    // MOTOR DE CORTINA INTELIGENTE
    class CurtainMotor extends Device {
      constructor(config) {
        super({ ...config, hasBattery: false });
        this.windowId = config.windowId || null;
        this.percent = 0; // 0 = fechada, 100 = aberta
        this.targetPercent = 0;
        this.curtainMesh = null;
        this.setDP("control", "stop", true);
        this.setDP("percent_control", 0, true);
        this.setDP("percent_state", 0, true);
      }

      setTarget(percent) {
        this.targetPercent = Math.max(0, Math.min(100, percent));
        this.setDP("percent_control", this.targetPercent);
      }

      update(deltaSec) {
        super.update(deltaSec);
        if (this.percent !== this.targetPercent) {
          const step = deltaSec * 30.0;
          if (Math.abs(this.targetPercent - this.percent) <= step) {
            this.percent = this.targetPercent;
            this.setDP("percent_state", Math.round(this.percent));
            this.setDP("control", "stop");
          } else {
            this.percent += Math.sign(this.targetPercent - this.percent) * step;
            this.setDP("percent_state", Math.round(this.percent), true);
          }
        }
      }

      forceEvent() {
        const next = this.percent > 50 ? 0 : 100;
        this.setTarget(next);
      }

      getShortStatus() {
        if (this.status === "offline") return "OFF";
        const p = this.getDP("percent_control");
        return p === 0 ? "0%" : `${p}%`;
      }
    }

    // HUB ZIGBEE 3.0 (COORDENADOR wg2)
    class ZigbeeHub extends Device {
      constructor(config) {
        super({ ...config, hasBattery: false, isRouter: true });
        this.bufferQueue = [];
        this.setDP("online", true, true);
      }

      enqueueBuffer(packet) {
        this.bufferQueue.push(packet);
        EventBus.emit("hub:buffer_updated", this.bufferQueue.length);
      }

      flushBuffer() {
        const flushed = [...this.bufferQueue];
        this.bufferQueue = [];
        EventBus.emit("hub:buffer_updated", 0);
        return flushed;
      }

      getShortStatus() {
        return "HUB";
      }
    }

    // ROTEADOR WI-FI
    class WifiRouter extends Device {
      constructor(config) {
        super({ ...config, hasBattery: false, isRouter: false });
        this.setDP("online", true, true);
      }

      getShortStatus() {
        return "WAN";
      }
    }

/* ==========================================================================
       7. CLOUDMOCK - NUVEM TUYA SIMULADA, MESSAGE SERVICE E API REST COM COTA
       ========================================================================== */
    class CloudMockClass {
      constructor() {
        this.deviceRegistry = new Map();
        this.deviceLogs = new Map(); // id -> array de logs com timestamp
        this.dailyQuotaUsed = 0;
        this.dailyQuotaLimit = CONFIG.cloud.dailyQuotaLimit;
        this.logRetentionHours = CONFIG.cloud.logRetentionHours;
        this.trialExpired = false;
        this.productKeys = {
          pir: "pk_pir_zigbee_v2",
          mcs: "pk_door_sensor_tuya",
          cz: "pk_smart_plug_meter",
          dj: "pk_rgb_bulb_cct",
          sp: "pk_smart_camera_1080p",
          cl: "pk_curtain_motor",
          wg2: "pk_gateway_zigbee3"
        };
      }

      registerDevice(device) {
        this.deviceRegistry.set(device.id, {
          devId: `bf${Math.abs(device.id.split('').reduce((a,b)=>((a<<5)-a)+b.charCodeAt(0),0)).toString(16).padStart(16, '0')}`,
          name: device.name,
          category: device.category,
          productKey: this.productKeys[device.category] || "pk_generic_device",
          status: device.status,
          currentDPs: new Map()
        });
        this.deviceLogs.set(device.id, []);
      }

      // Recebe evento enviado do Roteador/Hub via WAN
      receiveFromDevice(eventData, callback) {
        if (typeof FaultInjector !== "undefined" && FaultInjector.internetDown) {
          // Internet caída: nuvem inalcançável!
          return { delivered: false, reason: "internet_down" };
        }

        if (this.trialExpired || (typeof FaultInjector !== "undefined" && FaultInjector.trialExpired)) {
          return { delivered: false, reason: "trial_expired" };
        }

        // Calcula latência WAN lognormal (mediana 120ms)
        let wanLatency = Math.round(120 * Math.exp((Math.random() - 0.5) * 0.4));
        if (typeof FaultInjector !== "undefined" && FaultInjector.cloudLatencySpike) {
          wanLatency += 2000;
        }

        const simIso = SimClock.getIsoString();
        const record = {
          ts_cloud: simIso,
          device_id: eventData.device_id,
          dp_code: eventData.dp_code,
          value: eventData.value
        };

        // Atualiza estado do dispositivo na nuvem
        const devMeta = this.deviceRegistry.get(eventData.device_id);
        if (devMeta) {
          devMeta.currentDPs.set(eventData.dp_code, eventData.value);
        }

        // Armazena no log com retenção
        const logs = this.deviceLogs.get(eventData.device_id) || [];
        logs.push(record);
        this.pruneOldLogs(eventData.device_id);

        // Dispara mensagem push (Tuya Message Service)
        const pushPayload = {
          devId: devMeta ? devMeta.devId : eventData.device_id,
          productKey: devMeta ? devMeta.productKey : "pk_tuya_sim",
          dataId: `msg_${Date.now()}_${Math.floor(Math.random()*1000)}`,
          status: [
            {
              code: eventData.dp_code,
              t: Math.floor(SimClock.simTime.getTime() / 1000),
              value: eventData.value
            }
          ]
        };

        EventBus.emit("cloud:push_emitted", {
          payload: pushPayload,
          eventData,
          wanLatency
        });

        return { delivered: true, wanLatency, pushPayload };
      }

      pruneOldLogs(deviceId) {
        const logs = this.deviceLogs.get(deviceId);
        if (!logs || logs.length === 0) return;
        const cutoffTime = SimClock.simTime.getTime() - (this.logRetentionHours * 3600 * 1000);
        this.deviceLogs.set(deviceId, logs.filter(l => new Date(l.ts_cloud).getTime() >= cutoffTime));
      }

      // API REST Simulada
      callRestApi(endpoint, deviceId) {
        if (this.trialExpired || (typeof FaultInjector !== "undefined" && FaultInjector.trialExpired)) {
          return {
            status: 403,
            message: "Subscription Expired: Please renew your Tuya Developer Platform license.",
            data: null
          };
        }

        if (this.dailyQuotaUsed >= this.dailyQuotaLimit) {
          return {
            status: 429,
            message: "Too Many Requests: Daily Tuya API Quota Exceeded (HTTP 429).",
            data: null
          };
        }

        this.dailyQuotaUsed++;
        EventBus.emit("cloud:quota_updated", { used: this.dailyQuotaUsed, limit: this.dailyQuotaLimit });

        const devMeta = this.deviceRegistry.get(deviceId);
        if (!devMeta) {
          return { status: 404, message: "Device Not Found", data: null };
        }

        if (endpoint === "status") {
          const result = [];
          for (const [code, val] of devMeta.currentDPs.entries()) {
            result.push({ code, value: val });
          }
          return {
            status: 200,
            message: "OK",
            data: { devId: devMeta.devId, result }
          };
        } else if (endpoint === "logs") {
          const logs = this.deviceLogs.get(deviceId) || [];
          return {
            status: 200,
            message: "OK",
            data: { devId: devMeta.devId, total: logs.length, logs: logs.slice(-50) }
          };
        }

        return { status: 400, message: "Invalid Endpoint", data: null };
      }

      resetDailyQuota() {
        this.dailyQuotaUsed = 0;
        EventBus.emit("cloud:quota_updated", { used: this.dailyQuotaUsed, limit: this.dailyQuotaLimit });
      }
    }
    const CloudMock = new CloudMockClass();

    /* ==========================================================================
       8. COLLECTOR - COLETOR MULTI-ORIGEM (PUSH, POLLING E LOCAL LAN)
       ========================================================================== */
    class CollectorClass {
      constructor() {
        this.pushEnabled = CONFIG.collector.pushEnabled;
        this.pollEnabled = CONFIG.collector.pollEnabled;
        this.pollIntervalSec = CONFIG.collector.pollIntervalSec;
        this.localLanEnabled = CONFIG.collector.localLanEnabled;

        this.pollTimer = 0;
        this.lastKnownPolledStates = new Map(); // id:dp -> value
        this.polledMissedCount = 0;

        // Assina stream do Message Service da Nuvem
        EventBus.on("cloud:push_emitted", ({ payload, eventData, wanLatency }) => {
          if (!this.pushEnabled) return;
          this.recordEvent({
            ...eventData,
            ts_cloud: SimClock.getIsoString(),
            ts_collected: SimClock.getIsoString(),
            source: "cloud_push",
            latency_ms: wanLatency + (eventData.hops * 25) + 30
          });
        });
      }

      // Envio Direto via Local LAN (dispositivos de rede elétrica)
      recordLocalLan(eventData) {
        if (!this.localLanEnabled) return;
        const localLatency = 10 + Math.round(Math.random() * 20); // 10-30 ms
        this.recordEvent({
          ...eventData,
          ts_cloud: "N/A (Local LAN)",
          ts_collected: SimClock.getIsoString(),
          source: "local",
          latency_ms: localLatency
        });
      }

      // Polling periódico REST na Nuvem Tuya
      updatePolling(deltaSimSec, devices) {
        if (!this.pollEnabled) return;
        this.pollTimer += deltaSimSec;

        if (this.pollTimer >= this.pollIntervalSec) {
          this.pollTimer = 0;

          // Consulta status de cada dispositivo na Nuvem
          for (const dev of devices) {
            const res = CloudMock.callRestApi("status", dev.id);
            if (res.status === 200 && res.data && res.data.result) {
              for (const item of res.data.result) {
                const key = `${dev.id}:${item.code}`;
                const prev = this.lastKnownPolledStates.get(key);
                if (prev !== item.value) {
                  this.lastKnownPolledStates.set(key, item.value);
                  this.recordEvent({
                    device_id: dev.id,
                    device_name: dev.name,
                    room: dev.room,
                    type: dev.category,
                    protocol: dev.protocol,
                    dp_code: item.code,
                    value: item.value,
                    source: "cloud_poll",
                    latency_ms: 120 + Math.round(Math.random() * 50),
                    lqi: dev.lqi,
                    rssi: dev.rssi,
                    hops: dev.hops,
                    battery: dev.hasBattery ? Math.round(dev.battery) : 100
                  });
                }
              }
            }
          }
        }
      }

      recordEvent(record) {
        record.ts_event = record.ts_event || SimClock.getIsoString();
        record.sim_time = record.sim_time || SimClock.simTime.toTimeString().split(' ')[0];
        DataStore.addRecord(record);
        EventBus.emit("collector:event_recorded", record);
      }
    }
    const Collector = new CollectorClass();

/* ==========================================================================
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

/* ==========================================================================
       12. DATASTORE - INDEXEDDB, BUFFER CIRCULAR, EXPORTAÇÕES E RESUMO PARA LLM
       ========================================================================== */
    class DataStoreClass {
      constructor() {
        this.ringBuffer = [];
        this.maxRingSize = 5000;
        this.db = null;
        this.initIndexedDB();
      }

      initIndexedDB() {
        if (typeof window === "undefined" || !window.indexedDB) {
          console.warn("IndexedDB indisponível no ambiente atual, usando apenas buffer em memória.");
          return;
        }
        try {
          const req = window.indexedDB.open("SmartHomeSimDB", 1);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("events")) {
              const store = db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
              store.createIndex("ts_event", "ts_event", { unique: false });
              store.createIndex("device_id", "device_id", { unique: false });
              store.createIndex("room", "room", { unique: false });
            }
          };
          req.onsuccess = (e) => {
            this.db = e.target.result;
            this.loadInitialCount();
          };
          req.onerror = (e) => {
            console.warn("IndexedDB indisponível, usando apenas memória RAM:", e);
          };
        } catch (err) {
          console.warn("Exceção ao inicializar IndexedDB:", err);
        }
      }

      loadInitialCount() {
        if (!this.db) return;
        const tx = this.db.transaction("events", "readonly");
        const store = tx.objectStore("events");
        const countReq = store.count();
        countReq.onsuccess = () => {
          EventBus.emit("datastore:count_updated", countReq.result);
        };
      }

      addRecord(record) {
        // 1. Buffer em memória RAM
        this.ringBuffer.unshift(record);
        if (this.ringBuffer.length > this.maxRingSize) {
          this.ringBuffer.pop();
        }

        // 2. Persistência em IndexedDB
        if (this.db) {
          try {
            const tx = this.db.transaction("events", "readwrite");
            const store = tx.objectStore("events");
            store.add(record);
          } catch (e) {
            // Ignora falhas menores de transação
          }
        }

        EventBus.emit("datastore:record_added", record);
      }

      clearDatabase() {
        this.ringBuffer = [];
        if (this.db) {
          const tx = this.db.transaction("events", "readwrite");
          tx.objectStore("events").clear();
        }
        EventBus.emit("datastore:count_updated", 0);
      }

      // Exportação em formato CSV com cabeçalho
      exportCsv() {
        if (this.ringBuffer.length === 0) return alert("Nenhum dado gravado para exportar.");
        const headers = ["ts_event", "ts_cloud", "ts_collected", "device_id", "device_name", "room", "type", "protocol", "dp_code", "value", "source", "latency_ms", "lqi", "rssi", "hops", "battery", "sim_time"];
        let csv = headers.join(",") + "\n";

        for (const row of this.ringBuffer) {
          const line = headers.map(h => {
            const val = row[h] !== undefined ? String(row[h]).replace(/"/g, '""') : "";
            return `"${val}"`;
          }).join(",");
          csv += line + "\n";
        }
        this.downloadFile("dataset_eventos_brutos.csv", csv, "text/csv;charset=utf-8;");
      }

      // Exportação em formato JSON
      exportJson() {
        if (this.ringBuffer.length === 0) return alert("Nenhum dado gravado para exportar.");
        const json = JSON.stringify(this.ringBuffer, null, 2);
        this.downloadFile("dataset_eventos_brutos.json", json, "application/json");
      }

      // Exportação em formato JSONL (JSON Lines)
      exportJsonl() {
        if (this.ringBuffer.length === 0) return alert("Nenhum dado gravado para exportar.");
        const jsonl = this.ringBuffer.map(r => JSON.stringify(r)).join("\n");
        this.downloadFile("dataset_eventos_brutos.jsonl", jsonl, "application/x-ndjson");
      }

      // Exportação Agregada por Janela de 5 min (com ground_truth_room para Aprendizado de Máquina)
      exportAggregatedDataset() {
        if (this.ringBuffer.length === 0) return alert("Nenhum dado gravado para exportar.");
        
        // Agrupa eventos em janelas de 5 minutos simulados por cômodo
        const windowSizeMs = 5 * 60 * 1000;
        const windows = new Map(); // key -> stats

        for (const ev of this.ringBuffer) {
          const timeMs = new Date(ev.ts_event).getTime();
          const winStartMs = Math.floor(timeMs / windowSizeMs) * windowSizeMs;
          const key = `${winStartMs}_${ev.room}`;

          if (!windows.has(key)) {
            windows.set(key, {
              window_start: new Date(winStartMs).toISOString(),
              window_end: new Date(winStartMs + windowSizeMs).toISOString(),
              room: ev.room,
              pir_events_count: 0,
              door_openings_count: 0,
              power_readings: [],
              lux_readings: [],
              ground_truth_room: HouseActivity.currentRoom || "Quarto 1" // Rótulo da verdade fundamental
            });
          }

          const w = windows.get(key);
          if (ev.dp_code === "pir" && ev.value === "pir") w.pir_events_count++;
          if (ev.dp_code === "doorcontact_state" && ev.value === "open") w.door_openings_count++;
          if (ev.dp_code === "cur_power") w.power_readings.push(Number(ev.value));
          if (ev.dp_code === "bright_value") w.lux_readings.push(Number(ev.value));
        }

        const headers = ["window_start", "window_end", "room", "pir_events_count", "door_openings_count", "avg_power_watts", "avg_lux", "ground_truth_room"];
        let csv = headers.join(",") + "\n";

        for (const w of windows.values()) {
          const avgPower = w.power_readings.length > 0 ? (w.power_readings.reduce((a,b)=>a+b,0)/w.power_readings.length).toFixed(1) : "0.0";
          const avgLux = w.lux_readings.length > 0 ? Math.round(w.lux_readings.reduce((a,b)=>a+b,0)/w.lux_readings.length) : "0";
          
          csv += `"${w.window_start}","${w.window_end}","${w.room}",${w.pir_events_count},${w.door_openings_count},${avgPower},${avgLux},"${w.ground_truth_room}"\n`;
        }

        this.downloadFile("dataset_agregado_5min_ml.csv", csv, "text/csv;charset=utf-8;");
      }

      downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      // Gera Resumo Textual Estruturado do Estado da Casa para LLMs
      generateLlmSummary(devices) {
        const timeStr = SimClock.getFormattedSimTime();
        let summary = `RESUMO DO ESTADO DA CASA INTELIGENTE (TUYA + ZIGBEE) - ${timeStr}\n`;
        summary += `Ambiente em atividade: [${HouseActivity.currentRoom}], ciclo: ${HouseActivity.currentActivity}.\n\n`;

        for (const room of CONFIG.rooms) {
          if (room.type === "outside") continue;
          summary += `• ${room.name}:\n`;
          const roomDevs = devices.filter(d => d.room === room.name);
          const pir = roomDevs.find(d => d.category === "pir");
          const bulb = roomDevs.find(d => d.category === "dj");
          const plug = roomDevs.find(d => d.category === "cz");
          const curtain = roomDevs.find(d => d.category === "cl");
          const door = roomDevs.find(d => d.category === "mcs");

          let statusParts = [];
          if (pir) statusParts.push(`Presença: ${pir.getDP("pir") === "pir" ? "DETECTADA" : "Ausente"} (Luminosidade: ${pir.getDP("bright_value") || 400} lux)`);
          if (bulb) statusParts.push(`Lâmpada: ${bulb.getDP("switch_led") ? "LIGADA (" + (bulb.protocol) + ")" : "Desligada"}`);
          if (plug) statusParts.push(`Tomada: ${plug.name} consumindo ${plug.getDP("cur_power") || 0} W`);
          if (curtain) statusParts.push(`Cortina: ${curtain.percent}% aberta`);
          if (door) statusParts.push(`Porta: ${door.getDP("doorcontact_state")}`);

          summary += statusParts.length > 0 ? `  ${statusParts.join(" | ")}\n` : `  Sem dispositivos ativos.\n`;
        }

        summary += `\nInfraestrutura de Rede:\n`;
        summary += `- HUB Zigbee: ${FaultInjector.hubOffline ? "DESCONECTADO" : "ONLINE"} (Malha com roteadores e nós finais)\n`;
        summary += `- Nuvem Tuya: ${FaultInjector.internetDown ? "INACESSÍVEL (Internet Caída)" : "CONECTADA"} | Cota REST: ${CloudMock.dailyQuotaUsed}/${CloudMock.dailyQuotaLimit} chamadas\n`;
        return summary;
      }
    }
    const DataStore = new DataStoreClass();

    /* ==========================================================================
       13. SCENEBUILDER - CONSTRUÇÃO DA CENA 3D COM THREE.JS
       ========================================================================== */
    class SceneBuilderClass {
      constructor(containerEl, css2dEl) {
        this.container = containerEl;
        this.css2dContainer = css2dEl;

        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.labelRenderer = null;
        this.controls = null;

        // Materiais
        this.materials = {};
        this.wallMeshes = [];
        this.doorObjects = [];
        this.roomLabels = [];
        this.deviceLabels = [];
        this.dataPackets = []; // partículas voando
        this.meshLines = null;

        this.currentWallMode = "cut"; // full, cut, transparent
        this.currentCameraView = "perspective"; // perspective, top, free
        this.cameraTween = null;

        this.init();
      }

      init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Câmera Perspectiva Inicial (posicionada conforme imagem 2)
        this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 150);
        this.camera.position.set(16.5, 14.5, 21.5);
        this.camera.lookAt(4.5, 0.5, 7.0);

        // WebGLRenderer com sombras suaves
        this.renderer = new THREE.WebGLRenderer({
          canvas: document.getElementById("three-canvas"),
          antialias: true,
          alpha: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // CSS2DRenderer para Rótulos dos Cômodos
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(width, height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.css2dContainer.appendChild(this.labelRenderer.domElement);

        // OrbitControls com limites
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.maxPolarAngle = Math.PI / 2.05;
        this.controls.target.set(4.5, 0.5, 7.0);

        this.initMaterials();
        this.setupLighting();
        this.buildBaseSlab();
        this.buildFloors();
        this.buildWalls();
        this.buildDoorsAndWindows();
        this.buildFurniture();
        this.buildRoomLabels();
        this.buildFloatingCloud();

        window.addEventListener("resize", () => this.onWindowResize());
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

      setupLighting() {
        // HemisphereLight (céu / chão)
        this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.7);
        this.scene.add(this.hemiLight);

        // DirectionalLight (Sol suave com mapa de sombras)
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

      buildBaseSlab() {
        // Laje azul clara de fundação sob a casa
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

          // Verifica se é muro baixo externo
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
            // Full
            wall.scale.y = 1.0;
            wall.position.y = wall.userData.origHeight / 2.0;
            wall.material.transparent = false;
            wall.material.opacity = 1.0;
          }
        }

        // Ajusta altura dos rótulos
        const labelY = mode === "cut" ? 0.8 : 2.8;
        for (const l of this.roomLabels) {
          l.position.y = labelY;
        }
      }

      buildDoorsAndWindows() {
        // Portas giratórias
        for (const doorDef of HouseModel.doorDefs) {
          const doorGroup = new THREE.Group();
          doorGroup.position.set(doorDef.x, 0, doorDef.z);

          const panelW = doorDef.width;
          const panelH = 2.1;
          const panelGeom = new THREE.BoxGeometry(0.04, panelH, panelW);
          const panelMesh = new THREE.Mesh(panelGeom, this.materials.door);
          panelMesh.position.set(0, panelH / 2.0, panelW / 2.0); // Articulação no pivô
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

        // Janelas com vidro translúcido
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
        // Mobília geométrica simplificada cinza-azulada (#8C9BB0) para dar escala visual
        const addBox = (x, y, z, w, h, d, mat = this.materials.furniture) => {
          const geom = new THREE.BoxGeometry(w, h, d);
          const m = new THREE.Mesh(geom, mat);
          m.position.set(x, y + h / 2.0, z);
          m.castShadow = true;
          m.receiveShadow = true;
          this.scene.add(m);
          return m;
        };

        // Quarto 3: Cama norte e dois guarda-roupas laterais
        addBox(4.5, 0, 1.2, 1.6, 0.45, 1.9); // Cama
        addBox(4.5, 0.45, 0.5, 1.7, 0.4, 0.1, this.materials.wood); // Cabeceira
        addBox(1.2, 0, 1.2, 0.9, 1.9, 0.6); // Guarda-roupa oeste
        addBox(7.8, 0, 1.2, 0.9, 1.9, 0.6); // Guarda-roupa leste

        // Quarto 2: Cama leste e escrivaninha
        addBox(7.8, 0, 5.4, 1.4, 0.45, 1.9); // Cama
        addBox(6.4, 0, 4.2, 1.2, 0.75, 0.6, this.materials.wood); // Escrivaninha

        // Quarto 1: Cama sul e guarda-roupa
        addBox(7.1, 0, 12.8, 1.6, 0.45, 1.9); // Cama
        addBox(8.2, 0, 11.2, 0.8, 1.9, 0.6); // Guarda-roupa

        // Cozinha: Bancada oeste, fogão e geladeira
        addBox(0.4, 0, 8.7, 0.6, 0.88, 2.2); // Bancada oeste
        addBox(0.4, 0.88, 9.4, 0.5, 0.05, 0.6, this.materials.metal); // Fogão
        addBox(3.3, 0, 10.0, 0.7, 1.75, 0.75, this.materials.metal); // Geladeira

        // Lavanderia: Máquina de lavar e tanque
        addBox(0.6, 0, 4.2, 0.65, 0.88, 0.65, this.materials.metal); // Lavadora
        addBox(0.6, 0, 5.6, 0.6, 0.85, 0.6); // Tanque

        // Banheiro: Vaso, pia e box
        addBox(8.2, 0, 8.3, 0.4, 0.45, 0.55); // Vaso sanitário
        addBox(6.2, 0, 8.3, 0.5, 0.82, 0.5); // Bancada pia
        addBox(7.6, 0, 9.3, 0.9, 1.9, 0.9, this.materials.glass); // Box

        // Corredor: Aparador (console) 0.9m de altura para o Hub e o Roteador
        addBox(4.5, 0, 7.5, 0.45, 0.9, 1.6, this.materials.wood);

        // Cabo Ethernet desenhado conectando Hub (4.5; 1.0; 6.8) ao Roteador (4.5; 1.0; 8.2)
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
        // Modelo 3D estilizado de Nuvem flutuando sobre a casa
        const cloudGroup = new THREE.Group();
        cloudGroup.position.set(4.5, 6.2, -2.5);

        const cloudMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.2,
          emissive: 0x0284c7,
          emissiveIntensity: 0.4
        });

        // Agrupamento de esferas orgânicas formando a nuvem
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

        // Rótulo CSS2D da Nuvem
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

      // Adiciona Marcador 3D para um dispositivo
      createDeviceMesh(device) {
        const group = new THREE.Group();
        group.position.set(device.pos.x, device.pos.y, device.pos.z);

        // Cor de anel por protocolo: Zigbee âmbar #FFB020, Wi-Fi ciano #22D3EE, Hub magenta #E040FB, Roteador branco
        let ringColor = CONFIG.colors.zigbeeAmber;
        if (device.category === "wg2") ringColor = CONFIG.colors.hubMagenta;
        else if (device.category === "router") ringColor = CONFIG.colors.routerWhite;
        else if (device.protocol === "wifi") ringColor = CONFIG.colors.wifiCyan;

        // Corpo do dispositivo baseado no tipo
        let baseMesh = null;
        if (device.category === "pir") {
          // Sensor PIR de canto
          const geom = new THREE.ConeGeometry(0.08, 0.12, 4);
          const mat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.3 });
          baseMesh = new THREE.Mesh(geom, mat);
          baseMesh.rotation.y = device.rotY * (Math.PI / 180);
        } else if (device.category === "dj") {
          // Lâmpada inteligente de teto
          const geom = new THREE.SphereGeometry(0.09, 16, 16);
          const mat = new THREE.MeshStandardMaterial({
            color: 0xFFFBEB,
            emissive: device.getDP("switch_led") ? 0xFDE047 : 0x333333,
            emissiveIntensity: 0.8
          });
          baseMesh = new THREE.Mesh(geom, mat);
        } else if (device.category === "cz") {
          // Tomada de parede
          const geom = new THREE.BoxGeometry(0.08, 0.1, 0.04);
          const mat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.4 });
          baseMesh = new THREE.Mesh(geom, mat);
        } else if (device.category === "sp") {
          // Câmera
          const geom = new THREE.CylinderGeometry(0.05, 0.07, 0.12, 12);
          const mat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.3 });
          baseMesh = new THREE.Mesh(geom, mat);
          baseMesh.rotation.z = Math.PI / 4;
        } else {
          // Hub / Router / Genérico
          const geom = new THREE.BoxGeometry(0.12, 0.04, 0.12);
          const mat = new THREE.MeshStandardMaterial({ color: ringColor, roughness: 0.3 });
          baseMesh = new THREE.Mesh(geom, mat);
        }

        group.add(baseMesh);

        // Anel de identificação de protocolo
        const ringGeom = new THREE.TorusGeometry(0.12, 0.015, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: ringColor });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        group.add(ringMesh);

        // LED piscante de transmissão
        const ledGeom = new THREE.SphereGeometry(0.025, 8, 8);
        const ledMat = new THREE.MeshStandardMaterial({
          color: ringColor,
          emissive: ringColor,
          emissiveIntensity: 0.8
        });
        const ledMesh = new THREE.Mesh(ledGeom, ledMat);
        ledMesh.position.set(0, 0.08, 0);
        group.add(ledMesh);
        device.ledMesh = ledMesh;

        // Pulso animado de evento (anel que expande e desaparece)
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
        device.pulseMesh = pulseMesh;

        // Cones de Detecção (PIR e Câmera) - Visual sutil e desligado por padrão para não poluir
        if (device.category === "pir") {
          const coneGeom = new THREE.ConeGeometry(1.8, 2.8, 16, 1, false);
          const coneMat = new THREE.MeshBasicMaterial({
            color: ringColor,
            transparent: true,
            opacity: 0.08,
            wireframe: false,
            depthWrite: false,
            side: THREE.DoubleSide
          });
          const coneMesh = new THREE.Mesh(coneGeom, coneMat);
          coneMesh.rotation.x = Math.PI / 2;
          coneMesh.position.z = 1.4;
          coneMesh.visible = false; // Padrão DESLIGADO para manter cena limpa
          group.add(coneMesh);
          device.detectionConeMesh = coneMesh;
        } else if (device.category === "sp") {
          const coneGeom = new THREE.ConeGeometry(1.5, 2.5, 16, 1, false);
          const coneMat = new THREE.MeshBasicMaterial({
            color: ringColor,
            transparent: true,
            opacity: 0.06,
            wireframe: false,
            depthWrite: false,
            side: THREE.DoubleSide
          });
          const coneMesh = new THREE.Mesh(coneGeom, coneMat);
          coneMesh.rotation.x = Math.PI / 2;
          coneMesh.position.z = 1.25;
          coneMesh.visible = false;
          group.add(coneMesh);
          device.detectionConeMesh = coneMesh;
        }

        // Rótulo 2D do sensor (CSS2D) com ID, protocolo e leitura
        const devLabelDiv = document.createElement("div");
        devLabelDiv.className = `device-label-pill proto-${device.protocol || "zigbee"}`;
        devLabelDiv.id = `label-dev-${device.id}`;
        devLabelDiv.title = `${device.name} (${device.protocol.toUpperCase()}) - Clique para detalhes`;

        let dotColor = CONFIG.colors.zigbeeAmber;
        if (device.category === "wg2") dotColor = CONFIG.colors.hubMagenta;
        else if (device.category === "router") dotColor = CONFIG.colors.routerWhite;
        else if (device.protocol === "wifi") dotColor = CONFIG.colors.wifiCyan;

        devLabelDiv.innerHTML = `
          <span class="dev-dot" style="background:${dotColor};"></span>
          <span class="dev-id">${device.id}</span>
          <span class="dev-status" id="label-val-${device.id}">${device.getShortStatus()}</span>
        `;

        // Interação ao clicar no rótulo 3D
        devLabelDiv.addEventListener("click", (e) => {
          e.stopPropagation();
          if (window.UI) {
            window.UI.selectDevice(device);
          }
        });

        const devLabelObj = new CSS2DObject(devLabelDiv);
        devLabelObj.position.set(0, 0.24, 0);
        const shouldShow = (window.uiToggles ? window.uiToggles.devLabels : true) && (device.showLabel !== false);
        devLabelObj.visible = shouldShow;

        group.add(devLabelObj);
        device.labelObject = devLabelObj;
        device.labelElement = devLabelDiv;
        this.deviceLabels.push(devLabelObj);

        group.userData = { isDevice: true, deviceId: device.id };
        this.scene.add(group);
        device.meshGroup = group;
        return group;
      }

      // Cria pacote de dados 3D animado voando (com limite para evitar trilhas densas em altas velocidades)
      spawnDataPacket(waypoints, protocol) {
        if (!window.uiToggles?.packets) return;
        if (this.dataPackets.length >= 6) return;

        const color = protocol === "zigbee" ? CONFIG.colors.zigbeeAmber : CONFIG.colors.wifiCyan;
        const geom = new THREE.SphereGeometry(0.08, 12, 12);
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geom, mat);

        this.scene.add(mesh);
        this.dataPackets.push({
          mesh,
          waypoints,
          segIndex: 0,
          progress: 0.0,
          speed: 5.0
        });
      }

      // Desenha as linhas 3D da malha Zigbee de forma sutil e elegante
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

      // Transição suave de câmera
      setCameraView(viewName) {
        this.currentCameraView = viewName;
        let targetPos = new THREE.Vector3();
        let targetLook = new THREE.Vector3(4.5, 0.5, 7.0);

        if (viewName === "perspective") {
          targetPos.set(16.5, 14.5, 21.5);
        } else if (viewName === "top") {
          targetPos.set(4.5, 25.0, 7.001); // Pequeno offset para evitar singularidade do OrbitControls
        } else {
          return; // Livre
        }

        this.cameraTween = {
          startPos: this.camera.position.clone(),
          endPos: targetPos,
          startLook: this.controls.target.clone(),
          endLook: targetLook,
          t: 0
        };
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
        // Atualiza tween suave de câmera
        if (this.cameraTween) {
          this.cameraTween.t += deltaSec * 2.5;
          const alpha = Math.min(1.0, this.cameraTween.t);
          this.camera.position.lerpVectors(this.cameraTween.startPos, this.cameraTween.endPos, alpha);
          this.controls.target.lerpVectors(this.cameraTween.startLook, this.cameraTween.endLook, alpha);
          if (alpha >= 1.0) this.cameraTween = null;
        }

        this.controls.update();

        // Animação das Portas Físicas
        for (const door of this.doorObjects) {
          const targetAngle = door.targetOpen ? (Math.PI / 2.1) : 0;
          door.currentAngle += (targetAngle - door.currentAngle) * (deltaSec * 6.0);
          door.panel.rotation.y = door.currentAngle;
          door.isOpen = Math.abs(door.currentAngle) > 0.15;
        }

        // Animação dos Pacotes de Dados Voando
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

        // Flutuação suave da Nuvem
        if (this.cloudMesh) {
          this.cloudMesh.position.y = 6.2 + Math.sin(performance.now() * 0.0015) * 0.15;
        }

        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
      }
    }

/* ==========================================================================
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

        // Botão Iniciar Guia Interativo
        document.getElementById("btn-start-tour")?.addEventListener("click", () => {
          if (window.Tour) window.Tour.toggleTour();
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

          // Identificação da sigla no card
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
          respBox.textContent = `HTTP/1.1 ${res.status} ${res.message}\n` +
            `Content-Type: application/json\n` +
            `X-Tuya-Timestamp: ${Date.now()}\n\n` +
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
       14.2 TOUR CONTROLLER - GUIA INTERATIVO DA INICIAÇÃO CIENTÍFICA
       Baseado no documento oficial: Tuya, Zigbee e dados para modelos (8 páginas)
       ========================================================================== */
    class TourController {
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

        // Renderiza dots de navegação rápida
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

        // Ação interativa do passo
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

        // Executa setup interativo do passo
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
              <p>A <strong>Tuya</strong> é uma plataforma IoT em nuvem (PaaS). A maioria dos dispositivos "Smart Life / Tuya Smart" de marcas diferentes (JWCOM, Luminolândia, DMO etc.) compartilham o mesmo ecossistema com marcas brancas.</p>
              <ul>
                <li><strong>1. Dispositivo Físico:</strong> sensor ou atuador com módulo de rádio (Wi-Fi, Zigbee, BLE) executando firmware Tuya.</li>
                <li><strong>2. Nuvem Tuya:</strong> autentica dispositivos, armazena estado atual, roteia comandos, executa automações e expõe APIs.</li>
                <li><strong>3. App Smart Life / Tuya Smart:</strong> interface para o usuário final parear, controlar e criar cenas.</li>
                <li><strong>4. Tuya IoT Platform (iot.tuya.com):</strong> portal de desenvolvedores onde se cria o Cloud Project, obtêm-se credenciais e se extraem dados programaticamente.</li>
              </ul>
              <div class="tour-callout"><strong>💡 No Simulador:</strong> A planta 3D representa o ambiente físico completo integrado à nuvem Tuya e ao Hub Zigbee central.</div>
            `,
            actionText: "🔭 Visão Panorâmica da Casa",
            onAction: () => {
              if (window.SceneBuilder) window.SceneBuilder.setCameraView("perspective");
            },
            setup: () => {
              if (window.SceneBuilder) window.SceneBuilder.setCameraView("perspective");
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
                <li><strong>Abertura:</strong> Sensor porta/janela Tuya Wi-Fi (JWCOM) e versão Zigbee.</li>
                <li><strong>Movimento:</strong> Sensores PIR Wi-Fi e PIR Zigbee (com tempo de cooldown e lux).</li>
                <li><strong>Energia:</strong> Tomadas 20A com medidor (cur_power, cur_voltage, cur_current) e tomadas 10A.</li>
                <li><strong>Hub:</strong> Gateway Zigbee 3.0 coordenador (cabeado Ethernet ou sem fio).</li>
                <li><strong>Atuadores:</strong> Motor de cortina (posição em %) e Lâmpadas inteligentes CCT.</li>
              </ul>
              <div class="tour-callout"><strong>💡 No Simulador:</strong> O inventário lateral esquerdo agrupa os 39 dispositivos com busca em tempo real.</div>
            `,
            actionText: "🔍 Filtrar Sensores PIR de Presença",
            onAction: () => {
              const pill = document.querySelector(".filter-pill[data-filter='pir']");
              if (pill) pill.click();
            },
            setup: () => {
              const pillAll = document.querySelector(".filter-pill[data-filter='all']");
              if (pillAll) pillAll.click();
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
                <li><strong>Tipos de Dados:</strong> <code>bool</code> (aberto/fechado), <code>value</code> (inteiro com escala), <code>enum</code> (pir/none), <code>string</code>, <code>raw</code>.</li>
                <li><strong>Modo de Acesso:</strong> <code>ro</code> (só reporta), <code>rw</code> (reporta e aceita comandos), <code>wr</code>.</li>
              </ul>
              <div class="tour-callout"><strong>💡 Exemplo Real:</strong> Sensor de porta reporta <code>{"doorcontact_state": true, "battery_percentage": 98}</code>.</div>
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
              <p>O Zigbee opera na frequência de 2,4 GHz (canais 11 a 26) com topologia <strong>mesh</strong> (malha), garantindo alcance e robustez:</p>
              <ul>
                <li><strong>Coordenador (Hub/Gateway):</strong> Cria a rede, escolhe canal e PAN ID, distribui chaves criptográficas AES-128. É a ponte com a nuvem.</li>
                <li><strong>Routers:</strong> Dispositivos ligados à tomada (lâmpadas e tomadas Zigbee) que retransmitem pacotes, estendendo o sinal.</li>
                <li><strong>End Devices:</strong> Sensores a bateria (PIR, portas). Dormem a maior parte do tempo e se comunicam através do pai mais próximo.</li>
              </ul>
              <div class="tour-callout warning"><strong>⚠️ Ponto da IC:</strong> As tomadas Wi-Fi <em>não</em> participam da malha Zigbee. Para reforçar o alcance, prefira lâmpadas ou tomadas Zigbee.</div>
            `,
            actionText: "⚡ Focar no Hub & Malha RF 3D",
            onAction: () => {
              document.getElementById("btn-toggle-mesh")?.classList.add("active");
              if (window.SceneBuilder) window.SceneBuilder.setCameraView("free");
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
              <p>Sensores a bateria possuem características técnicas determinantes para a pesquisa:</p>
              <ul>
                <li><strong>Sono Profundo:</strong> Eles ficam dormindo e <strong>não aceitam consulta local</strong>. Você só os "ouve" quando eles acordam e transmitem um evento.</li>
                <li><strong>Tempo de Bloqueio (Cooldown):</strong> Sensores PIR têm bloqueio de 30s a alguns minutos após detecção para poupar bateria. Isso indica <em>início de presença</em>, não duração contínua.</li>
                <li><strong>Cluster Proprietário (0xEF00):</strong> Sensores Zigbee Tuya empacotam DPs em um cluster fechado, exigindo conversores caso use Zigbee2MQTT.</li>
              </ul>
              <div class="tour-callout"><strong>💡 No Simulador:</strong> Ative pacotes voando e veja a rota física do sensor até o Hub!</div>
            `,
            actionText: "📡 Disparar Evento & Pacote no Ar",
            onAction: () => {
              const pir = window.allDevices?.find(d => d.id === "PIR-01");
              if (pir) pir.trigger();
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
                <li><strong>Alocação de Canais:</strong> Use Wi-Fi nos canais <strong>1, 6 ou 11</strong> e Zigbee nos canais <strong>15, 20, 25 ou 26</strong> (canais com menor sobreposição espectral).</li>
                <li><strong>Posicionamento Físico:</strong> Mantenha o Hub a mais de 1 metro de distância do roteador Wi-Fi e de fornos micro-ondas.</li>
                <li><strong>SSID Dedicado:</strong> Crie um SSID exclusivo de 2,4 GHz para IoT, sem <em>band steering</em> e sem isolamento de clientes (AP Isolation).</li>
              </ul>
              <div class="tour-callout"><strong>⚖️ Veredito da IC:</strong> Para bateria, Zigbee vence (dura 1 a 2 anos vs meses no Wi-Fi). Para medição de energia constante, Wi-Fi é ideal.</div>
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
              <p>A extração oficial via nuvem utiliza a <strong>Tuya IoT Platform (iot.tuya.com)</strong>:</p>
              <ul>
                <li><strong>Autenticação:</strong> Requisições OpenAPI autenticadas com <em>Access ID</em>, <em>Access Secret</em> e assinatura criptográfica HMAC-SHA256.</li>
                <li><strong>Pull (Polling):</strong> Consultar estado atual periodicamente consome cotas de chamadas e gera lacunas nos dados.</li>
                <li><strong>Push (Message Service):</strong> O <strong>método correto para a IC</strong>. A Tuya empurra os eventos em tempo real via WebSocket/Pulsar.</li>
              </ul>
              <div class="tour-callout warning"><strong>⚠️ Regra de Ouro da IC:</strong> A Tuya NÃO é seu banco de dados. Os logs expiram rápido e as cotas são limitadas. Você deve gravar os dados em banco próprio desde o primeiro dia!</div>
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
              <p>Existem dois princípios arquiteturais fundamentais revelados na pesquisa:</p>
              <ul>
                <li><strong>Comunicação Local (LAN):</strong> Dispositivos de rede elétrica aceitam conexão TCP na porta <code>6668</code> com a <code>localKey</code> (usando <em>TinyTuya</em>), garantindo baixíssima latência e independência de internet.</li>
                <li><strong>Interconexão Lógica:</strong> Dispositivos Tuya <strong>NÃO conversam entre si diretamente</strong>. Cada um é cliente independente. Toda a correlação e inteligência deve rodar no seu coletor próprio (Python / Home Assistant).</li>
              </ul>
              <div class="tour-code-box">import tinytuya<br>d = tinytuya.Device("DEV_ID", "192.168.1.50", "LOCAL_KEY", version=3.3)<br>print(d.status()) # {'dps': {'1': True, '19': 230}}</div>
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
              <p>As tomadas inteligentes com medição de energia são uma das fontes mais ricas de dados da pesquisa:</p>
              <ul>
                <li><strong>Telemetria Disponível:</strong> Potência instantânea (Watts), Tensão (V), Corrente (mA) e Consumo Acumulado (kWh).</li>
                <li><strong>NILM (Non-Intrusive Load Monitoring):</strong> Modelos de ML capazes de inferir qual aparelho foi ligado (geladeira, lavadora, TV, micro-ondas) pela assinatura de consumo.</li>
                <li><strong>Intervalo de Reporte:</strong> Muitas tomadas só enviam dados quando a variação ultrapassa um limiar estipulado.</li>
              </ul>
              <div class="tour-callout warning"><strong>🚨 Segurança Crítica:</strong> NUNCA permita que um LLM ou rotina automática desligue tomadas de cargas vitais (geladeira com perecíveis, equipamentos médicos).</div>
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
              <p>Para transformar eventos em ciência reprodutível, seguimos a arquitetura da Seção 3.2:</p>
              <ul>
                <li><strong>1. Ingestão & Normalização:</strong> Eventos padronizados em JSON imutável com duplo timestamp (chegada no coletor vs evento Tuya para calcular latência).</li>
                <li><strong>2. Armazenamento Imutável:</strong> Banco de séries temporais (InfluxDB / TimescaleDB) + arquivos brutos versionados (Parquet/CSV).</li>
                <li><strong>3. Engenharia de Atributos:</strong> Janelas temporais (5 min, 1h), contagem de eventos por cômodo, tempo desde último movimento e potência média.</li>
                <li><strong>4. Rótulos (Ground Truth):</strong> Diário de atividades reais dos moradores para treinar modelos supervisionados (ou datasets públicos como CASAS).</li>
              </ul>
              <div class="tour-callout"><strong>💡 No Simulador:</strong> O banco IndexedDB local já grava todos os eventos normalizados. Você pode exportar CSV, JSON e JSONL agora mesmo!</div>
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
              <p>Um dos pontos conceituais mais lúcidos da apostila de Iniciação Científica:</p>
              <ul>
                <li><strong>O que NÃO fazer:</strong> LLMs <em>não</em> são a melhor ferramenta para modelar séries temporais numéricas de sensores! Métodos clássicos (XGBoost, Random Forest, HMM, LSTM) superam LLMs com muito menos dados e menor custo computacional.</li>
                <li><strong>Onde o LLM Brilha:</strong>
                  <ul>
                    <li><strong>Interface & Orquestração:</strong> Receber resumo textual do estado da casa e usar <em>Function Calling / Tool Use</em> para acionar APIs.</li>
                    <li><strong>Explicação de Rotinas:</strong> Traduzir padrões encontrados pelos modelos matemáticos em explicações em linguagem natural.</li>
                    <li><strong>Geração de Regras:</strong> Sugerir automações validadas por humanos.</li>
                  </ul>
                </li>
              </ul>
              <div class="tour-callout"><strong>🛡️ Camada de Segurança:</strong> Deve sempre haver um validador determinístico com regras rígidas entre a saída do LLM e os atuadores da casa.</div>
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
              <p>Parabéns! Você completou o Guia Técnico Interativo da Iniciação Científica. O roadmap da pesquisa se divide em 5 fases:</p>
              <ul>
                <li><strong>Fase 0 (Atual):</strong> Perguntas de pesquisa, planta da casa com posicionamento dos sensores e metadados (validado com sucesso neste simulador!).</li>
                <li><strong>Fase 1:</strong> Aquisição do Hub Zigbee + 1 sensor prioritário de cada tipo para validar o fluxo ponta a ponta na nuvem Tuya.</li>
                <li><strong>Fase 2:</strong> Implementação do coletor Python + InfluxDB + Grafana, medindo latência e perda de pacotes.</li>
                <li><strong>Fase 3:</strong> Coleta contínua de semanas de dados com diário de rotinas e treino dos primeiros modelos de inferência (NILM e Presença).</li>
                <li><strong>Fase 4:</strong> Automações determinísticas e integração com LLM como orquestrador via Function Calling.</li>
              </ul>
              <div class="tour-callout"><strong>🎓 Conclusão:</strong> Este simulador serve como material de ensino vivo e Prova de Conceito (PoC) para sua pesquisa!</div>
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
              document.querySelector(".tab-btn[data-tab='tab-notifications']")?.click();
            }
          }
        ];
      }
    }
    const Tour = new TourController();
    window.Tour = Tour;

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
