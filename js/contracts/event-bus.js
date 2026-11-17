/**
 * ==============================================================================
 * CENTRAL EVENT BUS
 * js/contracts/event-bus.js
 * 
 * Barramento pub/sub para comunicação assíncrona e desacoplada entre camadas.
 * ==============================================================================
 */

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
          console.error(`[EventBus] Erro no listener do evento '${event}':`, err);
        }
      }
    }
  }
}

export const EventBus = new EventBusClass();
if (typeof window !== "undefined") {
  window.EventBus = EventBus;
}
