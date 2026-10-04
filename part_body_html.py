# part_body_html.py - Estrutura DOM do Dashboard SPA (Estética Editorial Sogeking)
HTML_BODY = '''<body>
  <div id="app-container">

    <!-- ========================================================================
         TOP NAVBAR • SMART HOME IoT LAB (HEADER EDITORIAL COM DESIGN SOGEKING)
         ======================================================================== -->
    <header id="top-bar">
      <!-- Marca & Subtítulo Técnico -->
      <div class="brand-group">
        <div class="brand-logo-icon">✦</div>
        <div class="brand-title">SMART HOME IoT LAB</div>
        <div class="brand-logo" style="display:none;">3D</div>
        <span class="badge-fixed-simulation">
          <span class="live-dot"></span>
          TUYA + ZIGBEE 3.0
        </span>
      </div>

      <!-- Controles Centrais da Simulação -->
      <div class="header-center-controls">
        <!-- Cluster Tempo & Velocidade -->
        <div class="ctrl-pill-cluster">
          <button id="btn-play-pause" class="btn-ctrl-icon" title="Atalho: Espaço">
            <span id="play-icon">⏸</span>
          </button>
          <div id="clock-display" class="clock-display">2026-10-03 06:25:00</div>
          <select id="select-sim-speed" class="sim-select-pill" title="Velocidade da Simulação (+ / -)">
            <option value="1">1x</option>
            <option value="10" selected>10x</option>
            <option value="60">60x</option>
            <option value="600">600x</option>
            <option value="3600">3600x</option>
          </select>
          <select id="select-preset" class="sim-select-pill" title="Preset de Dispositivos">
            <option value="full" selected>Preset: Completo (38)</option>
            <option value="medium">Preset: Médio (17)</option>
            <option value="minimal">Preset: Mínimo (7)</option>
          </select>
        </div>

        <!-- Cluster Câmeras & Paredes 3D -->
        <div class="ctrl-pill-cluster">
          <select id="select-camera" class="sim-select-pill" title="Ponto de Vista da Câmera (1, 2, 3)">
            <option value="perspective" selected>Perspectiva</option>
            <option value="top">Planta Topo</option>
            <option value="free">Órbita Livre</option>
          </select>
          <select id="select-wall-mode" class="sim-select-pill" title="Modo das Paredes">
            <option value="cut" selected>Paredes: Cortadas</option>
            <option value="full">Paredes: Cheias</option>
            <option value="transparent">Paredes: Transp.</option>
          </select>
        </div>

        <!-- Cluster Camadas de Visualização 3D -->
        <div class="ctrl-pill-cluster">
          <button id="btn-toggle-labels" class="sim-pill-toggle active" title="Rótulos dos Cômodos (L)">Cômodos</button>
          <button id="btn-toggle-dev-labels" class="sim-pill-toggle active" title="Rótulos dos Sensores (K)">Sensores</button>
          <button id="btn-toggle-mesh" class="sim-pill-toggle active" title="Malha Zigbee 3D (M)">Malha RF</button>
          <button id="btn-toggle-cones" class="sim-pill-toggle" title="Cones de Detecção (C)">Cones</button>
          <button id="btn-toggle-packets" class="sim-pill-toggle active" title="Pacotes Voando (P)">Pacotes</button>
        </div>
      </div>

      <!-- Ações do Lado Direito -->
      <div class="header-right-actions">
        <button id="btn-toggle-edit" class="btn-pill-outline" title="Modo Edição (E)">Modo Edição</button>
        <button id="btn-reset-sim" class="btn-pill-black" title="Reiniciar Simulação">Reiniciar 🔄</button>
      </div>
    </header>

    <!-- ========================================================================
         MAIN WORKSPACE: ESQUERDA (INVENTÁRIO) + CENTRO (VIEWPORT 3D) + DIREITA (ABAS)
         ======================================================================== -->
    <main id="main-workspace">

      <!-- ====================================================================
           SIDEBAR ESQUERDA: INVENTÁRIO DE DISPOSITIVOS IoT
           ==================================================================== -->
      <aside id="sidebar-left">
        <div class="sidebar-header">
          <div class="sidebar-title-row">
            <span class="sidebar-title">Dispositivos IoT</span>
            <span id="inventory-count-badge" class="count-badge">38</span>
          </div>
          <button id="btn-collapse-left" style="display:none;"></button>
        </div>

        <div class="sidebar-search-box">
          <input type="text" id="input-device-search" class="search-input" placeholder="Buscar dispositivo, cômodo ou ID...">
          <div class="filter-pills-row">
            <span class="filter-pill active" data-filter="all">Todos</span>
            <span class="filter-pill" data-filter="zigbee">Zigbee</span>
            <span class="filter-pill" data-filter="wifi">Wi-Fi</span>
            <span class="filter-pill" data-filter="pir">PIR</span>
            <span class="filter-pill" data-filter="mcs">Porta</span>
            <span class="filter-pill" data-filter="cz">Tomada</span>
            <span class="filter-pill" data-filter="dj">Luz</span>
          </div>
        </div>

        <div id="device-list-container" class="device-list-col">
          <!-- Renderizado dinamicamente por UIController.renderInventory() -->
        </div>
      </aside>

      <!-- ====================================================================
           VIEWPORT CENTRAL: PLANTA 3D INTERATIVA (O PROTAGONISTA DO PROJETO)
           ==================================================================== -->
      <section id="viewport-container">
        <canvas id="three-canvas" tabindex="0"></canvas>
        <div id="css2d-container"></div>

        <!-- HUD Flutuante de Monitoramento Residencial -->
        <div class="hud-overlay">
          <div class="hud-card">
            <div class="hud-title">
              <span>Monitor Residencial</span>
              <span id="sim-status-badge" class="hud-badge">Simulação Ativa</span>
            </div>
            <div class="hud-val-row">
              <span style="color:var(--text-muted);">Ambiente Ativo:</span>
              <span id="hud-active-room" style="color:var(--electric-blue);font-weight:800;">Quarto 1</span>
            </div>
            <div class="hud-val-row">
              <span style="color:var(--text-muted);">Ciclo Residencial:</span>
              <span id="hud-sim-activity" style="color:var(--text-black);font-weight:700;">Descanso Noturno</span>
            </div>
            <div class="hud-tip-row">
              Clique no piso para focar • Teclas: 1-3, L, K, M, P, E
            </div>
          </div>
        </div>

        <!-- Seletor Rápido de Câmeras Flutuante -->
        <div class="viewport-tools">
          <button id="tool-view-persp" class="tool-icon-btn active" title="Perspectiva (1)">1</button>
          <button id="tool-view-top" class="tool-icon-btn" title="Planta Topo (2)">2</button>
          <button id="tool-view-free" class="tool-icon-btn" title="Órbita Livre (3)">3</button>
        </div>

        <!-- Barra Flutuante de Modo Edição -->
        <div id="edit-mode-bar">
          <span style="font-weight:800;font-size:11px;letter-spacing:0.04em;">MODO EDIÇÃO ATIVO</span>
          <button id="btn-add-device" class="btn-pill-black" style="padding:4px 12px;font-size:11px;">+ Adicionar</button>
          <button id="btn-save-layout" class="btn-pill-outline" style="padding:4px 12px;font-size:11px;">Salvar</button>
          <button id="btn-export-layout" class="btn-pill-outline" style="padding:4px 12px;font-size:11px;">Exportar</button>
          <button id="btn-close-edit" class="btn-pill-black" style="padding:4px 12px;font-size:11px;background:#EF4444;border-color:#EF4444;">Fechar</button>
        </div>

        <!-- Drawer Inferior Acoplado: Telemetria & Gráficos Chart.js -->
        <div id="bottom-drawer" class="collapsed">
          <div id="drawer-handle-bar">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="drawer-handle-dot"></span>
              <span class="drawer-title">Telemetria & Gráficos em Tempo Real (Chart.js)</span>
            </div>
            <div style="display:flex;align-items:center;gap:14px;">
              <span style="font-size:11px;color:var(--text-muted);">Tomadas: <strong id="chart2-total-watts" style="color:var(--electric-blue);">0 W</strong></span>
              <span style="font-size:11px;color:var(--text-muted);"><strong id="chart3-loss">Perda: 0.0%</strong></span>
              <span id="drawer-toggle-icon" class="drawer-pill-toggle">▲ Expandir</span>
            </div>
          </div>
          <div id="drawer-content">
            <div class="chart-box">
              <div class="chart-header">
                <span>Eventos por Cômodo</span>
                <span style="color:var(--text-muted);font-family:var(--font-mono);font-size:10px;">Tempo Real</span>
              </div>
              <div class="chart-canvas-wrapper">
                <canvas id="chart-events-room"></canvas>
              </div>
            </div>
            <div class="chart-box">
              <div class="chart-header">
                <span>Consumo de Potência das Tomadas (Watts)</span>
                <span style="color:var(--text-muted);font-family:var(--font-mono);font-size:10px;">Medição DP 19</span>
              </div>
              <div class="chart-canvas-wrapper">
                <canvas id="chart-power-plugs"></canvas>
              </div>
            </div>
            <div class="chart-box">
              <div class="chart-header">
                <span>Latência & Distribuição de Pacotes</span>
                <span style="display:flex;gap:6px;font-size:10px;font-family:var(--font-mono);">
                  <span id="metric-avg-latency" style="color:var(--electric-blue);">0 ms</span>
                  <span id="metric-loss-rate" style="color:var(--text-muted);">0%</span>
                </span>
              </div>
              <div class="chart-canvas-wrapper">
                <canvas id="chart-latency-loss"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Container de Notificações Rápidas (Extremidade Esquerda Inferior da Casa) -->
        <div id="toast-container"></div>
      </section>

      <!-- ====================================================================
           SIDEBAR DIREITA: PAINEL DE CONTROLE DE ABAS (ALERTAS, PIPELINE, ETC)
           ==================================================================== -->
      <aside id="sidebar-right">
        <!-- Navegação de Abas Estilo Pílula -->
        <div class="tabs-nav-bar">
          <nav class="tab-nav">
            <button class="tab-btn active" data-tab="tab-notifications">🔔 Alertas <span id="notif-badge" class="count-badge" style="display:none;">0</span></button>
            <button class="tab-btn" data-tab="tab-pipeline">⚡ Pipeline</button>
            <button class="tab-btn" data-tab="tab-events">📋 Eventos</button>
            <button class="tab-btn" data-tab="tab-cloud">☁️ Nuvem</button>
            <button class="tab-btn" data-tab="tab-network">🕸️ Rede</button>
            <button class="tab-btn" data-tab="tab-labels">🏷️ Rótulos</button>
            <button class="tab-btn" data-tab="tab-faults">⚠️ Falhas</button>
            <button class="tab-btn" data-tab="tab-dataset">💾 Dataset</button>
          </nav>
        </div>

        <!-- Área de Conteúdo das Abas -->
        <div class="tab-content-area">

          <!-- ABA 1: ALERTAS & NOTIFICAÇÕES -->
          <div id="tab-notifications" class="tab-pane active">
            <div class="panel-section">
              <div class="section-title">
                <span>Central de Alertas & Notificações</span>
                <div style="display:flex;gap:6px;">
                  <button id="btn-clear-notifs" class="btn-pill-outline" style="padding:3px 10px;font-size:11px;">Limpar</button>
                </div>
              </div>
              <div class="notif-filter-pills">
                <span class="notif-filter active" data-filter="all">Todos</span>
                <span class="notif-filter" data-filter="automation">Automações</span>
                <span class="notif-filter" data-filter="fault">Falhas</span>
                <span class="notif-filter" data-filter="system">Sistema</span>
              </div>
              <div id="notif-list-container" class="notif-list-container">
                <div id="notif-empty-state" class="notif-empty">
                  Nenhum alerta pendente no momento. As notificações aparecerão aqui.
                </div>
              </div>
            </div>
          </div>

          <!-- ABA 2: PIPELINE & AUTOMAÇÕES -->
          <div id="tab-pipeline" class="tab-pane">
            <div class="panel-section">
              <div class="section-title">
                <span>Pipeline de Telemetria IoT</span>
                <span id="pipeline-status-badge" class="badge-fixed-simulation">ONLINE</span>
              </div>
              <div class="pipeline-grid">
                <div id="pnode-dev" class="pipeline-card">
                  <div class="pipeline-step-num">01. DISPOSITIVOS</div>
                  <div id="pstat-dev-sent" class="pipeline-val">0</div>
                  <div class="pipeline-sub">pacotes gerados</div>
                </div>
                <div id="pnode-hub" class="pipeline-card">
                  <div class="pipeline-step-num">02. HUB GATEWAY</div>
                  <div id="pstat-hub-proc" class="pipeline-val">0</div>
                  <div id="hub-buffer-indicator" class="pipeline-sub">Buffer: 0</div>
                </div>
                <div id="pnode-inet" class="pipeline-card">
                  <div class="pipeline-step-num">03. WAN / INTERNET</div>
                  <div id="pstat-inet-lat" class="pipeline-val" style="color:var(--electric-blue);">~120 ms</div>
                  <div id="inet-loss-rate-label" class="pipeline-sub">Perda: 0.0%</div>
                </div>
                <div id="pnode-cloud" class="pipeline-card">
                  <div class="pipeline-step-num">04. NUVEM TUYA</div>
                  <div id="pstat-cloud-recv" class="pipeline-val">0</div>
                  <div class="pipeline-sub">recebidos</div>
                </div>
              </div>
              <div id="pnode-col" style="display:none;"><span id="pstat-col-total">0</span><span id="pstat-db-rows">0</span></div>

              <!-- Regras do Motor de Automações -->
              <div class="section-title" style="margin-top:14px;">
                <span>Regras de Automação Residencial</span>
              </div>
              <div class="rules-container">
                <div class="switch-row">
                  <div>
                    <div class="switch-label">Iluminação por Presença (PIR)</div>
                    <div class="switch-desc">Acende luz ao detectar presença; apaga após 2 min.</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <select id="rule-pir-target" class="sim-select" style="width:110px;padding:3px 6px;font-size:10.5px;">
                      <option value="cloud" selected>Nuvem Tuya</option>
                      <option value="local">Hub Local</option>
                    </select>
                    <label class="toggle"><input type="checkbox" id="rule-pir-light" checked><span class="slider"></span></label>
                  </div>
                </div>

                <div class="switch-row">
                  <div>
                    <div class="switch-label">Recepção Noturna ao Abrir Portas</div>
                    <div class="switch-desc">Acende corredor se porta for aberta à noite.</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <select id="rule-night-target" class="sim-select" style="width:110px;padding:3px 6px;font-size:10.5px;">
                      <option value="local" selected>Hub Local</option>
                      <option value="cloud">Nuvem Tuya</option>
                    </select>
                    <label class="toggle"><input type="checkbox" id="rule-night-door" checked><span class="slider"></span></label>
                  </div>
                </div>

                <div class="switch-row">
                  <div>
                    <div class="switch-label">Controle Solar de Cortinas</div>
                    <div class="switch-desc">Fecha cortinas durante pico solar de calor.</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <select id="rule-solar-target" class="sim-select" style="width:110px;padding:3px 6px;font-size:10.5px;">
                      <option value="cloud" selected>Nuvem Tuya</option>
                      <option value="local">Hub Local</option>
                    </select>
                    <label class="toggle"><input type="checkbox" id="rule-solar-curtain" checked><span class="slider"></span></label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ABA 3: EVENTOS AO VIVO -->
          <div id="tab-events" class="tab-pane">
            <div class="panel-section">
              <div class="section-title">
                <span>Fluxo de Telemetria Contínua</span>
                <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);">LAN & Tuya Stream</span>
              </div>
              <div class="events-table-wrapper">
                <table class="events-table">
                  <thead>
                    <tr>
                      <th>Horário</th>
                      <th>Dispositivo</th>
                      <th>Cômodo</th>
                      <th>Código DP</th>
                      <th>Valor</th>
                      <th>Origem</th>
                      <th>Latência</th>
                    </tr>
                  </thead>
                  <tbody id="events-table-body">
                    <!-- Linhas injetadas dinamicamente -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ABA 4: NUVEM TUYA -->
          <div id="tab-cloud" class="tab-pane">
            <div class="panel-section">
              <div class="section-title">
                <span>Tuya Cloud Platform Emulation</span>
                <span id="cloud-quota-text" style="font-family:var(--font-mono);font-size:11px;">0 / 10000 req</span>
              </div>
              <div style="height:6px;background:var(--border-color);border-radius:999px;overflow:hidden;margin-bottom:12px;">
                <div id="cloud-quota-bar" style="width:0%;height:100%;background:var(--electric-blue);transition:width 0.3s;"></div>
              </div>
              <div class="section-title">
                <span>Push Message Service Stream (JSON)</span>
              </div>
              <pre id="cloud-message-stream" class="code-pre-stream">{}</pre>
            </div>
          </div>

          <!-- ABA 5: REDE ZIGBEE 3.0 -->
          <div id="tab-network" class="tab-pane">
            <div class="panel-section">
              <div class="section-title">
                <span>Topologia da Malha Zigbee 3.0</span>
                <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);">Multi-hop Mesh</span>
              </div>
              <div id="mesh-topology-tree" class="mesh-tree-container">
                <!-- Árvore gerada dinamicamente -->
              </div>
            </div>
          </div>

          <!-- ABA 6: RÓTULOS & ETIQUETAS 3D -->
          <div id="tab-labels" class="tab-pane">
            <div class="panel-section">
              <div class="section-title">
                <span>Gerenciador de Rótulos 3D</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div class="sub-card">
                  <div style="font-weight:800;font-size:12px;color:var(--text-black);margin-bottom:2px;">Rótulos de Cômodos</div>
                  <div style="font-size:10.5px;color:var(--text-muted);margin-bottom:8px;">Nomes no piso da casa.</div>
                  <label style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:11.5px;cursor:pointer;">
                    <input type="checkbox" id="checkbox-room-labels-master" checked style="accent-color:var(--electric-blue);">
                    Cômodos (<span id="room-labels-status-text" style="color:var(--electric-blue);">VISÍVEIS</span>)
                  </label>
                </div>
                <div class="sub-card">
                  <div style="font-weight:800;font-size:12px;color:var(--text-black);margin-bottom:2px;">Rótulos de Sensores</div>
                  <div style="font-size:10.5px;color:var(--text-muted);margin-bottom:8px;">Tags flutuantes sobre os dispositivos.</div>
                  <label style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:11.5px;cursor:pointer;">
                    <input type="checkbox" id="checkbox-sensor-labels-master" checked style="accent-color:var(--electric-blue);">
                    Sensores (<span id="sensor-labels-status-text" style="color:var(--electric-blue);">VISÍVEIS</span>)
                  </label>
                  <span id="sensor-labels-badge" style="display:none;"></span>
                </div>
              </div>

              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                <label style="font-size:11px;display:flex;align-items:center;gap:4px;"><input type="checkbox" id="chk-lbl-show-name" checked> Nome / ID</label>
                <label style="font-size:11px;display:flex;align-items:center;gap:4px;"><input type="checkbox" id="chk-lbl-show-proto" checked> Protocolo</label>
                <label style="font-size:11px;display:flex;align-items:center;gap:4px;"><input type="checkbox" id="chk-lbl-show-state" checked> Estado</label>
                <button id="btn-lbl-all-on" class="btn-pill-outline" style="padding:2px 8px;font-size:10.5px;">Todos ON</button>
                <button id="btn-lbl-all-off" class="btn-pill-outline" style="padding:2px 8px;font-size:10.5px;">Todos OFF</button>
                <button id="btn-lbl-only-zigbee" class="btn-pill-outline" style="padding:2px 8px;font-size:10.5px;">Só Zigbee</button>
                <button id="btn-lbl-only-wifi" class="btn-pill-outline" style="padding:2px 8px;font-size:10.5px;">Só Wi-Fi</button>
              </div>

              <input type="text" id="input-label-dev-search" class="search-input" style="margin-top:8px;" placeholder="Filtrar dispositivos da lista...">
              <span id="lbl-device-filter-count" style="display:none;"></span>
              <div id="labels-device-list-container" class="labels-list-container"></div>
            </div>
          </div>

          <!-- ABA 7: INJETOR DE FALHAS & ESTRESSE -->
          <div id="tab-faults" class="tab-pane">
            <div class="panel-section">
              <div class="section-title">
                <span>Injeção de Falhas e Degradação</span>
              </div>
              <div class="switch-row">
                <div>
                  <div class="switch-label">Falha na Conexão WAN / Internet</div>
                  <div class="switch-desc">Corta a nuvem Tuya. O Hub acumula eventos em buffer local.</div>
                </div>
                <label class="toggle"><input type="checkbox" id="fault-internet-down"><span class="slider"></span></label>
              </div>
              <div class="switch-row">
                <div>
                  <div class="switch-label">Falha Total do HUB Zigbee</div>
                  <div class="switch-desc">Desconecta o coordenador. Todos os Zigbee ficam offline.</div>
                </div>
                <label class="toggle"><input type="checkbox" id="fault-hub-offline"><span class="slider"></span></label>
              </div>
              <div class="switch-row">
                <div>
                  <div class="switch-label">Pico de Latência na Nuvem (+2000ms)</div>
                  <div class="switch-desc">Simula instabilidade na rota internacional AWS/Tuya.</div>
                </div>
                <label class="toggle"><input type="checkbox" id="fault-cloud-spike"><span class="slider"></span></label>
              </div>
              <div class="switch-row">
                <div>
                  <div class="switch-label">Expiração de Licença Tuya (HTTP 403)</div>
                  <div class="switch-desc">Simula erro 403 Forbidden para verificação do tratamento.</div>
                </div>
                <label class="toggle"><input type="checkbox" id="fault-trial-expired"><span class="slider"></span></label>
              </div>
              <div class="switch-row">
                <div>
                  <div class="switch-label">Interferência de Rádio RF 2.4GHz</div>
                  <div class="switch-desc">Aumenta atenuação RF simulando ruído severo de Wi-Fi adjacente.</div>
                </div>
                <label class="toggle"><input type="checkbox" id="fault-rf-interference"><span class="slider"></span></label>
              </div>
              <div class="switch-row">
                <div>
                  <div class="switch-label">Buffer Local no Hub Ativo</div>
                  <div class="switch-desc">Permite enfileirar eventos quando a WAN cai para descarga posterior.</div>
                </div>
                <label class="toggle"><input type="checkbox" id="opt-hub-buffer" checked><span class="slider"></span></label>
              </div>
              <div style="padding-top:10px;">
                <div class="switch-label">Perda Global Adicional de Pacotes RF: <span id="label-global-loss" style="color:var(--electric-blue);font-weight:700;">0%</span></div>
                <input type="range" id="slider-global-loss" min="0" max="60" value="0" style="width:100%;margin-top:6px;accent-color:var(--electric-blue);">
              </div>
            </div>
          </div>

          <!-- ABA 8: DATASET & API -->
          <div id="tab-dataset" class="tab-pane">
            <div class="panel-section">
              <div class="section-title">
                <span>Tuya OpenAPI Explorer & Datasets</span>
                <span id="dataset-total-rows" style="font-family:var(--font-mono);font-size:11px;">0 registros</span>
              </div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <select id="api-device-select" class="sim-select-pill" style="max-width:180px;"></select>
                <select id="api-endpoint-select" class="sim-select-pill" style="max-width:200px;">
                  <option value="status">GET /v1.0/devices/{id}/status</option>
                  <option value="spec">GET /v1.0/devices/{id}/specifications</option>
                  <option value="logs">GET /v1.0/devices/{id}/logs</option>
                </select>
                <button id="btn-call-api" class="btn-pill-black" style="padding:5px 14px;font-size:11px;">Executar API</button>
              </div>
              <pre id="api-response-box" class="code-pre-stream" style="max-height:140px;color:#A7F3D0;">{}</pre>

              <div class="section-title" style="margin-top:12px;">
                <span>Exportação de Dados para ML</span>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button id="btn-export-json" class="btn-pill-outline" style="font-size:11px;">Exportar JSON</button>
                <button id="btn-export-csv" class="btn-pill-outline" style="font-size:11px;">Exportar CSV</button>
                <button id="btn-export-jsonl" class="btn-pill-outline" style="font-size:11px;">Exportar JSONL</button>
                <button id="btn-export-window" class="btn-pill-outline" style="font-size:11px;">Janela 15min</button>
                <button id="btn-clear-db" class="btn-pill-black" style="background:#EF4444;border-color:#EF4444;font-size:11px;">Limpar Dados</button>
              </div>

              <div class="section-title" style="margin-top:12px;">
                <span>Resumo de Estado para LLM</span>
                <button id="btn-copy-llm" class="btn-pill-outline" style="padding:2px 8px;font-size:10px;">Copiar Resumo</button>
              </div>
              <pre id="llm-state-summary" class="code-pre-stream" style="max-height:140px;white-space:pre-wrap;color:#E5E7EB;">Carregando estado...</pre>
            </div>
          </div>

        </div>
      </aside>

    </main>

    <!-- ========================================================================
         MODAIS & TOASTS
         ======================================================================== -->

    <!-- Modal de Detalhes do Dispositivo -->
    <div id="device-detail-modal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div id="modal-device-title" class="modal-title">Detalhes do Dispositivo</div>
          <button id="btn-close-modal" class="modal-close">&times;</button>
        </div>
        <div id="modal-device-body"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
          <button id="modal-btn-force" class="btn-pill-black" style="background:var(--electric-blue);border-color:var(--electric-blue);">⚡ Forçar Evento</button>
          <button id="modal-btn-proto" class="btn-pill-outline">Alternar Protocolo</button>
          <button id="modal-btn-offline" class="btn-pill-outline" style="color:#EF4444;border-color:#EF4444;">Alternar Online</button>
        </div>
      </div>
    </div>

    <!-- Modal de Adição de Dispositivo -->
    <div id="add-device-modal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title">+ Adicionar Dispositivo IoT</div>
          <button id="btn-close-add-modal" class="modal-close">&times;</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="font-size:11px;font-weight:700;">Categoria:</label>
            <select id="new-dev-type" class="sim-select-pill" style="width:100%;margin-top:4px;">
              <option value="pir">Sensor PIR de Presença</option>
              <option value="mcs">Sensor de Abertura Porta/Janela</option>
              <option value="cz">Tomada Inteligente com Medição</option>
              <option value="dj">Lâmpada Inteligente CCT</option>
              <option value="sp">Câmera Wi-Fi com Detecção</option>
              <option value="cl">Motor de Cortina</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;">Protocolo:</label>
            <select id="new-dev-proto" class="sim-select-pill" style="width:100%;margin-top:4px;">
              <option value="zigbee">Zigbee 3.0</option>
              <option value="wifi">Wi-Fi 2.4GHz</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;">Cômodo:</label>
            <select id="new-dev-room" class="sim-select-pill" style="width:100%;margin-top:4px;">
              <option value="Quarto 1">Quarto 1</option>
              <option value="Quarto 2">Quarto 2</option>
              <option value="Quarto 3">Quarto 3</option>
              <option value="Cozinha">Cozinha</option>
              <option value="Lavanderia">Lavanderia</option>
              <option value="Corredor Central">Corredor Central</option>
              <option value="Banheiro Social">Banheiro Social</option>
            </select>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
            <button id="btn-confirm-add-device" class="btn-pill-black">Confirmar Adição</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</body>
'''
