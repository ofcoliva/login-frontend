#!/usr/bin/env bash
# deploy/scripts/lib.sh
# Funções compartilhadas pelos scripts de deploy.
# Uso: source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PROJECT_NAME="login-frontend"
ENV_FILE="$REPO_ROOT/.env"
COMPOSE_DIR="$REPO_ROOT/deploy/compose"
STATE_FILE="$REPO_ROOT/deploy/.bluegreen"
STATIC_TPL="$REPO_ROOT/deploy/traefik/traefik.yaml"
STATIC_GENERATED="$REPO_ROOT/deploy/traefik/traefik.generated.yaml"
DYNAMIC_FILE="$REPO_ROOT/deploy/traefik/dynamic/frontend.yaml"
HEALTH_TIMEOUT=120

log() { printf '%s\n' "$*"; }

die() { echo "ERRO: $*" >&2; exit 1; }

require_docker() {
  command -v docker >/dev/null 2>&1 || die "docker não encontrado."
  docker info >/dev/null 2>&1 || die "daemon do Docker não está respondendo."
}

# Carrega o .env (cria a partir de example.env se não existir).
# require=false permite comandos de leitura (status/prune/down) sem .env.
load_env() {
  local require="${1:-true}"
  if [[ ! -f "$ENV_FILE" ]]; then
    cp "$REPO_ROOT/example.env" "$ENV_FILE"
    log "Criado $ENV_FILE a partir de example.env."
    if [[ "$require" == "true" ]]; then
      die "edite $ENV_FILE (DOMAIN, ACME_EMAIL, ...) antes de prosseguir."
    fi
  fi
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a

  DOMAIN="${DOMAIN:-localhost}"
  ACME_EMAIL="${ACME_EMAIL:-admin@exemplo.com}"
  ACME_CA_SERVER="${ACME_CA_SERVER:-https://acme-staging-v02.api.letsencrypt.org/directory}"
  DOCKER_IMAGE_OWNER="${DOCKER_IMAGE_OWNER:-ofcoliva}"
  VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api/v1}"
  PORT="${PORT:-80}"
}

# ---- estado blue/green (deploy/.bluegreen) ----
read_state() {
  ACTIVE=""
  BLUE_IMAGE=""
  GREEN_IMAGE=""
  if [[ -f "$STATE_FILE" ]]; then
    # shellcheck source=/dev/null
    source "$STATE_FILE"
    [[ -n "${ACTIVE:-}" ]] || ACTIVE=""
  fi
}

write_state() {
  cat > "$STATE_FILE" <<EOF
ACTIVE=$ACTIVE
BLUE_IMAGE=$BLUE_IMAGE
GREEN_IMAGE=$GREEN_IMAGE
EOF
}

slot_image() {
  if [[ "$1" == "blue" ]]; then
    printf '%s' "${BLUE_IMAGE}"
  else
    printf '%s' "${GREEN_IMAGE}"
  fi
}

# ---- imagem ----
image_name() { printf 'ghcr.io/%s/login-frontend' "$DOCKER_IMAGE_OWNER"; }

current_sha() {
  git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "dev"
}

build_image() {
  local tag="$1"
  log "==> build de $tag"
  docker build --build-arg "VITE_API_BASE_URL=$VITE_API_BASE_URL" -t "$tag" "$REPO_ROOT"
}

pull_image() {
  local tag="$1"
  log "==> pull de $tag"
  docker pull "$tag"
}

# ---- traefik ----
# Renderiza a config estática (deploy/traefik/traefik.yaml -> traefik.generated.yaml).
# Se o conteúdo mudou e o traefik já está rodando, reinicia o container para aplicar
# (config estática só é lida no boot; as rotas dinâmicas não exigem restart).
render_traefik_static() {
  local before="" after=""
  [[ -f "$STATIC_GENERATED" ]] && before="$(md5sum "$STATIC_GENERATED" | awk '{print $1}')"
  mkdir -p "$(dirname "$STATIC_GENERATED")"
  envsubst < "$STATIC_TPL" > "$STATIC_GENERATED"
  if grep -q '\${ACME' "$STATIC_GENERATED"; then
    die "placeholders \${ACME_* não resolvidos em $STATIC_GENERATED."
  fi
  after="$(md5sum "$STATIC_GENERATED" | awk '{print $1}')"
  if [[ "$before" != "$after" ]] && container_exists login-frontend-traefik-1; then
    log "==> config estática mudou; reiniciando traefik para aplicar"
    docker restart login-frontend-traefik-1 >/dev/null
  fi
}

# Lê os weights atuais do arquivo dinâmico (fonte de verdade operacional).
current_weights() {
  BLUE_WEIGHT="100"
  GREEN_WEIGHT="0"
  [[ -f "$DYNAMIC_FILE" ]] || return 0
  local b g
  b="$(awk '/name: frontend-blue/{f=1} f && /weight:/{print $2; exit}' "$DYNAMIC_FILE")"
  g="$(awk '/name: frontend-green/{f=1} f && /weight:/{print $2; exit}' "$DYNAMIC_FILE")"
  [[ -n "$b" ]] && BLUE_WEIGHT="$b"
  [[ -n "$g" ]] && GREEN_WEIGHT="$g"
}

