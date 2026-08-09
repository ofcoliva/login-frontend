#!/usr/bin/env bash
# Wrapper de conveniência → deploy/scripts/deploy.sh --tunnel
set -euo pipefail

exec "$(dirname "${BASH_SOURCE[0]}")/deploy/scripts/deploy.sh" --tunnel "$@"
