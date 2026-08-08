#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PROJECT_NAME="login-frontend"
ENV_FILE=".env"
BUILD=true
OBSERVABILITY=false
HEALTH_TIMEOUT=120

usage() {
  cat <<EOF
Uso: deploy.sh [opções]

Sobe o stack do compose.yaml (traefik + frontend + autoheal + watchtower + redis).

Opções:
  -o, --observability  Inclui compose.observability.yaml (prometheus, grafana, node-exporter)
      --no-build       Não reconstrói o frontend; usa a imagem existente/GHCR
  -h, --help           Mostra esta ajuda

O .env (DOMAIN, ACME_EMAIL, ACME_CA_SERVER, DOCKER_IMAGE_OWNER, VITE_API_BASE_URL) é
criado a partir de example.env se não existir.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o | --observability) OBSERVABILITY=true ;;
    --no-build) BUILD=false ;;
    -h | --help) usage; exit 0 ;;
    *) echo "opção desconhecida: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if ! command -v docker >/dev/null 2>&1; then
  echo "ERRO: docker não encontrado." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERRO: daemon do Docker não está respondendo." >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  echo "Usando $ENV_FILE existente."
else
  cp example.env "$ENV_FILE"
  echo "Criado $ENV_FILE a partir de example.env."
  echo "AVISO: edite $ENV_FILE (DOMAIN, ACME_EMAIL, ACME_CA_SERVER, ...) antes de prosseguir."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

DOMAIN="${DOMAIN:-localhost}"
ACME_EMAIL="${ACME_EMAIL:-admin@exemplo.com}"
ACME_CA_SERVER="${ACME_CA_SERVER:-https://acme-staging-v02.api.letsencrypt.org/directory}"
DOCKER_IMAGE_OWNER="${DOCKER_IMAGE_OWNER:-ofcoliva}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api/v1}"
PORT="${PORT:-80}"

if [[ "$ACME_EMAIL" == "admin@exemplo.com" ]]; then
  echo "AVISO: ACME_EMAIL é o placeholder (admin@exemplo.com) — certidão Let's Encrypt pode falhar."
fi

if [[ "$ACME_CA_SERVER" != "https://acme-v02.api.letsencrypt.org/directory" ]]; then
  echo "AVISO: ACME_CA_SERVER usa o ambiente STAGING; troque para a URL oficial em produção."
fi

echo "==> pull de imagens"
docker compose pull

if $BUILD; then
  echo "==> build do frontend (VITE_API_BASE_URL=$VITE_API_BASE_URL)"
  docker compose build
else
  echo "==> --no-build: usando imagem existente"
fi

echo "==> renderizando config estática do traefik (deploy/traefik/traefik.yaml)"
mkdir -p deploy/traefik
envsubst < deploy/traefik/traefik.yaml > deploy/traefik/traefik.generated.yaml
if grep -q '\${ACME' deploy/traefik/traefik.generated.yaml; then
  echo "ERRO: placeholder \${ACME_* não resolvido no traefik.generated.yaml." >&2
  exit 1
fi

COMPOSE_FILES=(-f compose.yaml)
if $OBSERVABILITY; then
  COMPOSE_FILES+=(-f compose.observability.yaml)
fi

echo "==> up -d"
docker compose "${COMPOSE_FILES[@]}" up -d

echo "==> aguardando healthchecks (timeout ${HEALTH_TIMEOUT}s)"
deadline=$((SECONDS + HEALTH_TIMEOUT))
ps_json() { docker compose "${COMPOSE_FILES[@]}" ps --format json; }
while [[ $SECONDS -lt $deadline ]]; do
  if ps_json | grep '"Service":"traefik"' | grep -q '"Health":"healthy"' &&
     ps_json | grep '"Service":"frontend"' | grep -q '"Health":"healthy"'; then
    echo "==> traefik e frontend healthy"
    break
  fi
  sleep 5
done

if ps_json | grep '"Service":"frontend"' | grep -q '"Health":"healthy"'; then
  code=$(curl -ks -o /dev/null -w '%{http_code}' -H "Host: localhost" --max-time 10 "https://127.0.0.1:$PORT/healthz" || true)
  echo "==> healthz via traefik: HTTP $code"
  if [[ "$code" != "200" ]]; then
    echo "AVISO: healthz não respondeu 200 (código $code)."
  fi
else
  echo "ERRO: frontend não ficou healthy dentro de ${HEALTH_TIMEOUT}s." >&2
  docker compose "${COMPOSE_FILES[@]}" ps >&2 || true
  docker compose "${COMPOSE_FILES[@]}" logs --tail=50 traefik frontend >&2 || true
  exit 1
fi

echo
echo "==> stack em execução:"
docker compose "${COMPOSE_FILES[@]}" ps
echo
if [[ "$PORT" == "443" ]]; then
  PUBLIC_URL="https://$DOMAIN"
else
  PUBLIC_URL="https://$DOMAIN:$PORT"
fi
echo "URL pública: $PUBLIC_URL (cert Let's Encrypt via DNS-01)"
if [[ "$ACME_CA_SERVER" != "https://acme-v02.api.letsencrypt.org/directory" ]]; then
  echo "(HTTPS com certificado real exige ACME_CA_SERVER oficial em produção)"
fi
