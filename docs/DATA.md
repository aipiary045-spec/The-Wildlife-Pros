# Data: databases and Google Sheets

## What CritterOps uses today

The live system of record is **PostgreSQL**, accessed through Prisma. That is the right default for an office plus technicians all using the app at once (schedule, clock in/out, invoices, trap updates).

Google Sheets is **not** the database. It is an export the owner can open, filter, and share. CritterOps remains the source of truth.

## Can it run on SQLite (desktop or Raspberry Pi)?

Yes, for a small shop, with limits.

| | PostgreSQL | SQLite on a desktop or Pi |
| --- | --- | --- |
| Good for | Several people using the app at the same time | One machine serving a handful of users on the shop LAN |
| Install | Docker or `apt install postgresql` | A single file, e.g. `data/critterops.db` |
| Field techs | Works if the server is reachable (shop Wi‑Fi, Tailscale, or a VPS) | Same — the Pi/desktop must be the server the phones hit |
| Concurrent writes | Strong | Fine for a few techs; file locking can stall if everyone saves at once |
| Backups | `pg_dump` | Copy the `.db` file (do it while the app is idle) |

A Raspberry Pi 4/5 with 4 GB RAM can host CritterOps for The Wildlife Pros if:

- The Pi stays on and on the network
- Techs reach it (same Wi‑Fi, or Tailscale so phones work from a job site)
- You back up the database file or Postgres dump off the Pi (USB drive or Google Drive)

SQLite is **not** wired in the schema yet (Prisma is set to `postgresql`). Adding it is a follow-on switch: same models, `file:` URL, SQLite adapter. Do not use a Google Sheet as the live database — it will fight with Jobber-style scheduling and clock-in.

**Recommendation**

- Shop computer or Pi for 1–4 users: SQLite is OK once we enable it, or run Postgres in Docker on that same box.
- Growing crew or off-site phones all day: keep PostgreSQL (can still live on a Pi, a mini PC, or a $5–6 VPS).

## Google Sheets upload (one workbook, not a new file each time)

Office → **Google Sheets** (`/exports`).

1. First successful sync creates **CritterOps — The Wildlife Pros** and stores its id on the company record.
2. The next sync opens that same spreadsheet.
3. Each tab is upserted by record `id`: existing rows are updated, new rows are appended. Nothing is duplicated into a second workbook.

Tabs: Clients, Jobs, Invoices, Payments, Traps, Captures, Timesheets.

Setup:

1. Create a Google Cloud service account with Sheets + Drive access.
2. Download the JSON key.
3. Put it in `.env` as `GOOGLE_SERVICE_ACCOUNT_JSON`.
4. Set `GOOGLE_SHEETS_OWNER_EMAIL` to the owner’s Gmail so the file is shared with him.
5. Optional: `GOOGLE_SHEETS_SPREADSHEET_ID` if he already made a sheet and wants that exact file.
