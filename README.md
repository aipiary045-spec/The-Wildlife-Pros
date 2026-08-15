# CritterOps

Field-service operations for **The Wildlife Pros** — Jobber-style CRM, dispatch, quotes, invoicing, Square payments, timesheets, plus trap inventory, species logs, exclusion photos, and pesticide compliance.

Payments are collected by staff in **Square** (Terminal, POS, or a keyed card on the invoice). Customers do not log in to pay.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma 7
- Cookie JWT auth
- Built-in route optimization (preview, then apply; keep-tech reorder or rebalance)

## Quick start

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev --name init
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

## Project map

```
prisma/schema.prisma     domain model
prisma/schema.sql        generated PostgreSQL DDL
prisma/seed.ts           Wildlife Pros demo data
src/app/(office)         office UI
src/app/field            technician phone UI
src/app/portal           customer hub
src/app/api              REST API
src/lib/routing.ts       route optimizer
src/lib/maps.ts          Google/Apple Maps links (address first)
src/lib/geocode.ts       geocode addresses; optional Mapbox road times
docs/CURSOR_PROMPT.md    standing Cursor brief
docs/API.md              endpoint list
docs/DATA.md             cheap self-host (Pi/Postgres), Google Sheets sync
scripts/backup-postgres.sh  local dumps — no hosted database
```

## Scripts

- `npm run dev` — Next.js
- `npm run build` — generate Prisma client + production build
- `npm run db:seed` — reset demo records
- `npm test` — routing unit tests
- `npm run lint` — ESLint
