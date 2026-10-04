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
