#!/usr/bin/env bash
# deploy/scripts/deploy.cloudflared.sh
# Atalho para deploy.sh --tunnel (Cloudflare Tunnel à frente do traefik).
set -euo pipefail

exec "$(dirname "${BASH_SOURCE[0]}")/deploy.sh" --tunnel "$@"
