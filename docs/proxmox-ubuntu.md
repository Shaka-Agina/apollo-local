# Apollo on Proxmox (Ubuntu / Debian VM)

Run Apollo as its own always-on instance: a small Ubuntu (or Debian) VM on Proxmox, with Tailscale for access when you’re away.

This is the low-fiddle path. LXC + Docker nesting works too, but a VM avoids most of that pain.

## What you get

| Piece | Role |
|---|---|
| **Ubuntu/Debian VM** | Host for everything |
| **Docker Compose** | Runs `slskd` |
| **Node.js + systemd** | Runs the Apollo UI on port `3000` |
| **Tailscale** (optional) | Reach the UI from your phone / laptop off-LAN |

Ports:

- `3000` — Apollo UI (what you open in a browser)
- `5030` — slskd HTTP API (localhost only via Apollo proxy; don’t expose publicly)
- `50300/tcp` — Soulseek P2P listen port (forward on your router to the VM)

---

## Option A — One-shot install from GitHub

### 1. Create the VM in Proxmox

Suggested starting point:

| Setting | Value |
|---|---|
| OS | Ubuntu 24.04 Server (or 22.04 / Debian 12) |
| vCPU | 2 |
| RAM | 2–4 GB |
| Disk | 20–40 GB (+ larger disk/mount for music later) |
| Network | Bridged to LAN (`vmbr0`) |

Finish cloud-init / first login, then SSH in as a sudo user.

### 2. Run the installer

Replace the repo URL with yours after you push this project to GitHub:

```bash
sudo apt-get update && sudo apt-get install -y curl
curl -fsSL https://raw.githubusercontent.com/<you>/apollo-local/main/scripts/install-ubuntu.sh \
  | sudo env REPO_URL=https://github.com/<you>/apollo-local.git bash
```

The script will:

1. Install Docker, Node 20, and Tailscale  
2. Clone the repo to `/opt/apollo`  
3. Prompt for Soulseek username / password (and generate an API key)  
4. Start `slskd` with Compose  
5. Build Apollo and enable `apollo.service`  
6. Print LAN / Tailscale URLs  

Non-interactive (placeholders — edit configs before relying on it):

```bash
curl -fsSL https://raw.githubusercontent.com/<you>/apollo-local/main/scripts/install-ubuntu.sh \
  | sudo env REPO_URL=https://github.com/<you>/apollo-local.git NONINTERACTIVE=1 bash
```

Then edit:

- `/opt/apollo/slskd/config/slskd.yml`
- `/opt/apollo/.env.local`

…and restart:

```bash
cd /opt/apollo && sudo docker compose up -d
sudo systemctl restart apollo
```

### 3. Connect Tailscale

If the installer didn’t already connect:

```bash
sudo tailscale up
```

From a device on your tailnet:

```text
http://<vm-magicdns-or-tailscale-ip>:3000
```

Optional HTTPS without opening the UI to the public internet:

```bash
sudo tailscale serve --bg 3000
```

---

## Option B — Manual install (clone + configure)

### 1. Packages

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # re-login after this

# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Tailscale (optional)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### 2. Clone

```bash
sudo mkdir -p /opt/apollo
sudo chown "$USER:$USER" /opt/apollo
git clone https://github.com/<you>/apollo-local.git /opt/apollo
cd /opt/apollo
```

### 3. Configure slskd

```bash
cp slskd/config/slskd.example.yml slskd/config/slskd.yml
mkdir -p slskd/downloads slskd/incomplete slskd/shared
nano slskd/config/slskd.yml   # username, password, API key
```

Generate a random API key (example):

```bash
uuidgen
```

Put the same value in both `slskd.yml` (`web.authentication.api_keys.apollo.key`) and `.env.local`.

### 4. Configure Apollo

```bash
cp .env.example .env.local
nano .env.local
```

Example:

```env
SLSKD_URL=http://127.0.0.1:5030
SLSKD_API_KEY=<same-as-slskd.yml>
SLSKD_CONFIG_PATH=/opt/apollo/slskd/config/slskd.yml
```

### 5. Start services

```bash
docker compose up -d
npm ci
npm run build
npm run start -- --hostname 0.0.0.0 --port 3000
```

For a reboot-proof UI, install the systemd unit the installer writes (or run `sudo bash scripts/install-ubuntu.sh` from the clone — it will reuse the tree in place if you’re already under `/opt/apollo`).

---

## Music storage on Proxmox

Prefer a separate disk or bind-mounted share for downloads, not only the VM system disk:

1. Add a virtual disk in Proxmox (or NFS/SMB mount).  
2. Mount it under e.g. `/mnt/music`.  
3. Either symlink `slskd/downloads` → `/mnt/music/downloads`, or change `directories.downloads` in `slskd.yml` and the Compose volume mapping.

---

## Updates

```bash
cd /opt/apollo
git pull
docker compose pull
docker compose up -d
npm ci
npm run build
sudo systemctl restart apollo
```

---

## Dashboard for multiple web apps (Portainer?)

Yes — if this VM becomes a general “run my web apps” box, **[Portainer](https://www.portainer.io/)** (or Dockge, Coolify, etc.) is exactly that kind of dashboard: start/stop stacks, pull updates, view logs, manage Compose projects from a browser.

Apollo’s installer does **not** install Portainer. Typical next step on the same VM:

```bash
docker volume create portainer_data
docker run -d -p 9000:9000 --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Then open Portainer over Tailscale (`http://<vm>:9000`) and manage Apollo’s Compose stack plus anything else you add.

You do **not** need a separate Windows PC or Mac Mini for this — Proxmox + one Ubuntu VM is enough.

---

## Tailscale: Proxmox host vs the VM

You can Tailscale **either or both**:

| Install Tailscale on… | What you can reach |
|---|---|
| **VM only** | Apollo, Portainer, whatever runs in that VM |
| **Proxmox host** | Proxmox web UI (`8006`), and optionally other guests if you use subnet routes / exit nodes carefully |
| **Both** | Common setup: host for admin, VM for apps |

Notes:

- Tailscale on the **Proxmox host** does **not** automatically expose services inside the VM. The VM has its own IPs (LAN + optional Tailscale).
- To open Apollo while away, put Tailscale on the **VM** (simplest), **or** use subnet routing / a reverse proxy on a machine that *is* on the tailnet.
- Don’t expose Proxmox `8006` or Apollo to the public internet; Tailscale (or a VPN) is the right remote-access layer.

Recommended for your plan:

1. Tailscale on the **apps VM** → day-to-day Apollo / future dashboards  
2. Optional Tailscale on the **Proxmox host** → manage Proxmox itself when away  

---

## Security checklist

- Never commit `.env.local` or `slskd/config/slskd.yml` (gitignored; only `slskd.example.yml` is tracked).  
- Keep `5030` off the public internet.  
- Forward only `50300/tcp` for Soulseek if you want decent peer connectivity.  
- Prefer Tailscale Serve / MagicDNS over opening `3000` on your router.
