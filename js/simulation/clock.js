/**
 * ==============================================================================
 * SIMULATION CLOCK & SUN CYCLE
 * js/simulation/clock.js
 * 
 * Relógio virtual acelerado, cálculo astronômico de lux solar e períodos do dia.
 * ISOLAMENTO: Proibido Three.js ou DOM.
 * ==============================================================================
 */

import { CONFIG } from './config.js';
import { EventBus } from '../contracts/event-bus.js';

export class SimClockClass {
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
        dayPeriod: this.dayPeriod,
        sunAltitude: this.sunAltitude
      });
    }
  }

  computeSunAndLux() {
    const hours = this.simTime.getHours() + this.simTime.getMinutes() / 60.0 + this.simTime.getSeconds() / 3600.0;
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
      this.externalLux = 2;
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

export const SimClock = new SimClockClass();
if (typeof window !== "undefined") {
  window.SimClock = SimClock;
}
