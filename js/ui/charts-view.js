/**
 * ==============================================================================
 * CHARTS VIEW (CHART.JS RETRACTABLE DRAWER)
 * js/ui/charts-view.js
 * 
 * Gráficos de telemetria em tempo real:
 *   1. Eventos por cômodo
 *   2. Curva de potência (Watts) por tomada
 *   3. Histograma de latência / perdas
 * ==============================================================================
 */

import { DataStore } from '../simulation/datastore.js';

export class ChartsController {
  constructor() {
    this.chartEvents = null;
    this.chartPower = null;
    this.chartLatency = null;
    this.initCharts();
  }

  initCharts() {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js ainda não carregado.");
      return;
    }

    Chart.defaults.color = "#4B5563";
    Chart.defaults.borderColor = "#E5E7EB";
    if (Chart.defaults.font) {
      Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
      Chart.defaults.font.size = 10;
    }

    const canvas1 = document.getElementById("chart-events-room");
    if (canvas1) {
      const ctx1 = canvas1.getContext("2d");
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
    }

    const canvas2 = document.getElementById("chart-power-plugs");
    if (canvas2) {
      const ctx2 = canvas2.getContext("2d");
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
    }

    const canvas3 = document.getElementById("chart-latency-loss");
    if (canvas3) {
      const ctx3 = canvas3.getContext("2d");
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
  }

  update(devices) {
    if (!this.chartEvents || !this.chartPower || !this.chartLatency) return;

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

    const totalEl = document.getElementById("chart2-total-watts");
    if (totalEl) {
      totalEl.textContent = `${Math.round(pFridge + pWasher + pPc + pTv)} W`;
    }

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
