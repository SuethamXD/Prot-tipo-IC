/**
 * ==============================================================================
 * SIMULATION CONFIG & HOUSE TOPOLOGY
 * js/simulation/config.js
 * 
 * Parâmetros de física, dimensões, RF, grafo de navegação e modelo da casa.
 * ISOLAMENTO: Proibido importar Three.js ou manipular DOM neste módulo.
 * ==============================================================================
 */

export const CONFIG = {
  version: "2.0.0",
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

  // Tabela Oficial de Cômodos
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

export class HouseModelClass {
  constructor() {
    this.rooms = CONFIG.rooms;

    this.doorDefs = [
      { id: "DOOR_ENTRANCE", name: "Entrada Principal", x: 4.5, z: 14.0, width: 0.9, axis: "x", roomA: "corr", roomB: "patio" },
      { id: "DOOR_Q3", name: "Porta Quarto 3", x: 4.5, z: 3.5, width: 0.9, axis: "x", roomA: "corr", roomB: "q3" },
      { id: "DOOR_Q2", name: "Porta Quarto 2", x: 5.2, z: 5.6, width: 0.8, axis: "z", roomA: "corr", roomB: "q2" },
      { id: "DOOR_WC", name: "Porta Banheiro", x: 5.2, z: 8.9, width: 0.7, axis: "z", roomA: "corr", roomB: "wc" },
      { id: "DOOR_Q1", name: "Porta Quarto 1", x: 5.2, z: 12.0, width: 0.8, axis: "z", roomA: "corr", roomB: "q1" },
      { id: "DOOR_COZ_CORR", name: "Porta Cozinha/Corredor", x: 3.8, z: 8.7, width: 0.8, axis: "z", roomA: "corr", roomB: "coz" },
      { id: "DOOR_LAV_COZ", name: "Porta Lavanderia/Cozinha", x: 1.6, z: 7.0, width: 0.8, axis: "x", roomA: "coz", roomB: "lav" }
    ];

    this.windowDefs = [
      { id: "WIN_Q3", name: "Janela Q3 Norte", x: 4.5, y: 1.5, z: 0.0, width: 1.8, axis: "x", room: "Quarto 3" },
      { id: "WIN_LAV", name: "Janela Lavanderia Oeste", x: 0.0, y: 1.5, z: 5.0, width: 1.2, axis: "z", room: "Lavanderia" },
      { id: "WIN_COZ", name: "Janela Cozinha Oeste", x: 0.0, y: 1.5, z: 8.8, width: 1.4, axis: "z", room: "Cozinha" },
      { id: "WIN_Q2", name: "Janela Q2 Leste", x: 9.0, y: 1.5, z: 5.6, width: 1.6, axis: "z", room: "Quarto 2" },
      { id: "WIN_WC", name: "Janela Banheiro Leste (Pequena)", x: 9.0, y: 1.8, z: 8.9, width: 0.8, axis: "z", room: "Banheiro Social" },
      { id: "WIN_Q1", name: "Janela Q1 Leste", x: 9.0, y: 1.5, z: 12.2, width: 1.6, axis: "z", room: "Quarto 1" }
    ];

    this.wallSegments = [
      { p1: [0.0, 0.0], p2: [9.0, 0.0] },
      { p1: [9.0, 0.0], p2: [9.0, 14.0] },
      { p1: [3.8, 14.0], p2: [9.0, 14.0] },
      { p1: [0.0, 0.0], p2: [0.0, 10.5] },
      { p1: [0.0, 10.5], p2: [0.0, 14.0] },
      { p1: [0.0, 14.0], p2: [3.8, 14.0] },
      { p1: [0.0, 3.5], p2: [9.0, 3.5] },
      { p1: [0.0, 7.0], p2: [3.8, 7.0] },
      { p1: [0.0, 10.5], p2: [3.8, 10.5] },
      { p1: [3.8, 3.5], p2: [3.8, 10.5] },
      { p1: [5.2, 3.5], p2: [5.2, 14.0] },
      { p1: [5.2, 7.8], p2: [9.0, 7.8] },
      { p1: [5.2, 10.0], p2: [9.0, 10.0] }
    ];

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
      "DOOR_Q3_NODE": { x: 4.5, z: 3.5, room: "Quarto 3", doorId: "DOOR_Q3" },
      "DOOR_LAV_NODE": { x: 1.6, z: 7.0, room: "Cozinha", doorId: "DOOR_LAV_COZ" },
      "DOOR_COZ_NODE": { x: 3.8, z: 8.7, room: "Corredor Central", doorId: "DOOR_COZ_CORR" },
      "DOOR_Q2_NODE": { x: 5.2, z: 5.6, room: "Corredor Central", doorId: "DOOR_Q2" },
      "DOOR_WC_NODE": { x: 5.2, z: 8.9, room: "Corredor Central", doorId: "DOOR_WC" },
      "DOOR_Q1_NODE": { x: 5.2, z: 12.0, room: "Corredor Central", doorId: "DOOR_Q1" },
      "DOOR_ENT_NODE": { x: 4.5, z: 14.0, room: "Corredor Central", doorId: "DOOR_ENTRANCE" }
    };

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

export const HouseModel = new HouseModelClass();
if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
  window.HouseModel = HouseModel;
}
