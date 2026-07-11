# Soulseek Web Client — Architecture

A mobile-first, dark-mode web app wrapping the **slskd** REST API. Built to queue and monitor Soulseek downloads from anywhere via Tailscale.

---

## Stack Overview

| Layer | Technology |
|---|---|
| Soulseek daemon | slskd (Docker) |
| Backend proxy | Next.js API Routes (thin layer) |
| Frontend | Next.js 14 App Router |
| Styling | Tailwind CSS v3 |
| State / data fetching | TanStack Query v5 |
| Remote access | Tailscale |

---

## Design System

### Palette — Dark Grey Monochromatic

```
--bg-base:     #111111   (page background)
--bg-surface:  #1a1a1a   (cards, panels)
--bg-elevated: #222222   (modals, dropdowns)
--bg-hover:    #2a2a2a   (hover states)
--border:      #333333   (dividers, inputs)
--text-primary:   #e8e8e8
--text-secondary: #888888
--text-muted:     #555555
--accent:      #d4d4d4   (active state, focus ring — still monochromatic)
--destructive: #c0392b   (cancel / error — only colour on screen)
```

### Typography

- **Display / headings**: `Space Mono` or `JetBrains Mono` — technical feel, matches the app's nature
- **Body**: `Inter` — clean and legible on mobile
- **Numerals / speeds**: monospace always — avoids layout shift on live transfer stats

### Component Conventions

- All interactive surfaces: `rounded-lg`, `border border-[--border]`
- Touch targets: minimum `44px` height on mobile
- Active / selected rows: `bg-[--bg-hover]` + left `2px` accent border
- Progress bars: thin (`h-1`), grey track, white fill
- No gradients, no shadows — flat and utilitarian throughout

---

## Responsive Layout

### Mobile (default, `< 640px`)

Single column. Bottom tab bar with four tabs:

```
[ Search ]  [ Queue ]  [ Library ]  [ Settings ]
```

Each tab is a full-screen scroll view. No sidebar.

### Tablet (`sm:`, `≥ 640px`)

Two-column: narrow left sidebar (tabs become a vertical nav) + main content panel.

### Desktop (`lg:`, `≥ 1024px`)

Three-column: sidebar nav | main panel | contextual detail pane (transfer details, user info, file tree).

---

## File / Folder Structure

```
/
├── app/
│   ├── layout.tsx              # Root layout — font loading, Tailwind base
│   ├── page.tsx                # Redirect → /search
│   ├── search/
│   │   └── page.tsx
│   ├── queue/
│   │   └── page.tsx
│   ├── library/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
│
├── app/api/                    # Next.js API routes — proxy to slskd
│   ├── search/route.ts
│   ├── transfers/route.ts
│   ├── transfers/[id]/route.ts
│   └── application/route.ts
│
├── components/
│   ├── layout/
│   │   ├── BottomTabBar.tsx    # Mobile nav
│   │   ├── Sidebar.tsx         # Tablet/desktop nav
│   │   └── DetailPane.tsx      # Desktop right pane
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   ├── ResultsList.tsx
│   │   ├── ResultRow.tsx       # Single file result
│   │   └── UserResultGroup.tsx # Results grouped by user
│   ├── transfers/
│   │   ├── TransferList.tsx
│   │   ├── TransferRow.tsx
│   │   └── TransferProgress.tsx
│   ├── library/
│   │   └── FileTree.tsx
│   └── ui/                     # Primitives
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Badge.tsx
│       ├── Spinner.tsx
│       └── Sheet.tsx           # Mobile bottom sheet
│
├── lib/
│   ├── slskd.ts                # Typed API client — all slskd calls live here
│   └── utils.ts                # formatBytes, formatSpeed, formatDuration
│
├── hooks/
│   ├── useSearch.ts
│   ├── useTransfers.ts         # Polls /transfers every 2s
│   └── useApplication.ts      # Server status, connected users count
│
└── tailwind.config.ts          # CSS var tokens wired into Tailwind
```

---

## slskd Setup (Docker)

```yaml
# docker-compose.yml
services:
  slskd:
    image: slskd/slskd:latest
    container_name: slskd
    ports:
      - "5030:5030"    # HTTP API + built-in web UI
      - "5031:5031"    # HTTPS (optional)
      - "2416:2416"    # Soulseek P2P
    volumes:
      - ./config:/app/config
      - ./downloads:/app/downloads
      - ./shared:/app/shared
    restart: unless-stopped
    environment:
      - SLSKD_REMOTE_CONFIGURATION=true
```

**Minimum `slskd.yml` config:**

