FROM node:22-bookworm-slim AS builder
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN pnpm install --frozen-lockfile

COPY server ./server
COPY web ./web
# Baked into the static bundle at build time (Vite inlines import.meta.env.*
# during `vite build`) — a runtime env var on the app container would be too
# late, since by then the JS has already shipped to the browser.
ARG VITE_POCKETBASE_URL
ENV VITE_POCKETBASE_URL=${VITE_POCKETBASE_URL}
RUN pnpm build:web
RUN pnpm build:server


FROM node:22-bookworm-slim AS runtime
# python3 + libusb are for print/print_label.py (brother_ql) — the label
# printer is LAN-connected (tcp://<host>:9100), but brother_ql still touches
# its USB backend on import, so libusb needs to be present.
RUN corepack enable \
    && apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv libusb-1.0-0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/web/dist ./web/dist

# Rebuilt fresh here rather than copied from the host — the checked-in
# print/venv is a macOS venv and won't run inside this Linux image.
COPY print/print_label.py print/requirements.txt ./print/
RUN python3 -m venv print/venv \
    && print/venv/bin/pip install --no-cache-dir -r print/requirements.txt

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
ENTRYPOINT ["docker-entrypoint.sh"]
