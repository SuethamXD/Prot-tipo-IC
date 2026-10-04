#!/usr/bin/env bash
# ==============================================================================
# Script de Inicialização Rápida • Simulador Casa Inteligente 3D (IoT Lab)
# ==============================================================================

# Entra na pasta do script
cd "$(dirname "$0")" || exit 1

echo "======================================================="
echo "   SMART HOME IOT LAB • SIMULADOR 3D TUYA + ZIGBEE"
echo "======================================================="

# 1. Reconstrói o bundle final garantindo sincronização
if command -v python3 &>/dev/null; then
    echo "[1/2] Sincronizando módulos com assemble.py..."
    python3 assemble.py > /dev/null 2>&1
fi

# 2. Inicia servidor HTTP local se a porta 8080 não estiver em uso
PORT=8080
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "[2/2] Servidor já ativo na porta $PORT."
else
    echo "[2/2] Iniciando servidor local na porta $PORT..."
    python3 -m http.server $PORT > /dev/null 2>&1 &
    SERVER_PID=$!
    sleep 0.8
fi

URL="http://localhost:$PORT/index.html"
echo ">> Abrindo navegador em: $URL"
echo ">> Pressione Ctrl+C para encerrar se iniciado por este terminal."
echo "======================================================="

# Abre no navegador padrão
if command -v xdg-open &>/dev/null; then
    xdg-open "$URL" > /dev/null 2>&1
elif command -v google-chrome &>/dev/null; then
    google-chrome "$URL" > /dev/null 2>&1 &
fi