```yaml
soulseek:
  username: your_username
  password: your_password

web:
  authentication:
    disabled: false       # keep auth on; you'll pass the JWT from Next.js
    jwt_key: your_secret_jwt_key_here

directories:
  downloads: /app/downloads
  shared:
    - /app/shared
```

---

## Next.js API Proxy Layer

All slskd calls go through `/app/api/` routes. This:

1. Keeps the slskd URL + JWT secret server-side only
2. Lets you add your own auth on top later
3. Hides CORS issues

```ts
// lib/slskd.ts — base client

const SLSKD_BASE = process.env.SLSKD_URL!          // e.g. http://localhost:5030
const SLSKD_TOKEN = process.env.SLSKD_API_KEY!      // API key from slskd config

export async function slskd(path: string, options?: RequestInit) {
  const res = await fetch(`${SLSKD_BASE}/api/v0${path}`, {
    ...options,
    headers: {
      'X-API-Key': SLSKD_TOKEN,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`slskd ${res.status}: ${path}`)
  return res.json()
}
```

---

## Key slskd API Endpoints Used

| Action | Method | Endpoint |
|---|---|---|
| Search | POST | `/searches` |
| Poll search results | GET | `/searches/{id}` |
| Get all transfers | GET | `/transfers/downloads` |
| Queue a download | POST | `/transfers/downloads/{username}/{filename}` |
| Cancel a transfer | DELETE | `/transfers/downloads/{username}/{id}` |
| Retry a transfer | PUT | `/transfers/downloads/{username}/{id}` |
| Application status | GET | `/application` |

Full API docs available at `http://localhost:5030/swagger` when slskd is running.

---

## Search Flow

```
User types query → debounce 400ms
  → POST /api/search (Next route)
    → slskd POST /searches { searchText, fileLimit: 100 }
    → returns { id }
  → poll GET /api/search?id={id} every 1.5s
    → slskd GET /searches/{id}
    → returns { isComplete, responses: [{ username, files[] }] }
  → render incrementally as responses arrive
  → stop polling when isComplete === true
```

Results UI:
- Grouped by username (collapsible)
- Each file row: filename | size | bitrate | queue position | Download button
- Filter bar: file type toggle (mp3 / flac / other), min bitrate, max queue

---

## Transfers / Queue View

- TanStack Query polling `GET /transfers/downloads` every **2 seconds**
- Grouped by status: `Queued` → `Initialising` → `InProgress` → `Completed` / `Errored`
- In-progress rows show live speed + progress bar + ETA
- Swipe-to-cancel on mobile (or long-press context menu)
- Bulk actions: Cancel all errored, Retry all failed

Transfer row anatomy (mobile):
```
[filename truncated]                    [status badge]
[username]                              [size]
[============================------]    [speed / ETA]
```

---

## Library View

- Reads from slskd's shared directories listing (`GET /shares`)
- Simple file tree — expand folders, see what's downloaded
- Useful to verify files landed correctly
- No playback — this is a download manager, not a player

---

## Settings Page

| Setting | Source |
|---|---|
| slskd connection status | GET /application |
| Soulseek username | GET /application |
| Connected peers | GET /application |
| Download directory | Display only (set in slskd.yml) |
| Speed limits | PUT /application (slskd supports this) |
| Shared folders list | GET /shares |

---

## Remote Access — Tailscale

Run Tailscale on the host machine. Access the app at:

```
http://your-machine-name:3000
```

or set up a **Tailscale Funnel** to get an HTTPS URL without any port forwarding.

No ports need to be opened on your router. slskd's P2P port (`2416`) still needs to be reachable for downloads to work — either keep port forwarding for that one port, or accept that queued downloads will proceed once you're home.

**Alternative**: deploy the Next.js app to Vercel, point it at a Tailscale-accessible slskd instance using a static IP or DNS name within your tailnet. Cleanest setup for mobile use.

---

## Environment Variables

```env
# .env.local

SLSKD_URL=http://localhost:5030
SLSKD_API_KEY=your_slskd_api_key

# Optional: add your own basic auth on top of the Next.js layer
APP_PASSWORD=your_app_password
```

---

## Implementation Order

1. **Docker** — get slskd running, verify via its built-in UI at `:5030`
2. **Tailwind + tokens** — wire CSS vars into `tailwind.config.ts`, build the shell layout with bottom tab bar
3. **slskd client lib** — `lib/slskd.ts` + API routes for search and transfers
4. **Search view** — the core use case; get search → results → queue download working end to end
5. **Queue / transfers view** — polling, progress display, cancel/retry
6. **Library view** — read-only, lower priority
7. **Settings** — status + speed limits
8. **Tailscale** — expose and test from mobile
