# CritterOps

Field-service operations for **The Wildlife Pros** — Jobber-style CRM, dispatch, quotes, invoicing, timesheets, and a client hub, plus trap inventory, species logs, exclusion photos, and pesticide compliance.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma 7
- Cookie JWT auth
- Built-in route optimization (nearest-neighbor + 2-opt)

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
| Owner | owner@thewildlifepros.com | demo |
| Dispatch | dispatch@thewildlifepros.com | demo |
| Technician | tech@thewildlifepros.com | demo |

Client hub: [/portal/demo-client-hub](http://localhost:3000/portal/demo-client-hub)

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
docs/CURSOR_PROMPT.md    standing Cursor brief
docs/API.md              endpoint list
```

## Scripts

- `npm run dev` — Next.js
- `npm run build` — generate Prisma client + production build
- `npm run db:seed` — reset demo records
- `npm test` — routing unit tests
- `npm run lint` — ESLint
