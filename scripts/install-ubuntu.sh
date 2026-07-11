#!/usr/bin/env bash
# Install Apollo + slskd on Ubuntu/Debian (Proxmox VM friendly).
# Run as root on a fresh Ubuntu 22.04 / 24.04 (or Debian 12+) VM:
#
#   curl -fsSL https://raw.githubusercontent.com/<you>/apollo-local/main/scripts/install-ubuntu.sh | sudo bash
#   # or, from a clone:
#   sudo bash scripts/install-ubuntu.sh
#
# Env overrides (optional):
#   APP_DIR=/opt/apollo
#   REPO_URL=https://github.com/<you>/apollo-local.git
#   REPO_BRANCH=main
#   APOLLO_PORT=3000
#   SKIP_TAILSCALE=1
#   NONINTERACTIVE=1   # use placeholders; edit configs before starting

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/apollo}"
REPO_URL="${REPO_URL:-}"
REPO_BRANCH="${REPO_BRANCH:-main}"
APOLLO_PORT="${APOLLO_PORT:-3000}"
SKIP_TAILSCALE="${SKIP_TAILSCALE:-0}"
NONINTERACTIVE="${NONINTERACTIVE:-0}"
NODE_MAJOR="${NODE_MAJOR:-20}"

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GRN}==>${NC} $*"; }
warn() { echo -e "${YLW}warn:${NC} $*"; }
die()  { echo -e "${RED}error:${NC} $*" >&2; exit 1; }

require_root() {
  [[ "${EUID}" -eq 0 ]] || die "Run as root (sudo bash scripts/install-ubuntu.sh)"
}

detect_os() {
  [[ -f /etc/os-release ]] || die "Unsupported OS (need Ubuntu/Debian)"
  # shellcheck disable=SC1091
  . /etc/os-release
  case "${ID:-}" in
    ubuntu|debian) ;;
    *) die "This script targets Ubuntu/Debian (got: ${ID:-unknown})" ;;
  esac
  log "Detected ${PRETTY_NAME:-$ID}"
}

prompt() {
  local var="$1" message="$2" default="${3:-}"
  local value=""
  if [[ "${NONINTERACTIVE}" == "1" ]]; then
    printf -v "${var}" '%s' "${default}"
    return
  fi
  if [[ -n "${default}" ]]; then
    read -r -p "${message} [${default}]: " value || true
    value="${value:-$default}"
  else
    read -r -p "${message}: " value || true
  fi
  printf -v "${var}" '%s' "${value}"
}

prompt_secret() {
  local var="$1" message="$2" default="${3:-}"
  local value=""
  if [[ "${NONINTERACTIVE}" == "1" ]]; then
    printf -v "${var}" '%s' "${default}"
    return
  fi
  read -r -s -p "${message}: " value || true
  echo
  value="${value:-$default}"
  printf -v "${var}" '%s' "${value}"
}

