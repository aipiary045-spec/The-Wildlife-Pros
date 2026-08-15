# CritterOps — Cursor project prompt

Use this document as the standing product and engineering brief when continuing work in Cursor. CritterOps is a Jobber-class field-service platform purpose-built for **The Wildlife Pros** (pest + wildlife removal).

## Product

Build and extend a web + mobile-ready operations system that feels as complete as Jobber for office staff, while adding wildlife-specific field tools technicians actually use on a trapline.

**Company:** The Wildlife Pros  
**Product name:** CritterOps  
**Brand:** Hexagon sunset logo, orange `#E85D04`, amber `#F48C06`, gold `#F9C74F`, ink `#111111`, warm paper background `#F6EFE4`.

### Jobber-style core (must stay first-class)

- Client & property CRM (one customer, many service addresses)
- Incoming requests → quotes → jobs → invoices → payments
- Drag-and-drop dispatch calendar (technician × day)
- Recurring service visits
- Digital quotes clients approve in a Client Hub
- Invoices generated from completed jobs, balances, partial payments
- **Payments are Square-only and staff-collected.** Clients do not log into CritterOps to pay. Techs/office take Terminal, POS, cash/check, or a staff-keyed Square card charge on the invoice.
- Optional Client Hub for visit info / quote approval only — never billing
- Technician field view (phone-first)
- Route optimization for a day’s stops
- Daily timesheets: technicians clock in/out (multiple punches per day), office reviews and approves hours

### Wildlife / pest additions (the differentiator)

- Serialized trap & equipment inventory (cages, one-way doors, cameras, stations)
- Deployments tied to a job + property + location note (`T-014 · Active · Raccoon in attic`)
- Trap check history
- Species & capture log with disposition (relocate, release, euthanize, etc.)
- Entry-point mapping and exclusion materials
- Chemical / rodenticide applications with EPA numbers, target pests, rates
- Customizable state compliance forms
- Before/after photos tagged to entry points and damage areas

## Tech stack

- Next.js App Router (current major) + TypeScript + Tailwind v4
- PostgreSQL + Prisma 7 (`prisma.config.ts`, `@prisma/adapter-pg`). SQLite is a planned local/Pi option; Google Sheets is export-only (see `docs/DATA.md`).
- Cookie JWT auth (`jose` + `bcryptjs`) — no NextAuth unless a later PR needs OAuth
- Route math in `src/lib/routing.ts` (Haversine, nearest-neighbor, 2-opt)
- Demo seed in `prisma/seed.ts`

Do not introduce a second framework. Prefer server components for reads, route handlers for mutations, and small `"use client"` islands for drag-drop / portal actions.

## Architecture

```
src/app/(office)     staff UI (sidebar)
src/app/field        technician phone UI
src/app/portal       customer hub (token auth)
src/app/api          REST used by UI, field app, future mobile
src/lib              prisma, auth, routing, money helpers
prisma/schema.prisma source of truth for the domain
```

Auth cookie: `critterops_session`.  
Public routes: `/`, `/login`, `/portal/*`, `/api/auth/*`, `/api/portal/*`, `/api/health`.  
Everything else requires a session (`src/proxy.ts`).

## Domain rules

- A **Client** owns many **Properties**. Jobs always belong to one property.
- Quotes and invoices are document records with line items; totals are stored denormalized.
- Completing a job should make “create invoice” a one-click API (`POST /api/invoices` with `jobId`).
- Do not add customer self-serve invoice payment. Square is the processor. `POST /api/payments/square` charges a staff-tokenized card; `POST /api/payments` records Terminal/POS/cash/check.
- Equipment has a global serial number. A live **EquipmentDeployment** is the site-specific status.
- Capture events may point at a deployment. Logging a capture should flip that deployment to `ACTIVE_CAPTURE`.
- Photos must be able to reference job, property, and entry point.
- Route optimize may persist: rewrite `RouteDay` / `RouteStop` and reschedule job start times.
- A technician has one **Timesheet** per calendar day and one or more **TimePunch** pairs. Clock-in opens a punch; clock-out closes it. Only one punch may be open. Office roles approve sheets.
- Google Sheets sync reuses one spreadsheet (`Organization.googleSpreadsheetId`). Upsert rows by id. Never create a second workbook on a later upload.

