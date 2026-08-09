#!/usr/bin/env bash
# deploy/scripts/deploy.sh
# Deploy blue/green do login-frontend com Docker Compose + Traefik.
# A troca de tráfego entre os slots é feita editando os weights do arquivo
# dinâmico do traefik (deploy/traefik/dynamic/frontend.yaml) — recarga atômica
# sem downtime (providers.file.watch).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

OBSERVABILITY=false
TUNNEL=false
BUILD=true

usage() {
  cat <<'EOF'
Uso: deploy.sh [opções] [comando]

Deploy blue/green do frontend com Docker Compose + Traefik.

Comandos:
  deploy                  [padrão] Sobe um novo build no slot INATIVO e troca os
                          weights do traefik (100/0) — zero downtime. O slot
                          anterior fica idle para rollback instantâneo.
  rollback                Re-sobe o slot standby (imagem gravada) e inverte os
                          weights, voltando o tráfego para a versão anterior.
  switch <blue|green>     Troca os weights manualmente para o slot indicado.
  status                  Mostra slots, imagens, health e weights atuais.
  prune <blue|green>      Remove o container do slot INATIVO (mantém a imagem
                          registrada para um futuro redeploy/rollback).
  down                    Derruba todo o stack (infra + slots).

Opções:
  -o, --observability     Inclui prometheus, grafana e node-exporter.
  -t, --tunnel            Inclui o Cloudflare Tunnel à frente do traefik.
      --no-build          Não constrói; usa/puxa a imagem com a tag <sha> já
                          publicada (ex.: GHCR).
  -h, --help              Mostra esta ajuda.

Exemplos:
  ./deploy.sh                    # deploy blue/green com build local
  ./deploy.sh --tunnel           # idem com Cloudflare Tunnel
  ./deploy.sh --no-build         # usa a imagem já publicada no GHCR
  ./deploy.sh status
  ./deploy.sh rollback
  ./deploy.sh prune green
EOF
}

# ---- parse de argumentos ----
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o | --observability) OBSERVABILITY=true; shift ;;
    -t | --tunnel) TUNNEL=true; shift ;;
    --no-build) BUILD=false; shift ;;
    -h | --help) usage; exit 0 ;;
    -*) echo "opção desconhecida: $1" >&2; usage; exit 1 ;;
    *) ARGS+=("$1"); shift ;;
  esac
done

COMMAND="${ARGS[0]:-deploy}"

# ---- arquivos de compose (project-directory = raiz do repositório) ----
COMPOSE_ARGS=(--project-directory "$REPO_ROOT")
BASE_FILES=(-f "$COMPOSE_DIR/base.yaml")
if $OBSERVABILITY; then
  BASE_FILES+=(-f "$COMPOSE_DIR/observability.yaml")
fi
if $TUNNEL; then
  BASE_FILES+=(-f "$COMPOSE_DIR/cloudflared.yaml")
fi
FRONT_FILES=("${BASE_FILES[@]}" -f "$COMPOSE_DIR/frontend.yaml")

compose_base() { docker compose "${COMPOSE_ARGS[@]}" "${BASE_FILES[@]}" "$@"; }
compose_fe() { docker compose "${COMPOSE_ARGS[@]}" "${FRONT_FILES[@]}" "$@"; }

# ---- comandos ----
cmd_deploy() {
  read_state
  local active="${ACTIVE:-}"
  local target other
  if [[ -z "$active" ]]; then
    # primeiro deploy: começa no slot blue
    target="blue"
    other="green"
  elif [[ "$active" == "green" ]]; then
    target="blue"
    other="green"
  else
    target="green"
    other="blue"
  fi

  if [[ "$ACME_EMAIL" == "admin@exemplo.com" ]]; then
    log "AVISO: ACME_EMAIL é o placeholder (admin@exemplo.com) — certidão Let's Encrypt pode falhar." >&2
  fi
  if [[ "$ACME_CA_SERVER" != "https://acme-v02.api.letsencrypt.org/directory" ]]; then
    log "AVISO: ACME_CA_SERVER usa o ambiente STAGING; troque para a URL oficial em produção." >&2
  fi
  if $TUNNEL && [[ -z "${CF_TUNNEL_TOKEN:-}" ]]; then
    die "--tunnel requer CF_TUNNEL_TOKEN no .env (token do Cloudflare Tunnel)."
  fi

  local sha tag
  sha="$(current_sha)"
  tag="$(image_name):$sha"

  if $BUILD; then
    build_image "$tag"
  else
    pull_image "$tag"
  fi

  render_traefik_static

  log "==> subindo infra (traefik, autoheal, watchtower)"
  compose_base pull
  compose_base up -d
  wait_container_healthy login-frontend-traefik-1 || die "traefik não ficou healthy."

  log "==> subindo slot $target (imagem $tag)"
  FRONTEND_IMAGE="$tag" compose_fe up -d "frontend-$target"
  wait_container_healthy "login-frontend-$target" || die "slot $target não subiu; deploy abortado."

  switch_weights "$target" "$other"
  verify_public

  ACTIVE="$target"
  if [[ "$target" == "blue" ]]; then
    BLUE_IMAGE="$tag"
  else
    GREEN_IMAGE="$tag"
  fi
  write_state

  if $TUNNEL; then
    wait_cloudflared
  fi

  echo
  log "==> stack em execução:"
  compose_fe ps
  echo
  log "URL pública: $(public_url)"
}

