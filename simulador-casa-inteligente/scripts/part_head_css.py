# part_head_css.py - HTML head, CDNs e CSS completo do Dashboard SPA (Estética Sogeking)
HTML_HEAD_CSS = '''<!DOCTYPE html>
<html lang="pt-BR">
<!--
================================================================================
SMART HOME IoT SIMULATOR 3D (TUYA + ZIGBEE 3.0)
Executive SPA Dashboard • Estética Editorial Sogeking:
- Fundo Clean Off-White (#F6F7F9 / #FFFFFF)
- Tipografia Editorial de Alto Contraste (Outfit + Plus Jakarta Sans + JetBrains Mono)
- Acento Assinatura: Azul Elétrico Royal (#0038FF)
- Bordas Finas Nítidas (1px solid #E5E7EB), Cantos Arredondados e Pílulas (999px)
- Layout SPA Focado no Protagonismo da Planta 3D e Abas Funcionais
================================================================================
-->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Home IoT Simulator 3D • Tuya + Zigbee 3.0</title>
  <meta name="description" content="Simulador 3D interativo de casa inteligente (Tuya + Zigbee 3.0) com telemetria em tempo real e injeção de falhas.">

  <!-- Google Fonts: Outfit (Display & Títulos), Plus Jakarta Sans (UI Geral), JetBrains Mono (Telemetria) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- Three.js 0.160.0 via importmap -->
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
  }
  </script>

  <!-- Chart.js 4.4.1 (UMD) -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

  <style>
    /* ==========================================================================
       DESIGN SYSTEM • VARIÁVEIS GLOBAIS (ESTÉTICA SOGEKING)
       ========================================================================== */
    :root {
      /* Fundo da Interface */
      --bg-page: #F6F7F9;
      --bg-white: #FFFFFF;
      --bg-card: #FFFFFF;
      --bg-card-subtle: #F8F9FA;
      --bg-dark: #0A0A0E;
      --bg-dark-card: #12131A;

      /* Bordas Nítidas de 1px */
      --border-color: #E5E7EB;
      --border-light: #ECEEF2;
      --border-subtle: #F1F3F6;
      --border-dark: #0A0A0E;

      /* Tipografia */
      --text-black: #0A0A0E;
      --text-main: #1F2937;
      --text-muted: #6B7280;
      --text-dim: #9CA3AF;
      --text-white: #FFFFFF;

      /* Assinatura Sogeking: Azul Elétrico Royal (#0038FF) */
      --electric-blue: #0038FF;
      --electric-blue-hover: #002ECC;
      --electric-blue-light: #3366FF;
      --electric-blue-tint: #EEF2FF;
      --accent-teal: #0038FF; /* Mapeamento de compatibilidade */
      --accent-teal-dark: #0026C4;
      --accent-cyan: #00F2FE;
      --accent-amber: #F59E0B;
      --accent-red: #EF4444;
      --accent-emerald: #10B981;
      --accent-purple: #7C3AED;

      /* Sombras Sutis */
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.05);
      --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.08);

      /* Famílias Tipográficas */
      --font-display: 'Outfit', sans-serif;
      --font-sans: 'Plus Jakarta Sans', -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      margin: 0;
      padding: 0;
      background-color: var(--bg-page);
      color: var(--text-black);
      font-family: var(--font-sans);
      font-size: 13px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }

    /* Scrollbars personalizadas estilo editorial */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: var(--bg-card-subtle);
    }
    ::-webkit-scrollbar-thumb {
      background: #D1D5DB;
      border-radius: 999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #9CA3AF;
    }

    /* ==========================================================================
       ESTRUTURA GERAL DO DASHBOARD SPA (100VW x 100VH)
       ========================================================================== */
    #app-container {
      width: 100vw;
      height: 100vh;
      max-width: 100vw;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    /* ==========================================================================
       HEADER SUPERIOR • TOP BAR (54px)
       ========================================================================== */
    #top-bar {
      height: 54px;
      min-height: 54px;
      max-height: 54px;
      background: var(--bg-white);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      flex-shrink: 0;
      z-index: 100;
      gap: 12px;
    }

    /* Marca Editorial */
    .brand-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .brand-logo-icon {
      width: 26px;
      height: 26px;
      border: 1.5px solid var(--text-black);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      color: var(--text-black);
      background: #FFFFFF;
      transition: all 0.2s ease;
    }
    .brand-logo-icon:hover {
      border-color: var(--electric-blue);
      color: var(--electric-blue);
      transform: rotate(45deg);
    }
    .brand-title {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-black);
      text-transform: uppercase;
    }
    .badge-fixed-simulation {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--electric-blue-tint);
      color: var(--electric-blue);
      border: 1px solid rgba(0, 56, 255, 0.15);
      font-size: 10px;
      font-weight: 700;
      font-family: var(--font-mono);
      padding: 3px 8px;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-emerald);
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
      animation: pulseGreen 2s infinite;
    }
    @keyframes pulseGreen {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.85); }
    }

    /* Controles Centrais da Simulação */
    .header-center-controls {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
      padding: 4px 4px;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }
    .header-center-controls::-webkit-scrollbar {
      height: 3px;
    }
    .header-center-controls::-webkit-scrollbar-track {
      background: transparent;
    }
    .header-center-controls::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 999px;
    }
    .header-center-controls::-webkit-scrollbar-thumb:hover {
      background: var(--electric-blue);
    }
    .ctrl-pill-cluster {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 3px;
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 2px 5px;
    }
    .btn-ctrl-icon {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: none;
      background: var(--text-black);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.15s ease;
    }
    .btn-ctrl-icon:hover {
      background: var(--electric-blue);
    }
    .btn-ctrl-icon.active {
      background: var(--accent-amber);
    }
    .clock-display {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-black);
      padding: 0 6px;
      user-select: none;
      white-space: nowrap;
    }
    .sim-select-pill {
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10.5px;
      font-weight: 600;
      color: var(--text-black);
      outline: none;
      cursor: pointer;
      font-family: var(--font-sans);
      transition: border-color 0.15s;
    }
    .sim-select-pill:hover, .sim-select-pill:focus {
      border-color: var(--text-black);
    }
    .sim-pill-toggle {
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10.5px;
      font-weight: 700;
      color: var(--text-muted);
      cursor: pointer;
      font-family: var(--font-sans);
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .sim-pill-toggle:hover {
      border-color: var(--text-black);
      color: var(--text-black);
    }
    .sim-pill-toggle.active {
      background: var(--electric-blue);
      border-color: var(--electric-blue);
      color: #FFFFFF;
    }

    /* Ações do Lado Direito */
    .header-right-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    /* Botões Pílula Estilo Sogeking */
    .btn-pill-black {
      background: var(--text-black);
      color: #FFFFFF;
      border: 1px solid var(--text-black);
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 11.5px;
      font-weight: 700;
      font-family: var(--font-sans);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
      white-space: nowrap;
      text-decoration: none;
    }
    .btn-pill-black:hover {
      background: var(--electric-blue);
      border-color: var(--electric-blue);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 56, 255, 0.2);
    }
    .btn-pill-outline {
      background: #FFFFFF;
      color: var(--text-black);
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 5px 12px;
      font-size: 11.5px;
      font-weight: 700;
      font-family: var(--font-sans);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
      white-space: nowrap;
      text-decoration: none;
    }
    .btn-pill-outline:hover {
      border-color: var(--text-black);
      background: var(--bg-card-subtle);
    }
    .btn-pill-outline.active {
      background: var(--electric-blue);
      border-color: var(--electric-blue);
      color: #FFFFFF;
    }

    /* ==========================================================================
       MAIN WORKSPACE (CORPO DO APLICATIVO)
       ========================================================================== */
    #main-workspace {
      flex: 1;
      display: flex;
      flex-direction: row;
      overflow: hidden;
      position: relative;
      width: 100%;
      height: calc(100vh - 54px);
    }

    /* ==========================================================================
       SIDEBAR ESQUERDA • INVENTÁRIO DE DISPOSITIVOS (300px)
       ========================================================================== */
    #sidebar-left {
      width: 300px;
      min-width: 300px;
      max-width: 300px;
      height: 100%;
      background: var(--bg-white);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 15;
      flex-shrink: 0;
    }
    .sidebar-header {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #FFFFFF;
      flex-shrink: 0;
    }
    .sidebar-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sidebar-title {
      font-family: var(--font-display);
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: var(--text-black);
      text-transform: uppercase;
    }
    .count-badge {
      background: var(--text-black);
      color: #FFFFFF;
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 999px;
    }
    .sidebar-search-box {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-color);
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }
    .search-input {
      width: 100%;
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 11.5px;
      color: var(--text-black);
      outline: none;
      font-family: var(--font-sans);
      transition: all 0.15s ease;
    }
    .search-input:focus {
      border-color: var(--electric-blue);
      background: #FFFFFF;
      box-shadow: 0 0 0 2px rgba(0, 56, 255, 0.1);
    }
    .filter-pills-row {
      display: flex;
      align-items: center;
      gap: 4px 6px;
      flex-wrap: wrap;
      padding: 2px 0 2px 0;
    }
    .filter-pill {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 2.5px 8px;
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      user-select: none;
    }
    .filter-pill:hover {
      border-color: var(--text-black);
      color: var(--text-black);
    }
    .filter-pill.active {
      background: var(--electric-blue);
      border-color: var(--electric-blue);
      color: #FFFFFF;
    }

    /* Caixa de Legenda de Siglas dos Sensores (CT, PL, PIR, etc.) */
    .sidebar-siglas-box {
      margin-top: 4px;
      padding-top: 6px;
      border-top: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .siglas-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .siglas-title {
      font-size: 9.5px;
      font-weight: 800;
      color: var(--text-black);
      font-family: var(--font-display);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .siglas-hint {
      font-size: 9px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .siglas-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }
    .sigla-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-light);
      border-radius: 6px;
      padding: 3px 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
      min-width: 0;
    }
    .sigla-badge:hover {
      border-color: var(--electric-blue);
      background: #FFFFFF;
      box-shadow: 0 2px 6px rgba(0, 56, 255, 0.1);
      transform: translateY(-1px);
    }
    .sigla-code {
      font-family: var(--font-mono);
      font-weight: 800;
      font-size: 9.5px;
      color: var(--electric-blue);
      background: var(--electric-blue-tint);
      padding: 1px 4px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .sigla-desc {
      font-size: 9px;
      font-weight: 600;
      color: var(--text-black);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .device-room-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    .dev-type-badge {
      font-size: 9px;
      font-weight: 700;
      font-family: var(--font-sans);
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-light);
      color: var(--text-muted);
      white-space: nowrap;
    }

    /* Lista Colunar de Cards de Dispositivos */
    .device-list-col {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--bg-page);
    }
    .device-card {
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 10px 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
      box-shadow: var(--shadow-sm);
    }
    .device-card:hover {
      border-color: var(--text-black);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    .device-card.selected {
      border-color: var(--electric-blue);
      box-shadow: 0 0 0 1.5px var(--electric-blue), var(--shadow-md);
    }
    .device-card.offline {
      opacity: 0.6;
      filter: grayscale(0.5);
    }
    .device-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    .device-name {
      font-weight: 700;
      font-size: 12px;
      font-family: var(--font-display);
      color: var(--text-black);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .device-room {
      font-size: 10px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .proto-badge {
      font-size: 8.5px;
      padding: 1px 6px;
      border-radius: 999px;
      font-weight: 700;
      font-family: var(--font-mono);
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .proto-zigbee { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    .proto-wifi { background: var(--electric-blue-tint); color: var(--electric-blue); border: 1px solid #D6E4FF; }
    .proto-hub { background: #EDE9FE; color: #6D28D9; border: 1px solid #DDD6FE; }

    .device-metrics {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 4px;
      margin-top: 2px;
      border-top: 1px solid var(--border-light);
      font-size: 9.5px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .metric-val {
      font-weight: 600;
      color: var(--text-black);
    }

    /* ==========================================================================
       VIEWPORT CENTRAL • PLANTA 3D INTERATIVA (O PROTAGONISTA)
       ========================================================================== */
    #viewport-container {
      flex: 1;
      height: 100%;
      position: relative;
      background: #E8EBF0;
      overflow: hidden;
    }
    #three-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      outline: none;
      display: block;
    }
    #css2d-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
      z-index: 10;
      clip-path: inset(0 0 34px 0);
      transition: clip-path 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #viewport-container.drawer-open #css2d-container {
      clip-path: inset(0 0 235px 0);
    }

    /* Rótulos dos Cômodos no Piso 3D */
    .room-label-pill {
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 3px 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      text-align: center;
      pointer-events: none;
      user-select: none;
      transition: opacity 0.2s ease;
      white-space: nowrap;
    }
    .room-label-pill .title {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 11px;
      color: var(--text-black);
      letter-spacing: -0.01em;
      display: block;
    }
    .room-label-pill .subtitle {
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--text-muted);
      display: block;
    }

    /* Rótulos Flutuantes dos Sensores 3D */
    .device-label-pill {
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 2px 7px;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      pointer-events: auto;
      user-select: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      white-space: nowrap;
    }
    .device-label-pill:hover {
      border-color: var(--electric-blue);
      box-shadow: 0 0 12px rgba(0, 56, 255, 0.4);
      z-index: 50;
    }
    .device-label-pill .dev-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .device-label-pill .dev-id {
      font-family: var(--font-mono);
      font-size: 9.5px;
      font-weight: 700;
      color: var(--text-black);
    }
    .device-label-pill .dev-status {
      font-family: var(--font-mono);
      font-size: 9px;
      font-weight: 700;
      color: var(--electric-blue);
    }
    .device-label-pill.active-pulse {
      animation: devPulse 0.8s ease-out;
      border-color: var(--electric-blue) !important;
    }
    @keyframes devPulse {
      0% { box-shadow: 0 0 16px rgba(0, 56, 255, 0.9); }
      50% { box-shadow: 0 0 8px rgba(0, 56, 255, 0.5); }
      100% { box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12); }
    }

    /* Ocultamento seletivo de elementos da etiqueta 3D */
    body.hide-lbl-name .dev-id { display: none !important; }
    body.hide-lbl-proto .dev-dot { display: none !important; }
    body.hide-lbl-state .dev-status { display: none !important; }

    /* HUD Flutuante no Topo do Viewport */
    .hud-overlay {
      position: absolute;
      top: 14px;
      left: 14px;
      z-index: 15;
      pointer-events: none;
    }
    .hud-card {
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 10px 14px;
      pointer-events: auto;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 210px;
    }
    .hud-title {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 800;
      font-family: var(--font-display);
      color: var(--text-black);
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .hud-badge {
      background: var(--text-black);
      color: #FFFFFF;
      padding: 1px 6px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 9px;
    }
    .hud-val-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 600;
    }
    .hud-tip-row {
      font-size: 9px;
      color: var(--text-muted);
      margin-top: 3px;
      border-top: 1px solid var(--border-light);
      padding-top: 3px;
    }

    /* Seletor Rápido de Câmeras Flutuante */
    .viewport-tools {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 15;
      display: flex;
      gap: 4px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(10px);
      padding: 4px;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
    }
    .tool-icon-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: var(--text-black);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 11.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tool-icon-btn:hover {
      background: var(--border-color);
    }
    .tool-icon-btn.active {
      background: var(--text-black);
      color: #FFFFFF;
    }

    /* Barra Flutuante de Modo Edição */
    #edit-mode-bar {
      position: absolute;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      background: #FFFFFF;
      border: 1.5px solid var(--text-black);
      border-radius: 999px;
      padding: 6px 16px;
      display: none;
      align-items: center;
      gap: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      z-index: 30;
    }

    /* ==========================================================================
       DRAWER INFERIOR ACOPLADO • GRÁFICOS CHART.JS
       ========================================================================== */
    #bottom-drawer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 60;
      background: var(--bg-white);
      border-top: 1px solid var(--border-color);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
    }
    #bottom-drawer.collapsed {
      transform: translateY(195px);
    }
    #drawer-handle-bar {
      height: 34px;
      min-height: 34px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      background: var(--bg-white);
      cursor: pointer;
      user-select: none;
      border-bottom: 1px solid var(--border-color);
    }
    #drawer-handle-bar:hover {
      background: var(--bg-card-subtle);
    }
    .drawer-handle-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--electric-blue);
    }
    .drawer-title {
      font-family: var(--font-display);
      font-size: 11.5px;
      font-weight: 800;
      color: var(--text-black);
      letter-spacing: -0.01em;
    }
    .drawer-pill-toggle {
      font-size: 10.5px;
      font-weight: 700;
      color: var(--text-black);
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 2px 10px;
      transition: all 0.15s ease;
    }
    .drawer-pill-toggle:hover {
      border-color: var(--text-black);
    }
    #drawer-content {
      height: 195px;
      padding: 10px 14px;
      display: grid;
      grid-template-columns: 1fr 1.2fr 1fr;
      gap: 12px;
      background: var(--bg-card-subtle);
      overflow: hidden;
    }
    .chart-box {
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      height: 100%;
      box-shadow: var(--shadow-sm);
    }
    .chart-header {
      font-size: 10.5px;
      font-weight: 700;
      font-family: var(--font-display);
      color: var(--text-black);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chart-canvas-wrapper {
      flex: 1;
      position: relative;
      min-height: 0;
    }

    /* ==========================================================================
       SIDEBAR DIREITA • PAINEL DE CONTROLE DE ABAS (440px)
       ========================================================================== */
    #sidebar-right {
      width: 440px;
      min-width: 440px;
      max-width: 440px;
      height: 100%;
      background: var(--bg-white);
      border-left: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 15;
      flex-shrink: 0;
    }
    .tabs-nav-bar {
      border-bottom: 1px solid var(--border-color);
      padding: 8px 10px;
      background: #FFFFFF;
      flex-shrink: 0;
      overflow-x: auto;
    }
    .tab-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow-x: auto;
      scrollbar-width: none;
      white-space: nowrap;
    }
    .tab-nav::-webkit-scrollbar {
      display: none;
    }
    .tab-btn {
      padding: 5px 12px;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: var(--bg-card-subtle);
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font-sans);
      cursor: pointer;
      transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      user-select: none;
    }
    .tab-btn:hover {
      border-color: var(--text-black);
      color: var(--text-black);
      background: #FFFFFF;
    }
    .tab-btn.active {
      background: var(--electric-blue);
      color: #FFFFFF;
      border-color: var(--electric-blue);
    }
    .tab-btn.active .count-badge {
      background: #FFFFFF;
      color: var(--electric-blue);
    }

    .tab-content-area {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      background: var(--bg-page);
    }
    .tab-pane {
      display: none;
      flex-direction: column;
      gap: 12px;
    }
    .tab-pane.active {
      display: flex;
    }

    /* Painéis e Seções de Conteúdo */
    .panel-section {
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: var(--shadow-sm);
    }
    .section-title {
      font-size: 11.5px;
      font-weight: 800;
      font-family: var(--font-display);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-black);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Central de Notificações */
    .notif-filter-pills {
      display: flex;
      gap: 4px;
      margin-bottom: 2px;
    }
    .notif-filter {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: var(--bg-card-subtle);
      color: var(--text-muted);
      cursor: pointer;
      user-select: none;
    }
    .notif-filter:hover {
      border-color: var(--text-black);
    }
    .notif-filter.active {
      background: var(--text-black);
      color: #FFFFFF;
      border-color: var(--text-black);
    }
    .notif-list-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 480px;
      overflow-y: auto;
    }
    .notif-item {
      background: var(--bg-card-subtle);
      border-left: 3px solid var(--electric-blue);
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 11.5px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .notif-item.warn {
      border-left-color: var(--accent-amber);
      background: #FFFBEB;
    }
    .notif-item.error {
      border-left-color: var(--accent-red);
      background: #FEF2F2;
    }
    .notif-item.system {
      border-left-color: var(--text-black);
    }
    .notif-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 9.5px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .notif-tag {
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 999px;
      font-size: 8.5px;
      text-transform: uppercase;
    }
    .notif-tag.automation { background: var(--electric-blue-tint); color: var(--electric-blue); }
    .notif-tag.fault { background: #FEE2E2; color: #DC2626; }
    .notif-tag.system { background: #E5E7EB; color: #374151; }
    .notif-repeat-badge {
      background: var(--text-black);
      color: #FFFFFF;
      font-size: 9px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 999px;
      margin-left: 4px;
    }
    .notif-empty {
      text-align: center;
      padding: 24px 12px;
      color: var(--text-muted);
      font-size: 11.5px;
    }

    /* Pipeline Diagrama em Cards */
    .pipeline-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .pipeline-card {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .pipeline-step-num {
      font-size: 9.5px;
      font-weight: 700;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .pipeline-val {
      font-size: 20px;
      font-weight: 900;
      font-family: var(--font-display);
      color: var(--text-black);
      line-height: 1.1;
    }
    .pipeline-sub {
      font-size: 9.5px;
      color: var(--text-muted);
    }

    /* Regras e Switches */
    .rules-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      gap: 8px;
    }
    .switch-label {
      font-weight: 700;
      font-size: 11.5px;
      color: var(--text-black);
    }
    .switch-desc {
      font-size: 10px;
      color: var(--text-muted);
      line-height: 1.3;
    }

    /* Toggle Switch iOS minimalista */
    .toggle {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
    }
    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #D1D5DB;
      transition: .2s;
      border-radius: 999px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    input:checked + .slider {
      background-color: var(--electric-blue);
    }
    input:checked + .slider:before {
      transform: translateX(16px);
    }

    /* Tabela de Eventos */
    .events-table-wrapper {
      max-height: 480px;
      overflow-y: auto;
      border: 1px solid var(--border-color);
      border-radius: 10px;
    }
    .events-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      text-align: left;
    }
    .events-table th {
      background: var(--bg-card-subtle);
      padding: 7px 10px;
      font-weight: 700;
      font-family: var(--font-display);
      color: var(--text-black);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .events-table td {
      padding: 6px 10px;
      border-bottom: 1px solid var(--border-light);
      font-family: var(--font-mono);
      font-size: 10px;
    }
    .events-table tr:hover {
      background: var(--electric-blue-tint);
    }

    /* Stream Code Block */
    .code-pre-stream {
      background: var(--bg-dark);
      color: #93C5FD;
      padding: 12px;
      border-radius: 10px;
      font-family: var(--font-mono);
      font-size: 10.5px;
      max-height: 220px;
      overflow-y: auto;
      line-height: 1.4;
      border: 1px solid #1F2937;
    }

    /* Árvore Zigbee Mesh */
    .mesh-tree-container {
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 12px;
      font-family: var(--font-mono);
      font-size: 11px;
      max-height: 400px;
      overflow-y: auto;
      line-height: 1.5;
    }

    /* Gerenciador de Rótulos 3D */
    .sub-card {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 10px;
    }
    .labels-list-container {
      max-height: 240px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 6px;
    }
    .label-device-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 11px;
    }
    .label-device-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .label-device-name {
      font-weight: 700;
      color: var(--text-black);
    }
    .label-device-room {
      font-size: 9.5px;
      color: var(--text-muted);
    }
    .label-device-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-locate-dev {
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      cursor: pointer;
    }
    .btn-locate-dev:hover {
      border-color: var(--electric-blue);
    }

    /* Modais */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10, 10, 14, 0.6);
      backdrop-filter: blur(4px);
      z-index: 200;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.active {
      display: flex;
    }
    .modal-card {
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: 20px;
      width: 90%;
      max-width: 480px;
      padding: 22px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 14px;
      animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 10px;
    }
    .modal-title {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 800;
      color: var(--text-black);
    }
    .modal-close {
      background: none;
      border: none;
      font-size: 20px;
      font-weight: 700;
      color: var(--text-muted);
      cursor: pointer;
    }
    .modal-close:hover {
      color: var(--text-black);
    }
    .dp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 6px;
    }
    .dp-table th {
      text-align: left;
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-color);
      font-size: 10px;
      color: var(--text-muted);
    }
    .dp-table td {
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-light);
      font-family: var(--font-mono);
      font-size: 10.5px;
    }

    /* Container de Notificações Rápidas • Extremidade Esquerda Inferior da Casa */
    #toast-container {
      position: absolute;
      bottom: 46px; /* Posicionado 12px acima da barra recolhida do drawer (34px + 12px) */
      left: 16px;
      z-index: 55;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: flex-start;
      max-width: 340px;
      transition: bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #toast-container.drawer-open,
    #viewport-container.drawer-open #toast-container {
      bottom: 246px; /* Posicionado 11px acima do drawer aberto (235px + 11px), 100% visível na casa 3D sem sobrepor gráficos */
    }
    .toast {
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid var(--border-color);
      border-left: 3.5px solid var(--electric-blue);
      border-radius: 999px;
      padding: 5px 12px;
      font-size: 11px;
      font-weight: 600;
      font-family: var(--font-sans);
      color: var(--text-black);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      pointer-events: auto;
      white-space: nowrap;
      animation: toastSlideIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      transition: opacity 0.18s ease, transform 0.18s ease;
    }
    .toast strong {
      font-weight: 700;
      color: var(--text-black);
    }
    .toast.warn {
      border-left-color: var(--accent-amber);
      background: #FFFDF5;
    }
    .toast.error {
      border-left-color: var(--accent-red);
      background: #FEF2F2;
    }
    /* ==========================================================================
       BOTAO DO GUIA INTERATIVO (HEADER)
       ========================================================================== */
    .btn-pill-tour {
      background: var(--electric-blue);
      color: #FFFFFF;
      border: 1px solid var(--electric-blue);
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 11.5px;
      font-weight: 700;
      font-family: var(--font-sans);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
      white-space: nowrap;
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(0, 56, 255, 0.25);
    }
    .btn-pill-tour:hover {
      background: #002ECC;
      border-color: #002ECC;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(0, 56, 255, 0.35);
    }
    .btn-pill-tour.active {
      background: var(--accent-emerald);
      border-color: var(--accent-emerald);
    }

    /* ==========================================================================
       GUIA INTERATIVO DA INICIAÇÃO CIENTÍFICA (MODAL FLUTUANTE)
       ========================================================================== */
    .tour-card {
      position: fixed;
      bottom: 24px;
      left: 330px;
      width: 480px;
      max-width: calc(100vw - 360px);
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1.5px solid var(--text-black);
      border-radius: 16px;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05);
      z-index: 1200;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 1;
      animation: tourCardSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes tourCardSlideUp {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .tour-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-light);
      background: #FAF8F5;
    }
    .tour-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tour-badge {
      background: var(--text-black);
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 800;
      font-family: var(--font-mono);
      padding: 2px 8px;
      border-radius: 999px;
      letter-spacing: 0.02em;
    }
    .tour-section-tag {
      font-size: 10.5px;
      font-weight: 700;
      color: var(--electric-blue);
      font-family: var(--font-mono);
    }
    .tour-close-btn {
      background: none;
      border: none;
      font-size: 18px;
      line-height: 1;
      color: var(--text-muted);
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 6px;
      transition: all 0.15s;
    }
    .tour-close-btn:hover {
      color: var(--accent-red);
      background: rgba(239, 68, 68, 0.1);
    }
    .tour-progress-bar-container {
      width: 100%;
      height: 3px;
      background: var(--border-light);
    }
    .tour-progress-bar-fill {
      height: 100%;
      background: var(--electric-blue);
      width: 8.33%;
      transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tour-card-body {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 340px;
    }
    .tour-title-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .tour-icon {
      font-size: 24px;
      line-height: 1.1;
      flex-shrink: 0;
    }
    .tour-title-wrap {
      flex: 1;
    }
    .tour-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 800;
      color: var(--text-black);
      margin: 0;
      line-height: 1.25;
      letter-spacing: -0.01em;
    }
    .tour-subtitle {
      font-size: 11px;
      color: var(--text-muted);
      margin: 2px 0 0 0;
      line-height: 1.3;
    }
    .tour-content-scroll {
      overflow-y: auto;
      font-size: 11.5px;
      line-height: 1.55;
      color: #374151;
      padding-right: 4px;
      scrollbar-width: thin;
      max-height: 200px;
    }
    .tour-content-scroll p {
      margin: 0 0 8px 0;
    }
    .tour-content-scroll ul {
      margin: 4px 0 8px 16px;
      padding: 0;
    }
    .tour-content-scroll li {
      margin-bottom: 4px;
    }
    .tour-callout {
      background: #F3F4F6;
      border-left: 3.5px solid var(--electric-blue);
      padding: 8px 10px;
      border-radius: 0 8px 8px 0;
      font-size: 11px;
      margin: 8px 0;
      color: var(--text-black);
    }
    .tour-callout.warning {
      border-left-color: var(--accent-amber);
      background: #FFFDF5;
    }
    .tour-code-box {
      background: #111827;
      color: #F9FAFB;
      font-family: var(--font-mono);
      font-size: 10.5px;
      padding: 8px 10px;
      border-radius: 8px;
      margin: 8px 0;
      overflow-x: auto;
    }
    .tour-action-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 6px;
      border-top: 1px solid var(--border-light);
    }
    .tour-btn-action {
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-black);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .tour-btn-action:hover {
      background: var(--electric-blue);
      color: #FFFFFF;
      border-color: var(--electric-blue);
    }
    .tour-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #FAF8F5;
      border-top: 1px solid var(--border-light);
    }
    .btn-tour-nav {
      padding: 5px 14px;
      font-size: 11px;
      font-weight: 700;
    }
    .tour-step-indicators {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .tour-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--border-color);
      cursor: pointer;
      transition: all 0.2s;
    }
    .tour-dot:hover {
      background: var(--text-black);
    }
    .tour-dot.active {
      width: 14px;
      border-radius: 999px;
      background: var(--electric-blue);
    }
  </style>
</head>
'''
