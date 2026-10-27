#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p local-certs
docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt local-certs/root.crt >/dev/null
exec node -- scripts/smoke.mjs
