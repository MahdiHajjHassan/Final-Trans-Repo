# syntax=docker/dockerfile:1
FROM node:24.22.2-bookworm@sha256:e7add2a490bb17d97b485b8641bd88455fff7839ade0f5eba493c3508124d413 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 npm_config_nodedir=/usr/local
# One source layer and one install/build layer avoid duplicating node_modules on VFS.
COPY . .
RUN --mount=type=secret,id=proxy_ca \
    --mount=type=cache,target=/root/.npm \
    set -eu; \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --include=optional --maxsockets=10 --fetch-timeout=600000; \
    node -e "require('@tailwindcss/oxide'); require('lightningcss'); require('sharp')"; \
    npm run build

FROM node:24.22.2-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS runtime
RUN --mount=type=secret,id=proxy_ca \
    set -e; \
    tictactoe_apt_ca=""; \
    if [ -f /run/secrets/proxy_ca ]; then tictactoe_apt_ca="-o Acquire::https::CaInfo=/run/secrets/proxy_ca"; fi; \
    apt-get $tictactoe_apt_ca update; \
    apt-get $tictactoe_apt_ca upgrade -y --no-install-recommends; \
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
