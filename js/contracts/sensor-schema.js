/**
 * ==============================================================================
 * SENSOR DATA CONTRACT & SCHEMA
 * js/contracts/sensor-schema.js
 * 
 * Contrato fixo de dados para comunicação desacoplada entre:
 *   - /simulation (Core & Telemetria)
 *   - /scene (Visualização 3D Three.js)
 *   - /ui (Interface, HUD e Gráficos)
 * ==============================================================================
 */

/**
 * @typedef {Object} Position3D
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef {Object} SensorContract
 * @property {string} id - Identificador único (ex: "PL-01", "PIR-01", "CT-01")
 * @property {string} type - Tipo/categoria Tuya (ex: "cz", "pir", "mcs", "dj", "cl", "sp", "wg2")
 * @property {string} protocol - Protocolo de rádio ("zigbee" | "wifi")
 * @property {string} room - Nome do cômodo associado (ex: "Cozinha", "Quarto 1")
 * @property {Position3D} position_3d - Coordenadas mundiais da simulação
 * @property {"online" | "offline"} status - Estado de conectividade do dispositivo
 * @property {number} battery - Porcentagem de bateria (0 a 100) ou -1 se AC
 * @property {boolean} hasBattery - Se o dispositivo opera com bateria
 * @property {boolean} isRouter - Se opera como nó roteador Zigbee
 * @property {string|null} parent - ID do nó pai na topologia Mesh
 * @property {number} hops - Quantidade de saltos até o Gateway
 * @property {number} rssi - Nível de sinal em dBm
 * @property {number} lqi - Link Quality Indicator (0 a 255)
 * @property {Object} last_payload - Último payload de telemetria transmitido
 */

export function createSensorContract(device) {
  return {
    id: device.id,
    type: device.category,
    protocol: device.protocol,
    room: device.room,
    position_3d: { ...device.pos },
    status: device.status,
    battery: device.hasBattery ? device.battery : 100,
    hasBattery: !!device.hasBattery,
    isRouter: !!device.isRouter,
    parent: device.parent || null,
    hops: device.hops || 0,
    rssi: device.rssi || -50,
    lqi: device.lqi || 200,
    last_payload: device.lastPayload || null
  };
}

export function validateSensorContract(obj) {
  const required = ['id', 'type', 'room', 'position_3d', 'status'];
  for (const field of required) {
    if (obj[field] === undefined || obj[field] === null) {
      throw new Error(`Contrato de Sensor violado: campo obrigatório '${field}' ausente no sensor ${obj.id || 'desconhecido'}`);
    }
  }
  return true;
}
