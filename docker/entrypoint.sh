#!/bin/sh
set -e

WORKSPACE="${WORKSPACE:-/workspace}"
mkdir -p "$WORKSPACE"
cd "$WORKSPACE"

echo "[opencode-webui] starting..."
echo "[opencode-webui] opencode $(opencode --version 2>/dev/null || echo 'unknown')"

# ---- 启动 opencode 后端 ----
opencode serve \
    --port 4096 \
    --hostname 0.0.0.0 \
    &
OC_PID=$!

# 等后端就绪
i=0
while [ $i -lt 30 ]; do
    if curl -sf http://127.0.0.1:4096/global/health >/dev/null 2>&1; then
        echo "[opencode-webui] backend ready"
        break
    fi
    i=$((i + 1))
    sleep 1
done

# ---- 启动 caddy（serve 前端） ----
caddy run --config /etc/caddy/Caddyfile &
CADDY_PID=$!

echo "[opencode-webui] running  ui=:3000  api=:4096"

# ---- 优雅退出 ----
cleanup() {
    kill $CADDY_PID $OC_PID 2>/dev/null || true
    wait
    exit 0
}
trap cleanup TERM INT QUIT

wait -n $OC_PID $CADDY_PID 2>/dev/null || true
cleanup
