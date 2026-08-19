# CritterOps

Field-service operations for **The Wildlife Pros** — CRM, dispatch, quotes, invoicing, Square payments, timesheets, trap inventory, species logs, and field tools.

**Production:** https://the-wildlife-pros.vercel.app

Payments are collected by staff in **Square** (Terminal, POS, or keyed card on the invoice). Customers do not log in to pay.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma 7
- Cookie JWT auth
- Built-in route optimization (preview, then apply)

## Quick start

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@thewildlifepros.com | demo |
| Dispatch | dispatch@thewildlifepros.com | demo |
| Technician | tech@thewildlifepros.com | demo |

Client hub: [/portal/demo-client-hub](http://localhost:3000/portal/demo-client-hub)

Office can add and disable people on `/team`. Disable keeps their jobs and timesheets; they cannot sign in and they drop off the calendar.

## Documentation

See [docs/README.md](./docs/README.md) for the full doc index (API reference, data/self-hosting, Cursor agent brief).

## Project map

```
prisma/schema.prisma     domain model
prisma/schema.sql        generated PostgreSQL DDL
prisma/seed.ts           Wildlife Pros demo data
src/app/(office)         office UI
src/app/field            technician phone UI
src/app/portal           customer hub
src/app/api              REST API
src/lib/                 auth, routing, billing, messaging, etc.
docs/                    API, data, and agent briefs
scripts/backup-postgres.sh  local Postgres dumps
.github/workflows/ci.yml tests + build on push/PR
```

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` — Prisma generate + production build
- `npm run db:push` — apply schema to the database
- `npm run db:seed` — load demo records
- `npm test` — unit tests (`tsx --test`)
- `npm run lint` — ESLint

## Contributing

Work on `main` or short-lived `cursor/<topic>-7690` branches. Open a pull request when ready; CI runs tests and a production build automatically.
