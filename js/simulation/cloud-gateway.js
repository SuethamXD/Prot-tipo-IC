/**
 * ==============================================================================
 * CLOUD MOCK & TELEMETRY COLLECTOR
 * js/simulation/cloud-gateway.js
 * 
 * Nuvem Tuya (REST, message push, quotas, logs) e Coletor Multi-Origem.
 * ISOLAMENTO: Proibido Three.js ou DOM.
 * ==============================================================================
 */

import { CONFIG } from './config.js';
import { SimClock } from './clock.js';
import { EventBus } from '../contracts/event-bus.js';
import { DataStore } from './datastore.js';

export class CloudMockClass {
  constructor() {
    this.deviceRegistry = new Map();
    this.deviceLogs = new Map();
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

  receiveFromDevice(eventData) {
    if (typeof window !== "undefined" && window.FaultInjector && window.FaultInjector.internetDown) {
      return { delivered: false, reason: "internet_down" };
    }

    if (this.trialExpired || (typeof window !== "undefined" && window.FaultInjector && window.FaultInjector.trialExpired)) {
      return { delivered: false, reason: "trial_expired" };
    }

    let wanLatency = Math.round(120 * Math.exp((Math.random() - 0.5) * 0.4));
    if (typeof window !== "undefined" && window.FaultInjector && window.FaultInjector.cloudLatencySpike) {
      wanLatency += 2000;
    }

    const simIso = SimClock.getIsoString();
    const record = {
      ts_cloud: simIso,
      device_id: eventData.device_id,
      dp_code: eventData.dp_code,
      value: eventData.value
    };

    const devMeta = this.deviceRegistry.get(eventData.device_id);
    if (devMeta) {
      devMeta.currentDPs.set(eventData.dp_code, eventData.value);
    }

    const logs = this.deviceLogs.get(eventData.device_id) || [];
    logs.push(record);
    this.pruneOldLogs(eventData.device_id);

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

  callRestApi(endpoint, deviceId) {
    if (this.trialExpired || (typeof window !== "undefined" && window.FaultInjector && window.FaultInjector.trialExpired)) {
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

export const CloudMock = new CloudMockClass();

export class CollectorClass {
  constructor() {
    this.pushEnabled = CONFIG.collector.pushEnabled;
    this.pollEnabled = CONFIG.collector.pollEnabled;
    this.pollIntervalSec = CONFIG.collector.pollIntervalSec;
    this.localLanEnabled = CONFIG.collector.localLanEnabled;

    this.pollTimer = 0;
    this.lastKnownPolledStates = new Map();
    this.polledMissedCount = 0;

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

  recordLocalLan(eventData) {
    if (!this.localLanEnabled) return;
    const localLatency = 10 + Math.round(Math.random() * 20);
    this.recordEvent({
      ...eventData,
      ts_cloud: "N/A (Local LAN)",
      ts_collected: SimClock.getIsoString(),
      source: "local",
      latency_ms: localLatency
    });
  }

  updatePolling(deltaSimSec, devices) {
    if (!this.pollEnabled) return;
    this.pollTimer += deltaSimSec;

    if (this.pollTimer >= this.pollIntervalSec) {
      this.pollTimer = 0;

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

export const Collector = new CollectorClass();
if (typeof window !== "undefined") {
  window.CloudMock = CloudMock;
  window.Collector = Collector;
}
