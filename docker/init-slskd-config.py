#!/usr/bin/env python3
"""Sync Soulseek credentials + API key from env into /data/slskd.yml.

Runs on every stack start so Portainer env vars stay the source of truth for
those three secrets — no manual YAML editing. Other settings (directories,
shares, listen port, etc.) are preserved when the file already exists.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

CONFIG = Path("/data/slskd.yml")

USERNAME = os.environ.get("SLSKD_SLSK_USERNAME", "").strip()
PASSWORD = os.environ.get("SLSKD_SLSK_PASSWORD", "").strip()
API_KEY = os.environ.get("SLSKD_API_KEY", "").strip()


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def yaml_quote(value: str) -> str:
    special = set(':#{[]}&*?|>!%@`\'",')
    if (
        any(c in special for c in value)
        or value != value.strip()
        or value.lower() in ("null", "true", "false", "yes", "no")
        or "\n" in value
    ):
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    return value


def default_config() -> str:
    return f"""# Managed by docker/init-slskd-config.py — secrets sync from stack env on each start.
# Docs: https://github.com/slskd/slskd/blob/master/docs/config.md

soulseek:
  username: {yaml_quote(USERNAME)}
  password: {yaml_quote(PASSWORD)}
  listen_port: 50300

web:
  authentication:
    api_keys:
      apollo:
        key: {yaml_quote(API_KEY)}
        role: readwrite

directories:
  downloads: /app/downloads
  incomplete: /app/incomplete

shares:
  directories:
    - /app/shared
"""


def replace_first(text: str, key: str, value: str) -> str:
    pattern = rf"^([ \t]*{re.escape(key)}:[ \t]*).*$"
    return re.sub(pattern, rf"\1{yaml_quote(value)}", text, count=1, flags=re.MULTILINE)


def sync_existing(text: str) -> str:
    text = replace_first(text, "username", USERNAME)
    text = replace_first(text, "password", PASSWORD)

    apollo_block = re.search(
        r"(^[ \t]*apollo:[ \t]*\n(?:^[ \t]+.+\n)*?^[ \t]+key:[ \t]*).*$",
        text,
        flags=re.MULTILINE,
    )
    if apollo_block:
        end = apollo_block.end()
        return (
            text[: apollo_block.start(1)]
            + apollo_block.group(1)
            + yaml_quote(API_KEY)
            + text[end:]
        )

    # Fallback: first bare `key:` line (common in our generated file).
    if re.search(r"^[ \t]*key:[ \t]*", text, flags=re.MULTILINE):
        return replace_first(text, "key", API_KEY)

    # No api key section — append one.
    return text.rstrip() + (
        "\n\nweb:\n"
        "  authentication:\n"
        "    api_keys:\n"
        "      apollo:\n"
        f"        key: {yaml_quote(API_KEY)}\n"
        "        role: readwrite\n"
    )


def main() -> None:
    if not USERNAME:
        die("Set SLSKD_SLSK_USERNAME")
    if not PASSWORD:
        die("Set SLSKD_SLSK_PASSWORD")
    if not API_KEY:
        die("Set SLSKD_API_KEY (16–255 chars)")
    if len(API_KEY) < 16 or len(API_KEY) > 255:
        die("SLSKD_API_KEY must be between 16 and 255 characters")

    CONFIG.parent.mkdir(parents=True, exist_ok=True)

    if CONFIG.exists():
        CONFIG.write_text(sync_existing(CONFIG.read_text(encoding="utf-8")), encoding="utf-8")
        print(f"Synced credentials + API key into {CONFIG}")
    else:
        CONFIG.write_text(default_config(), encoding="utf-8")
        print(f"Created {CONFIG}")

    CONFIG.chmod(0o666)


if __name__ == "__main__":
    main()
