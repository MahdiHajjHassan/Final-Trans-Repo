#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
mkdir -p local-certs
MSYS_NO_PATHCONV=1 docker compose exec -T proxy cat /data/caddy/pki/authorities/local/root.crt > local-certs/root.crt
exec node -- scripts/checks/smoke.mjs