# Regenera deploy/traefik/dynamic/frontend.yaml com os weights fornecidos.
# A troca de weights é aplicada pelo traefik automaticamente (file provider + watch).
render_dynamic() {
  local wblue="$1" wgreen="$2" tmp
  log "==> renderizando deploy/traefik/dynamic/frontend.yaml (blue=$wblue green=$wgreen)"
  mkdir -p "$(dirname "$DYNAMIC_FILE")"
  tmp="$(mktemp)"
  export DOMAIN
  export BLUE_WEIGHT="$wblue" GREEN_WEIGHT="$wgreen"
  envsubst <<'EOF' > "$tmp"
http:
  routers:
    frontend:
      rule: "Host(`${DOMAIN}`)"
      entryPoints:
        - websecure
      service: frontend-wrr
      tls:
        certResolver: letsencrypt
      middlewares:
        - frontend-ratelimit
        - frontend-secureheaders

    frontend-http:
      rule: "Host(`${DOMAIN}`)"
      entryPoints:
        - web
      service: frontend-wrr
      middlewares:
        - redirect-to-https

    frontend-local:
      rule: "Host(`localhost`) || Host(`127.0.0.1`)"
      entryPoints:
        - web
      service: frontend-wrr
      middlewares:
        - frontend-ratelimit
        - frontend-secureheaders

    frontend-local-secure:
      rule: "Host(`localhost`) || Host(`127.0.0.1`)"
      entryPoints:
        - websecure
      service: frontend-wrr
      tls: {}
      middlewares:
        - frontend-ratelimit
        - frontend-secureheaders

  services:
    frontend-wrr:
      weighted:
        services:
          - name: frontend-blue
            weight: ${BLUE_WEIGHT}
          - name: frontend-green
            weight: ${GREEN_WEIGHT}

    frontend-blue:
      loadBalancer:
        passHostHeader: true
        servers:
          - url: "http://frontend-blue:8080"

    frontend-green:
      loadBalancer:
        passHostHeader: true
        servers:
          - url: "http://frontend-green:8080"

  middlewares:
    frontend-ratelimit:
      rateLimit:
        average: 100
        burst: 50
    frontend-secureheaders:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        referrerPolicy: strict-origin-when-cross-origin
    redirect-to-https:
      redirectScheme:
        scheme: https
        permanent: true
EOF
  mv "$tmp" "$DYNAMIC_FILE"
}

# primary recebe 100; secondary 0.
switch_weights() {
  local primary="$1" secondary="$2" wb wg
  wb=0
  wg=0
  if [[ "$primary" == "blue" ]]; then
    wb=100
  else
    wg=100
  fi
  render_dynamic "$wb" "$wg"
  log "==> weights do traefik: blue=$wb green=$wg (recarga automática via file provider)"
  sleep 3
}

verify_public() {
  local code
  code="$(curl -ks -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" --max-time 10 "https://127.0.0.1:$PORT/healthz" || true)"
  log "==> healthz via traefik (Host: $DOMAIN): HTTP $code"
  if [[ "$code" != "200" ]]; then
    log "AVISO: healthz não respondeu 200 (código $code)." >&2
  fi
}

# ---- containers / healthcheck ----
wait_container_healthy() {
  local cname="$1" timeout="${2:-$HEALTH_TIMEOUT}"
  local deadline=$((SECONDS + timeout)) state health
  while ((SECONDS < deadline)); do
    state="$(docker inspect -f '{{.State.Status}}' "$cname" 2>/dev/null || true)"
    [[ -n "$state" ]] || state="ausente"
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$cname" 2>/dev/null || true)"
    [[ -n "$health" ]] || health="ausente"
    if [[ "$state" == "running" && "$health" == "healthy" ]]; then
      log "==> $cname healthy"
      return 0
    fi
    sleep 5
  done
  log "ERRO: $cname não ficou healthy em ${timeout}s." >&2
  docker logs --tail=50 "$cname" >&2 || true
  return 1
}

wait_cloudflared() {
  log "==> aguardando registro do Cloudflare Tunnel (até 60s)..."
  local ok="" deadline=$((SECONDS + 60))
  while ((SECONDS < deadline)); do
    if compose_base logs --tail=300 cloudflared 2>/dev/null | grep -q "Registered tunnel connection"; then
      ok=1
      break
    fi
    sleep 3
  done
  if [[ -n "$ok" ]]; then
    log "==> Cloudflare Tunnel registrado"
  else
    log "AVISO: não detectei 'Registered tunnel connection' no cloudflared." >&2
    log "AVISO: confira CF_TUNNEL_TOKEN no .env e o hostname no dashboard (Zero Trust → Tunnels)." >&2
  fi
}

container_exists() {
  [[ -n "$(docker ps -a --filter "name=^/$1\$" --format '{{.Names}}')" ]]
}

public_url() {
  if [[ "$TUNNEL" == "true" || "$PORT" == "443" ]]; then
    printf 'https://%s' "$DOMAIN"
  else
    printf 'https://%s:%s' "$DOMAIN" "$PORT"
  fi
}