## API map

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Credentials → cookie |
| POST | `/api/auth/logout` | Clear cookie |
| GET | `/api/auth/me` | Session |
| GET/POST | `/api/clients` | CRM list / create |
| GET/PATCH | `/api/clients/[id]` | Client 360 |
| GET/POST | `/api/jobs` | Work orders |
| GET/PATCH | `/api/jobs/[id]` | Job + wildlife docs |
| GET/POST | `/api/quotes` | Estimates |
| PATCH | `/api/quotes/[id]` | send / approve / decline |
| GET/POST | `/api/invoices` | Billing; pass `jobId` to copy line items |
| POST | `/api/payments` | Record Terminal / cash / check (staff only) |
| GET | `/api/payments/square/config` | Public Square app/location flags |
| POST | `/api/payments/square` | Charge a Square payment token (staff only) |
| GET/PATCH | `/api/schedule` | Day or Mon–Sun week board + drag-drop reschedule |
| GET/POST | `/api/routes/optimize` | Preview or persist optimized routes |
| GET/POST | `/api/traps` | Serialized inventory |
| GET/POST/PATCH | `/api/deployments` | Place / retrieve gear |
| GET/POST | `/api/species-logs` | Captures |
| GET/POST | `/api/applications` | Pesticide / rodenticide log |
| GET/POST | `/api/photos` | Tagged documentation |
| GET/POST | `/api/compliance` | Forms + application rollup |
| GET | `/api/portal/[token]` | Client hub payload |
| POST | `/api/portal/[token]/actions` | approve / decline quote only |
| GET | `/api/timesheets` | Office/tech timesheet list |
| GET | `/api/timesheets/me` | Current user today + recent |
| POST | `/api/timesheets/clock` | `{ action: "in" \| "out" }` |
| PATCH | `/api/timesheets/[id]` | submit / approve / reject |
| GET/POST | `/api/exports/google-sheets` | Status + upsert sync to the existing workbook |

## UI conventions

- Dark ink sidebar, orange active state, Wildlife Pros wordmark + hex logo
- Status pills via `StatusBadge`
- Money via `formatMoney`
- Office pages are `force-dynamic` and read Prisma directly
- Field app is a single-column phone layout
- Optional client hub is unauthenticated except for the unguessable `portalToken` and must never collect cards

## Demo

```
owner@thewildlifepros.com / demo
dispatch@thewildlifepros.com / demo
tech@thewildlifepros.com / demo
Client hub: /portal/demo-client-hub
```

## What to build next (in order)

1. Create/edit forms for clients, jobs, quotes, invoices (office UI currently lists + details)
1b. Job-level timers that attach `TimeEntry` rows to the open daily timesheet
2. Recurring visit generator from `RecurringSchedule`
3. File uploads to object storage instead of public SVG placeholders
4. Square Terminal / Mobile Payments SDK for the field app (cards already go through Square on the invoice page)
5. Map tiles + turn-by-turn using Mapbox/Google; keep `routing.ts` as the offline fallback
6. Push notifications / SMS visit reminders
7. React Native or PWA packaging of `/field`
8. Multi-state compliance template library
9. Reports: revenue, capture counts, chemical usage, tech utilization

## Guardrails

- Keep PostgreSQL as the system of record. Do not add a second database.
- Do not weaken auth on office APIs.
- Do not invent EPA numbers or legal text — keep products/forms data-driven.
- Match existing naming (`Job`, `Visit`, `EquipmentDeployment`) instead of introducing synonyms.
- When adding features, update this file and `docs/API.md`.