random_key() {
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

install_packages() {
  log "Installing base packages"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y --no-install-recommends \
    ca-certificates curl git gnupg jq openssl python3 \
    apt-transport-https software-properties-common
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker already installed"
  else
    log "Installing Docker Engine"
    curl -fsSL https://get.docker.com | sh
  fi
  systemctl enable --now docker

  if docker compose version >/dev/null 2>&1; then
    log "Docker Compose plugin OK"
  else
    die "docker compose plugin missing after install"
  fi
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [[ "${major}" -ge "${NODE_MAJOR}" ]]; then
      log "Node $(node -v) already installed"
      return
    fi
    warn "Node $(node -v) is older than ${NODE_MAJOR}; upgrading via NodeSource"
  fi
  log "Installing Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
  log "Node $(node -v) / npm $(npm -v)"
}

install_tailscale() {
  if [[ "${SKIP_TAILSCALE}" == "1" ]]; then
    warn "Skipping Tailscale (SKIP_TAILSCALE=1)"
    return
  fi
  if command -v tailscale >/dev/null 2>&1; then
    log "Tailscale already installed"
  else
    log "Installing Tailscale"
    curl -fsSL https://tailscale.com/install.sh | sh
  fi
  if ! tailscale status >/dev/null 2>&1; then
    warn "Tailscale is installed but not connected yet."
    warn "After this script finishes, run:  sudo tailscale up"
  else
    log "Tailscale is connected"
  fi
}

resolve_repo() {
  # Prefer running from an existing clone of this repo.
  local script_dir root
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  root="$(cd "${script_dir}/.." && pwd)"

  if [[ -f "${root}/package.json" && -f "${root}/docker-compose.yml" ]]; then
    if [[ "${root}" != "${APP_DIR}" ]]; then
      log "Copying repo from ${root} → ${APP_DIR}"
      mkdir -p "${APP_DIR}"
      # Prefer rsync if present; fall back to tar to skip node_modules/.git noise
      if command -v rsync >/dev/null 2>&1; then
        rsync -a --delete \
          --exclude node_modules --exclude .next --exclude .git \
          --exclude slskd/bin --exclude slskd/downloads --exclude slskd/incomplete \
          --exclude slskd/shared --exclude .env.local \
          "${root}/" "${APP_DIR}/"
      else
        mkdir -p "${APP_DIR}"
        tar -C "${root}" \
          --exclude=node_modules --exclude=.next --exclude=.git \
          --exclude=slskd/bin --exclude=slskd/downloads --exclude=slskd/incomplete \
          --exclude=slskd/shared --exclude=.env.local \
          -cf - . | tar -C "${APP_DIR}" -xf -
      fi
    else
      log "Installing in-place at ${APP_DIR}"
    fi
    return
  fi

  [[ -n "${REPO_URL}" ]] || die "Set REPO_URL=https://github.com/<you>/apollo-local.git (or run from a clone)"

  if [[ -d "${APP_DIR}/.git" ]]; then
    log "Updating existing clone at ${APP_DIR}"
    git -C "${APP_DIR}" fetch --depth 1 origin "${REPO_BRANCH}"
    git -C "${APP_DIR}" checkout -B "${REPO_BRANCH}" "origin/${REPO_BRANCH}"
  else
    log "Cloning ${REPO_URL} (${REPO_BRANCH}) → ${APP_DIR}"
    rm -rf "${APP_DIR}"
    git clone --depth 1 --branch "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}"
  fi
}

configure_slskd() {
  local example="${APP_DIR}/slskd/config/slskd.example.yml"
  local config="${APP_DIR}/slskd/config/slskd.yml"
  [[ -f "${example}" ]] || die "Missing ${example}"

  mkdir -p \
    "${APP_DIR}/slskd/config" \
    "${APP_DIR}/slskd/downloads" \
    "${APP_DIR}/slskd/incomplete" \
    "${APP_DIR}/slskd/shared"

  local username password api_key
  prompt username "Soulseek username" "your_soulseek_username"
  prompt_secret password "Soulseek password" "your_soulseek_password"
  api_key="$(random_key)"
  if [[ "${NONINTERACTIVE}" != "1" ]]; then
    prompt api_key "Apollo API key (leave blank to auto-generate)" "${api_key}"
  fi

  python3 - "${config}" "${username}" "${password}" "${api_key}" <<'PY'
import pathlib, sys

path, user, pw, key = sys.argv[1:5]

def q(s: str) -> str:
    special = set(":#{[]}&*?|>!%@`'\",")
    if any(c in special for c in s) or s != s.strip() or s.lower() in ("null", "true", "false", "yes", "no"):
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return s

pathlib.Path(path).write_text(
    "# Generated by scripts/install-ubuntu.sh — do not commit\n"
    "# Docs: https://github.com/slskd/slskd/blob/master/docs/config.md\n\n"
    "soulseek:\n"
    f"  username: {q(user)}\n"
    f"  password: {q(pw)}\n"
    "  listen_port: 50300\n\n"
    "web:\n"
    "  authentication:\n"
    "    api_keys:\n"
    "      apollo:\n"
    f"        key: {q(key)}\n"
    "        role: readwrite\n\n"
    "directories:\n"
    "  downloads: /app/downloads\n"
    "  incomplete: /app/incomplete\n\n"
    "shares:\n"
    "  directories:\n"
    "    - /app/shared\n",
    encoding="utf-8",
)
PY

  chmod 600 "${config}"
  install -m 600 /dev/null /tmp/apollo-api-key.txt
  printf '%s' "${api_key}" > /tmp/apollo-api-key.txt
}

write_env() {
  local api_key
  api_key="$(cat /tmp/apollo-api-key.txt)"
  rm -f /tmp/apollo-api-key.txt

  cat > "${APP_DIR}/.env.local" <<EOF
# Generated by scripts/install-ubuntu.sh — do not commit
SLSKD_URL=http://127.0.0.1:5030
SLSKD_API_KEY=${api_key}
SLSKD_CONFIG_PATH=${APP_DIR}/slskd/config/slskd.yml
EOF
  chmod 600 "${APP_DIR}/.env.local"
  log "Wrote ${APP_DIR}/.env.local"
}

start_slskd() {
  log "Starting slskd via Docker Compose"
  cd "${APP_DIR}"
  docker compose pull
  docker compose up -d
}

build_apollo() {
  log "Installing npm deps and building Apollo"
  cd "${APP_DIR}"
  # Drop root ownership issues for a dedicated user if present
  if id apollo >/dev/null 2>&1; then
    chown -R apollo:apollo "${APP_DIR}"
    sudo -u apollo npm ci
    sudo -u apollo npm run build
  else
    npm ci
    npm run build
  fi
}

ensure_apollo_user() {
  if ! id apollo >/dev/null 2>&1; then
    log "Creating system user 'apollo'"
    useradd --system --home "${APP_DIR}" --shell /usr/sbin/nologin apollo || true
  fi
  # Docker socket access for compose restarts from the same host (optional)
  if getent group docker >/dev/null 2>&1; then
    usermod -aG docker apollo || true
  fi
  chown -R apollo:apollo "${APP_DIR}"
}

install_systemd() {
  log "Installing systemd unit apollo.service"
  cat > /etc/systemd/system/apollo.service <<EOF
[Unit]
Description=Apollo Soulseek client (Next.js)
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=apollo
Group=apollo
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${APOLLO_PORT}
EnvironmentFile=-${APP_DIR}/.env.local
ExecStart=/usr/bin/npm run start -- --hostname 0.0.0.0 --port ${APOLLO_PORT}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now apollo.service
}

open_firewall_hint() {
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    warn "UFW is active. Allowing ${APOLLO_PORT}/tcp and 50300/tcp (Soulseek P2P)."
    ufw allow "${APOLLO_PORT}/tcp" || true
    ufw allow 50300/tcp || true
  fi
}

print_summary() {
  local ip hostname ts
  hostname="$(hostname -f 2>/dev/null || hostname)"
  ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  ts=""
  if command -v tailscale >/dev/null 2>&1 && tailscale status >/dev/null 2>&1; then
    ts="$(tailscale ip -4 2>/dev/null || true)"
  fi

  echo
  log "Apollo install complete"
  echo "  App dir:     ${APP_DIR}"
  echo "  UI (LAN):    http://${ip:-<vm-ip>}:${APOLLO_PORT}"
  echo "  UI (host):   http://${hostname}:${APOLLO_PORT}"
  if [[ -n "${ts}" ]]; then
    echo "  UI (tailnet): http://${ts}:${APOLLO_PORT}"
  else
    echo "  Tailscale:   sudo tailscale up   # then open http://<magicdns-or-ip>:${APOLLO_PORT}"
  fi
  echo
  echo "  slskd API:   http://127.0.0.1:5030  (proxied by Apollo; keep private)"
  echo "  P2P port:    TCP 50300 — forward this on your router to the VM for better downloads"
  echo
  echo "  Useful commands:"
  echo "    sudo systemctl status apollo"
  echo "    sudo journalctl -u apollo -f"
  echo "    cd ${APP_DIR} && sudo docker compose logs -f slskd"
  echo "    cd ${APP_DIR} && sudo docker compose pull && sudo docker compose up -d"
  echo
  echo "  Docs: ${APP_DIR}/docs/proxmox-ubuntu.md"
}

main() {
  require_root
  detect_os
  install_packages
  install_docker
  install_node
  install_tailscale
  resolve_repo
  ensure_apollo_user
  configure_slskd
  write_env
  start_slskd
  build_apollo
  install_systemd
  open_firewall_hint
  print_summary
}

main "$@"
