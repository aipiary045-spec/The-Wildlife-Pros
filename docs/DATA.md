# Data: databases, cheap hosting, and Google Sheets

## Recommendation (save cloud money)

**Do not buy a hosted database** (Neon, Supabase, RDS, Firebase, PlanetScale). Those are the subscriptions that add up. PostgreSQL and SQLite are both free.

**Best fit for The Wildlife Pros:** keep PostgreSQL, run it on hardware they already own or a one-time Raspberry Pi. Same schema we already have. $0/month for the database.

```
Phones / office browsers
        │
        │  Tailscale (free) or shop Wi‑Fi
        ▼
Shop Pi or mini PC  ──  CritterOps (Next.js)
        │
        ▼
PostgreSQL on that same box   ── nightly backup to USB or Google Drive
        │
        ▼
Optional: Sync to one Google Sheet (export, not the live DB)
```

Why not switch everything to SQLite just to save money? Self-hosted Postgres is already free. SQLite only gets simpler if you want a single file and one quiet machine. It does not cut a monthly bill versus local Postgres.

Why not use Google Sheets as the database? It will break scheduling, clock-in, and two people editing at once. Keep Sheets as the owner’s spreadsheet view.

## What costs money vs what does not

| Item | Monthly cost if you self-host |
| --- | --- |
| PostgreSQL | $0 |
| SQLite | $0 |
| CritterOps app (`npm run start`) | $0 |
| Google Sheets export | $0 (normal Google account) |
| Tailscale (phones reach the shop box from a job) | $0 on the free plan for a small crew |
| Neon / Supabase / RDS | avoid |

The only recurring bill you might choose later is a cheap VPS (~$5) **if** there is no always-on shop computer. That is still cheaper than a database product plus Vercel plus a BaaS.

## Hardware

Pick one always-on box:

1. **Raspberry Pi 5, 4–8 GB** — quiet, low power, plenty for this crew.
2. **Old shop desktop or Intel NUC** — fine if it stays on and you do not mind the noise.
3. **$5 VPS** — only if the shop machine is unreliable (owner’s desktop being “messed up” is a reason to prefer a Pi, not the broken PC).

Give the Pi a USB SSD if you can. SD cards wear out; the database should not live only on a cheap SD card.

## Field techs without a cloud host

The database is local. Phones still need a path to that box:

- In the shop: same Wi‑Fi, open `http://critterops.local:3000` (or the Pi’s LAN IP).
- On a job: install **Tailscale** on the Pi and on each phone. Free for a small team. The app stays private; no port-forwarding the shop router to the internet.

## Backups (do this or a disk failure costs more than any cloud plan)

Nightly dump on the Pi:

```bash
./scripts/backup-postgres.sh
```

Copies a timestamped `.sql` into `backups/`. Copy that folder to a USB drive weekly, or upload the latest file to the owner’s Google Drive. Keep at least 7 days.

## SQLite — when we would add it

Add SQLite later only if you want “one file, no Docker, no Postgres service.” Good for a single-user demo laptop. For office + two techs clocking in, local PostgreSQL is the safer free option and matches the code today.

## Google Sheets (one workbook, not a new file each time)

Office → **Google Sheets** (`/exports`).

1. First successful sync creates **CritterOps — The Wildlife Pros** and stores its id.
2. Later syncs open that same file.
3. Rows match on record `id`: existing lines update, new ones append.

That is a report for the owner, not a replacement for Postgres.

Setup: service account JSON in `GOOGLE_SERVICE_ACCOUNT_JSON`, plus `GOOGLE_SHEETS_OWNER_EMAIL`. Optional `GOOGLE_SHEETS_SPREADSHEET_ID` to lock onto a sheet he already made.
