# 🏠 Smart Home IoT Lab • Simulador 3D (Tuya + Zigbee 3.0)

> **Simulador 3D Interativo de Casa Inteligente, Topologia Mesh Zigbee 3.0, Monitoramento de Potência (Watts) e Geração de Datasets para Machine Learning e Automação Residencial.**

---

## 🚀 Publicação na Vercel (Deploy Estático)

O projeto está 100% estruturado e otimizado como **Static Site** pronto para publicação contínua na **Vercel**.

### Opção 1: Deploy com 1 Clique via GitHub (Recomendado)
1. Crie um repositório no seu GitHub (ex: `smart-home-iot-lab`).
2. Faça push desta pasta para o repositório:
   ```bash
   git add .
   git commit -m "Estrutura modular para deploy na Vercel"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/smart-home-iot-lab.git
   git push -u origin main
   ```
3. Acesse o painel da **[Vercel](https://vercel.com)**:
   - Clique em **"Add New..."** > **"Project"**.
   - Selecione o repositório importado do GitHub.
   - Deixe o **Framework Preset** como **"Other"**.
   - O **Root Directory** é `./` (a raiz já contém o `index.html`).
   - Clique em **"Deploy"**.
4. Seu simulador estará online em segundos com URL mundial rápida e HTTPS automático!

### Opção 2: Deploy Direto via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## 📁 Estrutura de Pastas (Padrão Vercel)

```text
smart-home-iot-lab/
├── index.html                  # Página principal do simulador (raiz)
├── vercel.json                 # Cabeçalhos HTTP, cache e regras da Vercel
├── .vercelignore               # Ignora binários e arquivos não-estáticos
├── .gitignore                  # Controle de versão Git
├── README.md                   # Documentação do projeto
├── assemble.py                 # Wrapper de montagem/build
├── iniciar.sh                  # Script de inicialização rápida local
│
├── css/                        # Folhas de estilo da aplicação
│   └── styles.css              # Design System Editorial Sogeking, temas e responsividade
│
├── js/                         # Código JavaScript (ES2022 Modules)
│   ├── main.js                 # Script principal da aplicação carregado pelo index.html
│   └── modules/                # Módulos especializados de simulação
│       ├── config.js           # Constantes, parâmetros RF, EventBus e relógio
│       ├── radio.js            # Modelo de propagação RF e enlaces Zigbee/Wi-Fi
│       ├── devices.js          # Classes de dispositivos IoT (CT, PL, PIR, BL, CM, HUB)
│       ├── cloud-collector.js  # Coletor de telemetria e Nuvem Tuya
│       ├── resident-automation.js # Motor de automações e rotinas do morador
│       ├── datastore-scene.js  # Base de dados, exportação CSV e renderizador 3D Three.js
│       └── ui-charts.js        # Gráficos Chart.js, HUD, inspector e Guia Interativo
│
├── assets/                     # Recursos visuais e estáticos
│   ├── favicon.svg             # Ícone do simulador (SVG vetorial)
│   └── img/                    # Imagens e materiais visuais
│       ├── logo.svg            # Logotipo oficial
│       └── preview.png         # Screenshot de preview (Open Graph / redes sociais)
│
└── scripts/                    # Ferramentas auxiliares de build do desenvolvedor
    ├── assemble.py             # Script que recompila os módulos em Python para os arquivos estáticos
    ├── build_simulator.py
    └── part_*.py               # Fontes dos módulos em Python
```

---

## 💻 Como Rodar Localmente

Basta executar o script de inicialização rápida:
```bash
bash iniciar.sh
```

Ou abrir manualmente com qualquer servidor HTTP:
```bash
python3 -m http.server 8080
# Acesse no navegador: http://localhost:8080/index.html
```

---

## ✨ Funcionalidades Principais

* **Planta Baixa 3D Interativa:** Modelagem tridimensional isométrica/perspectiva feita com Three.js e OrbitControls, com foco por cômodo e alternância de paredes cortadas.
* **Topologia Mesh Zigbee 3.0 & Wi-Fi:** Coordenador central (HUB), nós finais a bateria e plugues roteadores. Visualização gráfica de saltos (hops), latência e perda de pacotes.
* **Monitoramento Elétrico de Potência (Watts):** Telemetria em tempo real das tomadas inteligentes `PL` (geladeira, lavadora, PCs, etc.).
* **Sensores de Contato (`CT`) e Presença (`PIR`):** Reed switches em portas e janelas com logs de abertura/fechamento e detecção de movimento.
* **Gaveta Retrátil de Gráficos (Chart.js):** Consumo total de energia, curva de potência individual e taxas de perda/latência.
* **Guia Interativo da IC em 12 Passos:** Tutorial didático guiado que navega pela casa em 3D explicando a teoria física de RF, topologia, NILM e pipelines de dados.
* **Extração de Datasets:** Download instantâneo de datasets em formato `.csv` e `.json` para treinamento de modelos de Inteligência Artificial.
