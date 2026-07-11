# APOLLO

A mobile-first, dark, monochromatic Soulseek client. Wraps the [slskd](https://github.com/slskd/slskd) REST API so you can search, queue, and monitor music downloads from anywhere on your tailnet.

## Stack

- **slskd** (Docker) — the Soulseek daemon
- **Next.js 14** (App Router) — UI + thin API proxy that keeps the slskd API key server-side
- **Tailwind CSS v3** — design tokens as CSS variables
- **TanStack Query v5** — polling for search results and live transfers

## Setup

### Windows (dev / portable)

#### 1. Start slskd (native Windows binary)

Download the latest `slskd-*-win-x64.zip` from [slskd releases](https://github.com/slskd/slskd/releases) and extract it to `slskd/bin/`. Create `slskd/app/slskd.yml` with your Soulseek credentials:

```yaml
soulseek:
  username: your_soulseek_username
  password: your_soulseek_password
  listen_port: 50300

web:
  authentication:
    api_keys:
      apollo:
        key: change_me_to_a_long_random_string
        role: readwrite

directories:
  downloads: C:\path\to\downloads
  incomplete: C:\path\to\incomplete

shares:
  directories:
    - C:\path\to\shared
```

Then run it:

```powershell
.\slskd\bin\slskd.exe --app-dir "C:\full\path\to\apollo-local\slskd\app"
```

Verify the built-in UI loads at [http://localhost:5030](http://localhost:5030).

Alternatively, `docker-compose.yml` is included if you prefer Docker — see `slskd/config/slskd.example.yml` for the container-path config.

#### 2. Configure Apollo

```bash
cp .env.example .env.local
# Set SLSKD_API_KEY to the same value as web.authentication.api_keys.apollo.key in slskd.yml
# Set SLSKD_CONFIG_PATH to the absolute path of slskd/app/slskd.yml
```

#### 3. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Proxmox / Ubuntu VM (always-on)

One-shot installer + manual steps:

→ **[docs/proxmox-ubuntu.md](docs/proxmox-ubuntu.md)**

```bash
curl -fsSL https://raw.githubusercontent.com/<you>/apollo-local/main/scripts/install-ubuntu.sh \
  | sudo env REPO_URL=https://github.com/<you>/apollo-local.git bash
```

## Remote access via Tailscale

Run Tailscale on the host machine (or the Proxmox VM), then from your phone (also on the tailnet):

```
http://<your-machine-name>:3000
```

For HTTPS without exposing anything publicly, use `tailscale serve`:

```bash
tailscale serve --bg 3000
```

Note: slskd's P2P listen port (`50300`) still needs to be reachable from the internet for peers to upload to you — forward that single port on your router, or accept that queued downloads proceed when connectivity allows.

## Views

| Tab | What it does |
|---|---|
| Search | Query the network, results grouped by user and folder, filter by type/bitrate, one-tap queue, folder downloads with custom naming |
| Queue | Live transfer list polled every 2s — grouped by album, progress, speed, cancel/retry |
| Listen | Local music player: album grid with cover art, full-screen player, repeat/skip, lockscreen controls |
| Library | Downloaded and Shared tabs — browse local files or slskd shares |
| Settings | Connection status, credentials, download folder, sharing toggle — applied live via `SLSKD_CONFIG_PATH` |

## More docs

- [docs/proxmox-ubuntu.md](docs/proxmox-ubuntu.md) — Ubuntu/Debian VM on Proxmox, GitHub one-shot install, Tailscale, Portainer notes
- [docs/portability.md](docs/portability.md) — packaging Apollo + slskd as one portable folder, and updating slskd with `scripts/update-slskd.ps1`
- [docs/p2p-without-soulseek.md](docs/p2p-without-soulseek.md) — thought experiment: P2P with a friend if the Soulseek server ever shuts down
