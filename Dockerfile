# ============================================
# OpenCode WebUI - 完整版
# ============================================
# opencode 后端 + 前端静态文件
# 暴露：3000 (前端) / 4096 (API)
# 由物理机 nginx 反向代理

# ---- Stage 1: 构建前端 ----
FROM node:22-alpine AS frontend

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ENV VITE_API_BASE_URL=/api
RUN npm run build

# ---- Stage 2: 运行时 ----
FROM alpine:3.21

# opencode 需要的运行时依赖
RUN apk add --no-cache \
    bash \
    curl \
    git \
    caddy \
    libgcc \
    libstdc++

# 官方方式安装 opencode
RUN curl -fsSL https://opencode.ai/install | bash \
    && OPENCODE_BIN=$(find /root -name opencode -type f 2>/dev/null | head -1) \
    && if [ -n "$OPENCODE_BIN" ]; then ln -sf "$OPENCODE_BIN" /usr/local/bin/opencode; fi \
    && opencode --version

# 前端产物
COPY --from=frontend /app/dist /srv

# 配置文件
COPY docker/Caddyfile /etc/caddy/Caddyfile
RUN sed -i 's/\r$//' /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

RUN mkdir -p /workspace

ENV OPENCODE_DISABLE_AUTOUPDATE=true \
    OPENCODE_DISABLE_TERMINAL_TITLE=true \
    WORKSPACE=/workspace

EXPOSE 3000 4096
WORKDIR /workspace
ENTRYPOINT ["/entrypoint.sh"]
