# Apollo home-lab setup (Proxmox + Portainer + Unraid)

Clear steps for the setup that worked: Debian VM on Proxmox, Apollo stack in Portainer, music on an Unraid SMB share.

## Big picture

```text
Unraid NAS  (tower)
  share: HomeOS Storage
    Media/Music          ← downloads land here
    Media/Apollo/...     ← incomplete + shared

        ↕ SMB mount

Debian VM  (/mnt/homeos/...)
        ↕ Docker bind mounts

Portainer stack
  apollo  :3000   UI
  slskd   :5030   Soulseek + API
```

Apollo always uses **`/app/downloads` inside Docker**.  
That folder is bind-mounted to your Unraid `Media/Music` folder.

---

## 1. Proxmox VM

| Setting | Suggestion |
|---|---|
| OS | Debian / Ubuntu Server |
| Disk | **≥ 32 GB** (Next.js Docker builds need space) |
| RAM | 2–4 GB |
| Network | Bridged to LAN (`vmbr0`) so the VM can reach Unraid + Soulseek |

### If you resized the disk in Proxmox but `df -h` still shows the old size

Proxmox only grew the virtual disk. Inside the VM:

```bash
sudo apt-get update
sudo apt-get install -y cloud-guest-utils
lsblk                          # confirm sda is ~30G+
sudo growpart /dev/sda 1
sudo resize2fs /dev/sda1
df -h /                        # should show ~30G+
```

---

## 2. Deploy Apollo in Portainer

1. Install Portainer on the VM (if needed):

```bash
docker volume create portainer_data
docker run -d -p 9000:9000 --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

2. Portainer → **Stacks** → **Add stack**
3. Name: `apollo`
4. Method: **Repository**
5. URL: `https://github.com/Shaka-Agina/apollo-local`
6. Compose path: `docker-compose.yml` (branch `main`)
7. Environment variables:

| Name | Notes |
|---|---|
| `SLSKD_SLSK_USERNAME` | Soulseek username |
| `SLSKD_SLSK_PASSWORD` | Soulseek password |
| `SLSKD_API_KEY` | Random string, **16–255 characters** |

Optional music paths (recommended once NAS is mounted — see §4):

| Name | Example |
|---|---|
| `MUSIC_DIR` | `/mnt/homeos/Media/Music` |
| `INCOMPLETE_DIR` | `/mnt/homeos/Media/Apollo/incomplete` |
| `SHARED_DIR` | `/mnt/homeos/Media/Apollo/shared` |

8. **Deploy the stack** (first build can take several minutes).

Open: `http://<vm-ip-or-tailscale>:3000`

### New Soulseek account / forgot password

You do **not** need to rebuild everything. Update the two env vars (or Apollo → Settings), then **Update the stack**. Wait until status shows connected.

---

## 3. Mount Unraid (SMB) on the VM

### Unraid path vs SMB path

| On Unraid | Meaning |
|---|---|
| `/mnt/user/HomeOS Storage/` | SMB **share** named `HomeOS Storage` |
| `.../Media/Music` | Folder **inside** that share |

From the VM, never use `/mnt/user/...`. Use:

```text
//tower.local/HomeOS Storage
# or better, the Unraid IP:
//192.168.x.x/HomeOS Storage
```

### One-time mount

```bash
sudo apt-get update
sudo apt-get install -y cifs-utils

sudo mkdir -p /mnt/homeos
sudo mkdir -p /root/.smb
sudo nano /root/.smb/tower-media
```

Credentials file:

```text
username=YOUR_UNRAID_USER
password=YOUR_UNRAID_PASSWORD
```

```bash
sudo chmod 600 /root/.smb/tower-media

# Quotes matter — share name has a space
sudo mount -t cifs "//192.168.x.x/HomeOS Storage" /mnt/homeos \
  -o credentials=/root/.smb/tower-media,uid=0,gid=0,file_mode=0666,dir_mode=0777,iocharset=utf8

ls /mnt/homeos/Media/Music
```

Create helper folders:

```bash
sudo mkdir -p /mnt/homeos/Media/Apollo/incomplete
sudo mkdir -p /mnt/homeos/Media/Apollo/shared
```

### Survive reboot (`/etc/fstab`)

Use `\040` for the space in the share name:

```text
//192.168.x.x/HomeOS\040Storage  /mnt/homeos  cifs  credentials=/root/.smb/tower-media,uid=0,gid=0,file_mode=0666,dir_mode=0777,iocharset=utf8,_netdev,x-systemd.automount  0  0
```

```bash
sudo mount -a
df -h /mnt/homeos
```

---

## 4. Point the stack at Music (Portainer)

### Preferred: stack environment variables

In the apollo stack env, set:

```text
MUSIC_DIR=/mnt/homeos/Media/Music
INCOMPLETE_DIR=/mnt/homeos/Media/Apollo/incomplete
SHARED_DIR=/mnt/homeos/Media/Apollo/shared
```

Then **Update the stack**.  
Git redeploys keep working — you only maintain these env vars.

### Manual binds (if your deployed compose predates those env vars)

Edit the stack and set:

**slskd volumes:**

```yaml
- slskd-data:/app
- /mnt/homeos/Media/Music:/app/downloads
- /mnt/homeos/Media/Apollo/incomplete:/app/incomplete
- /mnt/homeos/Media/Apollo/shared:/app/shared
```

**apollo volumes:**

```yaml
- slskd-data:/slskd-data
- /mnt/homeos/Media/Music:/app/downloads
- apollo-data:/data
```

### In Apollo Settings

Leave download folder as **`/app/downloads`**.  
That is already your Unraid `Media/Music` folder via the bind.

---

## 5. Tailscale (optional)

On the VM:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Then from your phone: `http://<vm-magicdns>:3000`

Do **not** port-forward 3000/5030/9000 to the public internet.  
Optional: forward **TCP 50300** to the VM for better Soulseek download connectivity.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Not enough space / build fails | VM disk too small or not grown | §1 growpart + resize2fs |
| `init-config` exit 1 | Missing env or API key &lt; 16 chars | Check stack env; read init-config logs |
| `Unknown API key` | Apollo key ≠ slskd key | Set `SLSKD_API_KEY`, Update stack |
| `SLSKD_URL` incorrect / can’t search | slskd down or mount broken | `docker logs slskd`; check `/mnt/homeos` mounted |
| `server connection … Disconnected` | Bad Soulseek login or no internet | Fix username/password; `ping server.slsknet.org` |
| Directory not found on mount | Wrong share name / space not quoted | Share is `HomeOS Storage`, not `Media` |
| Git redeploy wiped binds | Compose reset from repo | Use `MUSIC_DIR` env vars (§4) |

Useful commands on the VM:

```bash
df -h /
df -h /mnt/homeos
docker ps -a
docker logs slskd --tail 80
docker logs apollo --tail 40
```

---

## 7. What you should not do

- Don’t type `\\tower\Media\Music` or `/mnt/user/...` inside Apollo — those are Unraid/Windows paths, not container paths.
- Don’t expect a plain container **restart** to pick up new Soulseek env vars — use **Update the stack** so `init-config` runs.
- Don’t forward the Apollo/Portainer ports to the public internet; use Tailscale.
