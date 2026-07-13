# Making Apollo portable

Apollo is two processes: the Next.js app (this repo) and the `slskd` daemon
(a single self-contained exe). Both are happy living inside one folder, so a
portable install is just a directory you can zip and move.

## Recommended layout

```
apollo-local\
├── .env.local              ← your machine-specific secrets (never commit)
├── app\ components\ ...    ← Apollo source
├── slskd\
│   ├── bin\slskd.exe       ← the daemon binary (gitignored)
│   ├── app\slskd.yml       ← live slskd config: credentials, api key, paths
│   └── app\...             ← slskd runtime data (db, logs)
└── scripts\
    └── update-slskd.ps1    ← one-command slskd upgrade
```

Yes — package `slskd.exe` inside the directory. It is a self-contained
.NET binary with zero install footprint (no registry, no services, no
global dependencies), which makes it ideal for this. The whole folder is
the app.

## Moving to a new machine

1. Copy the folder (or clone the repo and copy `slskd\bin`, `slskd\app`,
   and `.env.local` across separately, since all three are gitignored).
2. Fix the two absolute paths that reference the old machine:
   - `SLSKD_CONFIG_PATH` in `.env.local`
   - `directories.downloads` / `shares.directories` in `slskd\app\slskd.yml`
3. `npm install`, then `npm run dev` (or `npm run build && npm start`).
4. Run slskd: `.\slskd\bin\slskd.exe --app-dir "<full path>\slskd\app"`.
5. Allow inbound TCP on the Soulseek listen port (50300) for `slskd.exe`
   in Windows Firewall so remote peers can reach you directly.

## Updating slskd

Updating is manual in the sense that nothing auto-updates — but it doesn't
need to be tedious. slskd is a single exe: an upgrade is "replace the file".
Run:

```powershell
.\scripts\update-slskd.ps1
```

The script checks the latest GitHub release, downloads the `win-x64` zip,
backs up the current binary to `slskd\bin\previous\`, and swaps the new one
in. Stop slskd before running it (the exe can't be replaced while running).

Your config and data are never touched by an update — they live in
`slskd\app\`, which the binary reads at startup.

## What stays out of git

The repo intentionally ignores everything machine- or identity-specific:

| Path | Why |
|---|---|
| `.env.local` | slskd API key |
| `slskd/bin/` | the binary — big, and updates independently |
| `slskd/app/`, `slskd/config/` | Soulseek password + API key live in `slskd.yml` |
| `slskd/downloads/`, `slskd/incomplete/`, `slskd/shared/` | your music |
| `.apollo-renames.json` | transient rename queue |
| `.apollo-collections.json` | liked tracks + playlists (server-side) |

So the git repo is safely shareable, and the *folder* is your portable,
private instance.
