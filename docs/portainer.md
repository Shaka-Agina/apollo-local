# Deploy Apollo + slskd as one Portainer stack

One Compose stack runs **Apollo** (UI) and **slskd** (Soulseek). Portainer builds Apollo from this repo and pulls the official `slskd` image.

## Portainer: deploy from Git (recommended)

1. Open Portainer → **Stacks** → **Add stack**
2. Name: `apollo`
3. Build method: **Repository**
4. Repository URL: `https://github.com/Shaka-Agina/apollo-local`
5. Compose path: `docker-compose.yml` (branch: `main`)
6. Under **Environment variables**, add:

| Name | Example |
|---|---|
| `SLSKD_SLSK_USERNAME` | your Soulseek username |
| `SLSKD_SLSK_PASSWORD` | your Soulseek password |
| `SLSKD_API_KEY` | long random string (16–255 chars) |

Optional music paths (recommended once NAS is mounted — see [homelab-setup.md](./homelab-setup.md)):

| Name | Example |
|---|---|
| `MUSIC_DIR` | `/mnt/homeos/Media/Music` |
| `INCOMPLETE_DIR` | `/mnt/homeos/Media/Apollo/incomplete` |
| `SHARED_DIR` | `/mnt/homeos/Media/Apollo/shared` |

Optional: `APOLLO_PORT=3000`, `SLSKD_WEB_PORT=5030`, `SLSKD_LISTEN_PORT=50300`

On every deploy/restart, `init-config` writes those three secrets into `slskd.yml` automatically (and keeps download/share paths if the file already exists). You should **not** need to edit YAML by hand.

If Apollo shows `Unknown API key`, set `SLSKD_API_KEY` in the Portainer stack env and **re-pull / redeploy** the stack (a plain container restart is not enough until this sync runs).

`SLSKD_API_KEY` must be **16–255 characters**. Shorter keys make `init-config` exit with code 1.

If `init-config` fails, check Portainer → stack → `init-config` logs for the `error:` line (missing env or key too short are the usual causes).

7. **Deploy the stack** (first build takes a few minutes)

Then open:

- Apollo UI → `http://<vm-ip-or-tailscale>:3000`
- slskd UI (optional) → `http://<vm>:5030`

### Enable stack rebuilds on git push (optional)

In the stack’s Git settings, enable auto-update / polling if you want Portainer to rebuild when `main` changes.

## CLI (same stack, no Portainer)

```bash
git clone https://github.com/Shaka-Agina/apollo-local.git
cd apollo-local
cp .env.example .env
nano .env   # set username, password, API key
docker compose up -d --build
```

## Migrating from the systemd installer

If you previously used `scripts/install-ubuntu.sh` (Apollo on systemd + slskd container only):

```bash
# Stop the old UI so port 3000 is free
sudo systemctl disable --now apollo

# Remove the old single-service slskd container if it conflicts
cd /opt/apollo
sudo docker compose down   # only if that compose was slskd-only

# Deploy the new full stack (Portainer UI, or):
sudo docker compose pull
sudo docker compose up -d --build
```

Prefer deploying via **Portainer → Stacks** from Git so updates are one click later.

## What the stack contains

| Service | Role |
|---|---|
| `init-config` | One-shot: writes `slskd.yml` from env on first run |
| `slskd` | Soulseek daemon (`5030`, `50300`) |
| `apollo` | Next.js UI (`3000`) |

Shared Docker volumes hold config, downloads, incomplete, and shared music. Apollo mounts downloads at `/app/downloads` so Listen/Library match slskd’s paths.

## Updates

**Portainer:** Stack → **Pull and redeploy** / **Editor** → update (rebuild if the Dockerfile changed).

**CLI:**

```bash
git pull
docker compose up -d --build
```

## Notes

- Forward **TCP 50300** on your router to the VM for better download connectivity.
- Do not expose `3000` / `5030` / Portainer `9000` on the public internet — use Tailscale.
- After first deploy, change Soulseek credentials in **Apollo → Settings** if you want; they are stored in the `slskd-data` volume.
