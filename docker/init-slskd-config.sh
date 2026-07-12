#!/bin/sh
# First-run bootstrap: write /data/slskd.yml from env if missing.
# Used by docker-compose so Portainer can deploy with only env vars.
set -eu

CONFIG="/data/slskd.yml"

if [ -f "$CONFIG" ]; then
  echo "slskd config already exists at $CONFIG"
  exit 0
fi

: "${SLSKD_SLSK_USERNAME:?Set SLSKD_SLSK_USERNAME}"
: "${SLSKD_SLSK_PASSWORD:?Set SLSKD_SLSK_PASSWORD}"
: "${SLSKD_API_KEY:?Set SLSKD_API_KEY (16–255 chars)}"

# Escape double quotes for YAML double-quoted scalars
escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

USER_Q="$(escape "$SLSKD_SLSK_USERNAME")"
PASS_Q="$(escape "$SLSKD_SLSK_PASSWORD")"
KEY_Q="$(escape "$SLSKD_API_KEY")"

umask 077
cat > "$CONFIG" <<EOF
# Generated on first start by docker/init-slskd-config.sh — edit via Apollo Settings or this file.
# Docs: https://github.com/slskd/slskd/blob/master/docs/config.md

soulseek:
  username: "${USER_Q}"
  password: "${PASS_Q}"
  listen_port: 50300

web:
  authentication:
    api_keys:
      apollo:
        key: "${KEY_Q}"
        role: readwrite

directories:
  downloads: /app/downloads
  incomplete: /app/incomplete

shares:
  directories:
    - /app/shared
EOF

echo "Wrote $CONFIG"
chmod 666 "$CONFIG"
