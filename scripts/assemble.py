#!/usr/bin/env python3
"""
scripts/assemble.py
Compilador/gerador estático para o Simulador Casa Inteligente 3D (IoT Lab).
Lê os módulos em Python e atualiza:
  - css/styles.css
  - js/main.js
  - js/modules/*.js
  - index.html
"""
import os
import sys

# Garante import relativo à pasta de scripts
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from part_head_css import HTML_HEAD_CSS
from part_body_html import HTML_BODY
from part_js_config import JS_CONFIG
from part_js_radio import JS_RADIO
from part_js_devices import JS_DEVICES
from part_js_cloud_collector import JS_CLOUD_COLLECTOR
from part_js_resident_automation import JS_RESIDENT_AUTOMATION
from part_js_datastore_scene import JS_DATASTORE_SCENE
from part_js_ui_charts import JS_UI_CHARTS

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

# 1. Extração do CSS
css_start = HTML_HEAD_CSS.find('<style>') + len('<style>')
css_end = HTML_HEAD_CSS.rfind('</style>')
css_content = HTML_HEAD_CSS[css_start:css_end].strip()

css_path = os.path.join(ROOT_DIR, "css", "styles.css")
os.makedirs(os.path.dirname(css_path), exist_ok=True)
with open(css_path, "w", encoding="utf-8") as f:
    f.write(css_content + "\n")
print(f"Sucesso: {css_path} ({len(css_content)} bytes)")

# 2. Extração dos Módulos JS
import re

def clean_module(raw):
    s = raw.replace('<script type="module">', '').replace('</script>', '').replace('</body>', '').replace('</html>', '')
    s = re.sub(r'<!--.*?-->', '', s, flags=re.DOTALL)
    return s.strip()

modules = {
    "config.js": clean_module(JS_CONFIG),
    "radio.js": clean_module(JS_RADIO),
    "devices.js": clean_module(JS_DEVICES),
    "cloud-collector.js": clean_module(JS_CLOUD_COLLECTOR),
    "resident-automation.js": clean_module(JS_RESIDENT_AUTOMATION),
    "datastore-scene.js": clean_module(JS_DATASTORE_SCENE),
    "ui-charts.js": clean_module(JS_UI_CHARTS)
}

modules_dir = os.path.join(ROOT_DIR, "js", "modules")
os.makedirs(modules_dir, exist_ok=True)
for filename, content in modules.items():
    mod_path = os.path.join(modules_dir, filename)
    with open(mod_path, "w", encoding="utf-8") as f:
        f.write(content + "\n")
    print(f"Sucesso: {mod_path} ({len(content)} bytes)")

# 3. Montagem do js/main.js
banner = """/**
 * ==============================================================================
 * SMART HOME IoT SIMULATOR 3D (TUYA + ZIGBEE 3.0)
 * Main Application Bundle (ES2022 Module)
 * Architecture:
 *   1. CONFIG & SYSTEM CLOCK (js/modules/config.js)
 *   2. RF RADIO PROPAGATION & ZIGBEE MESH (js/modules/radio.js)
 *   3. IOT DEVICES & SENSORS (js/modules/devices.js)
 *   4. CLOUD TUYA & TELEMETRY COLLECTOR (js/modules/cloud-collector.js)
 *   5. RESIDENT BEHAVIOR & AUTOMATION ENGINE (js/modules/resident-automation.js)
 *   6. DATASTORE & 3D THREE.JS SCENE (js/modules/datastore-scene.js)
 *   7. UI CONTROLLERS, CHARTS & INTERACTIVE TOUR (js/modules/ui-charts.js)
 *   8. APP INITIALIZATION & ANIMATION LOOP
 * ==============================================================================
 */\n\n"""

full_js = banner + "\n\n".join(modules.values())
main_js_path = os.path.join(ROOT_DIR, "js", "main.js")
with open(main_js_path, "w", encoding="utf-8") as f:
    f.write(full_js + "\n")
print(f"Sucesso: {main_js_path} ({len(full_js)} bytes)")

# 4. Geração do index.html
head_before_style = HTML_HEAD_CSS[:HTML_HEAD_CSS.find('<style>')].strip()

new_index_html = (
    head_before_style
    + "\n\n"
    + '  <!-- Favicon & Open Graph (Assets) -->\n'
    + '  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">\n'
    + '  <link rel="apple-touch-icon" href="assets/img/preview.png">\n'
    + '  <meta property="og:title" content="Smart Home IoT Simulator 3D • Tuya + Zigbee 3.0">\n'
    + '  <meta property="og:description" content="Simulador 3D interativo com rede mesh Zigbee 3.0, sensores de contato, telemetria de potência e pipeline de dados para Machine Learning.">\n'
    + '  <meta property="og:image" content="assets/img/preview.png">\n'
    + '  <meta name="twitter:card" content="summary_large_image">\n\n'
    + '  <!-- Folha de Estilos Modular para Deploy Vercel -->\n'
    + '  <link rel="stylesheet" href="css/styles.css">\n'
    + '</head>\n'
    + HTML_BODY.strip()
    + "\n\n"
    + '  <!-- Script Modular da Aplicação (ES2022 Module) -->\n'
    + '  <script type="module" src="js/main.js"></script>\n'
    + '</body>\n'
    + '</html>\n'
)

index_html_path = os.path.join(ROOT_DIR, "index.html")
with open(index_html_path, "w", encoding="utf-8") as f:
    f.write(new_index_html)
print(f"Sucesso: {index_html_path} ({len(new_index_html)} bytes)")
