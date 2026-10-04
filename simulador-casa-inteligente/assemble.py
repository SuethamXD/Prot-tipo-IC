# assemble.py - Junta todas as partes no arquivo final index.html
import os
import sys

from part_head_css import HTML_HEAD_CSS
from part_body_html import HTML_BODY
from part_js_config import JS_CONFIG
from part_js_radio import JS_RADIO
from part_js_devices import JS_DEVICES
from part_js_cloud_collector import JS_CLOUD_COLLECTOR
from part_js_resident_automation import JS_RESIDENT_AUTOMATION
from part_js_datastore_scene import JS_DATASTORE_SCENE
from part_js_ui_charts import JS_UI_CHARTS

full_html = (
    HTML_HEAD_CSS
    + HTML_BODY
    + JS_CONFIG
    + JS_RADIO
    + JS_DEVICES
    + JS_CLOUD_COLLECTOR
    + JS_RESIDENT_AUTOMATION
    + JS_DATASTORE_SCENE
    + JS_UI_CHARTS
)

destinations = [
    "/home/matheusnogueira/Documentos/simulador-casa-inteligente/index.html",
    "/home/matheusnogueira/Downloads/Antigravity-x64/simulador-casa-inteligente/index.html",
    "/home/matheusnogueira/Downloads/Antigravity-x64/index.html"
]

for dest in destinations:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        f.write(full_html)
    print(f"Sucesso: gerado {dest} ({len(full_html)} bytes)")
