# syntax=docker/dockerfile:1
FROM node:24.19.0-bookworm@sha256:4196d66a565c6f195728d9952f161f4adfe2ad753052a08b7ec7f1c5a6bda42b AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 npm_config_nodedir=/usr/local
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci
COPY . .
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm run build

FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS runtime
RUN --mount=type=secret,id=proxy_ca \
    set -e; \
    tictactoe_apt_ca=""; \
    if [ -f /run/secrets/proxy_ca ]; then tictactoe_apt_ca="-o Acquire::https::CaInfo=/run/secrets/proxy_ca"; fi; \
    apt-get $tictactoe_apt_ca update; \
    apt-get $tictactoe_apt_ca install -y --no-install-recommends openssl; \
    apt-get clean; \
    mkdir -p /data; \
    chown node:node /data
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DATABASE_URL=file:/data/tictactoe.db
# Copy once: repeated large COPY/RUN layers waste space on VFS-based builders.
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["sh", "scripts/start.sh"]