cmd_rollback() {
  read_state
  local active="${ACTIVE:-blue}"
  [[ "$active" == "blue" || "$active" == "green" ]] || active="blue"
  local other
  if [[ "$active" == "blue" ]]; then other="green"; else other="blue"; fi

  local img
  img="$(slot_image "$other")"
  if [[ -z "$img" ]]; then
    die "slot $other não tem imagem registrada; rode 'deploy' antes de 'rollback'."
  fi

  log "==> rollback: ativo=$active -> $other (imagem $img)"
  FRONTEND_IMAGE="$img" compose_fe up -d "frontend-$other"
  wait_container_healthy "login-frontend-$other" || die "slot $other não subiu; rollback abortado."

  switch_weights "$other" "$active"
  verify_public

  ACTIVE="$other"
  write_state

  echo
  log "==> stack em execução:"
  compose_fe ps
}

cmd_switch() {
  local target="${1:-}"
  [[ "$target" == "blue" || "$target" == "green" ]] || die "uso: deploy.sh switch <blue|green>"
  read_state
  local other
  if [[ "$target" == "blue" ]]; then other="green"; else other="blue"; fi

  if ! container_exists "login-frontend-$target"; then
    die "slot $target não existe (login-frontend-$target). Rode 'deploy' primeiro."
  fi

  switch_weights "$target" "$other"
  verify_public

  ACTIVE="$target"
  write_state

  echo
  log "==> stack em execução:"
  compose_fe ps
}

cmd_status() {
  read_state
  log "Estado blue/green:"
  local s cname state health img
  for s in blue green; do
    cname="login-frontend-$s"
    state="$(docker inspect -f '{{.State.Status}}' "$cname" 2>/dev/null || true)"
    [[ -n "$state" ]] || state="ausente"
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$cname" 2>/dev/null || true)"
    [[ -n "$health" ]] || health="-"
    img="$(docker inspect -f '{{.Config.Image}}' "$cname" 2>/dev/null || true)"
    [[ -n "$img" ]] || img="-"
    log "  $s: state=$state health=$health"
    log "       imagem=$img"
    log "       registrada=$(slot_image "$s")"
  done
  current_weights
  log "  weights traefik: blue=$BLUE_WEIGHT green=$GREEN_WEIGHT"
  log "  ativo: ${ACTIVE:-?}"
}

cmd_prune() {
  local target="${1:-}"
  [[ "$target" == "blue" || "$target" == "green" ]] || die "uso: deploy.sh prune <blue|green>"
  read_state
  local active="${ACTIVE:-blue}"
  if [[ "$target" == "$active" ]]; then
    die "slot $target é o ativo; troque antes (switch/rollback)."
  fi

  if container_exists "login-frontend-$target"; then
    log "==> removendo container login-frontend-$target"
    docker rm -f "login-frontend-$target" >/dev/null
  else
    log "==> slot $target já não existe."
  fi
  log "==> a imagem de $target (tag $(slot_image "$target")) permanece registrada para redeploy/rollback."
}

cmd_down() {
  log "==> derrubando o stack (infra + slots)"
  compose_fe down
  log "==> stack derrubado (volume traefik-acme preservado)."
}

# ---- dispatch ----
require_docker
case "$COMMAND" in
  deploy) load_env true; cmd_deploy ;;
  rollback) load_env true; cmd_rollback ;;
  switch) load_env true; cmd_switch "${ARGS[1]:-}" ;;
  status) load_env false; cmd_status ;;
  prune) load_env false; cmd_prune "${ARGS[1]:-}" ;;
  down) load_env false; cmd_down ;;
  *) usage; exit 1 ;;
esac
