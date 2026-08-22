# CritterOps API

All office endpoints require the `critterops_session` cookie unless noted.

## Auth

`POST /api/auth/login` `{ email, password }`  
`POST /api/auth/logout`

## Team

`GET|POST /api/users` — owner, admin, and dispatch. POST `{ firstName, lastName, email, password, role, phone?, color?, homeAddress? }`  
`PATCH /api/users/:id` `{ status: "ACTIVE"|"DISABLED", role?, password?, ... }` — disable instead of delete so jobs stay. Dispatch can only change technicians.

## CRM & jobs

`GET /api/clients`  
`POST /api/clients` `{ firstName, lastName, email, phone, companyName, notes, property? }` — if the property has an address but no lat/lng, CritterOps geocodes it  
`GET /api/clients/:id`  
`PATCH /api/clients/:id`

`GET /api/jobs?status&technicianId&from&to`  
`POST /api/jobs` `{ clientId, propertyId, title, type, technicianId, scheduledStart, scheduledEnd, durationMin, lineItems[] }` — `clientId`, `propertyId`, and `title` are required; a start time marks the job `SCHEDULED`  
`GET /api/jobs/:id`  
`PATCH /api/jobs/:id` `{ status, technicianId, scheduledStart, scheduledEnd }`  
`POST /api/jobs/:id/check-in` — on site: job `ON_SITE`, open `TimeEntry` + `Visit`, auto day clock-in if needed  
`POST /api/jobs/:id/check-out` `{ outcome: "complete"|"follow_up", notes?, followUp?: { scheduledStart, scheduledEnd, technicianId, durationMin, instructions } }` — closes the visit. `complete` marks the job `COMPLETED`. `follow_up` does the same and creates a new scheduled job for the same client/address

## Quotes, invoices, payments

`GET|POST /api/quotes` `{ clientId, propertyId, title, message?, validUntil?, lineItems[] }`  
`GET|PATCH /api/quotes/:id` — PATCH `{ status: "SENT"|"APPROVED"|"DECLINED" }`  
`POST /api/quotes/:id/convert` `{ technicianId?, scheduledStart?, durationMin? }` — copies line items onto a job and marks the quote `CONVERTED`  
`GET /api/services` — active price-list catalog  
`GET|POST /api/invoices` — `POST` with `jobId` copies job line items and marks the job `INVOICED`  
`GET|PATCH /api/invoices/:id` — PATCH `{ status: "SENT"|"VOID" }`  
`POST /api/payments` `{ invoiceId, amount, method: "SQUARE"|"CASH"|"CHECK", reference }` — staff record of a Terminal/POS/cash/check payment  
`GET /api/payments/square/config` — application id, location, sandbox, configured  
`POST /api/payments/square` `{ invoiceId, sourceId, amount, idempotencyKey }` — staff-keyed Square charge

Clients never pay through CritterOps. Square is the processor.

## Dispatch & routing

`GET /api/schedule?view=day|week&date=YYYY-MM-DD` — day board or Monday–Sunday week payload, plus `unscheduled` jobs and `clients` for the new-job dialog  
`PATCH /api/schedule` `{ jobId, technicianId, scheduledStart, scheduledEnd }` — move a job onto a tech/time  
`POST /api/schedule` `{ jobId, technicianId, scheduledStart, scheduledEnd, instructions?, durationMin? }` — dispatch copy: same client and job details, new visit info. Field follow-ups are created at check-out instead.  
`POST /api/routes/optimize` `{ date?: "YYYY-MM-DD", technicianIds?, mode?: "reorder"|"rebalance", startHour?: 5-12, persist?: boolean }`  
`GET /api/routes/optimize?date=YYYY-MM-DD`

Default `mode` is `reorder`: keep each job on its technician and only fix driving order. Unassigned jobs go to the nearest home. `rebalance` may move stops between selected techs. `persist: false` (the UI preview) returns the plan without writing. `persist: true` upserts `RouteDay` / `RouteStop`, rewrites `scheduledStart` from `startHour` (default 8:00) plus each stop’s ETA offset, and deletes a saved route when a selected tech ends up with zero stops.

Jobs that are on site, in progress, completed, invoiced, cancelled, or on hold are left alone. Jobs without coordinates are geocoded from the property **address** when possible (`OPENROUTESERVICE_API_KEY`, else `MAPBOX_TOKEN`, else OpenStreetMap Nominatim). If geocoding fails they come back in `skipped`. Techs navigate by address in Google/Apple Maps; GPS is only the backup pin. When OpenRouteService or Mapbox is configured, stop order uses a road distance matrix and ETAs/path use Directions; otherwise average speed is 22 mph (Haversine). `driveTimes` in the POST response is `haversine`, `openrouteservice`, or `mapbox`. Assignments may include `geometry` (`[lng,lat]` polyline) and `home` for the Routes map preview.

## Wildlife field data

`GET|POST /api/traps` `{ serialNumber?, name, type, manufacturer?, notes? }` — add serialized gear to shop stock. Serial is unique; if omitted, CritterOps suggests the next `T-` / `OWD-` / `CAM-` number.  
`GET|POST /api/deployments` `{ equipmentId, jobId, locationNote, targetSpecies?, baitUsed? }` — place a trap on the job’s property. Rejects if that serial is already in the field.  
`PATCH /api/deployments` `{ id, status, locationNote? }` — `RETRIEVED` sets `retrievedAt` and returns the gear to `IN_INVENTORY`  
`GET|POST /api/species-logs` `{ jobId, speciesId, quantity, disposition, deploymentId?, locationNote? }`  
`POST /api/recurring` `{ jobId, frequency: "WEEKLY"|"BIWEEKLY"|"MONTHLY"|"QUARTERLY", interval?, count? }` — copies the job forward onto the calendar  
`GET|POST /api/applications`  
`GET|POST /api/photos`  
`GET|POST /api/compliance`

## Timesheets

`GET /api/timesheets?userId&from&to` — techs see only their own; office sees the team  
`GET /api/timesheets/me` — today plus the last two weeks  
`POST /api/timesheets/clock` `{ action: "in" | "out", note? }` — one open punch at a time; clocking in again after lunch starts a new punch  
`PATCH /api/timesheets/:id` `{ status: "SUBMITTED"|"APPROVED"|"REJECTED", notes?, breakMin? }` — approve/reject is office-only

Worked minutes = sum of punch spans minus `breakMin`.

## Client hub (public token)

`GET /api/exports/google-sheets` — whether Sheets is configured, linked workbook, and export categories with row counts  
`POST /api/exports/google-sheets` — `{ categories?: ["clients","invoices",...] }` syncs selected tabs (or all when omitted) into the shared workbook  
`GET /api/exports/csv/:category` — download one category as CSV (office roles)

`GET /api/portal/:token` — visits and quotes only  
`POST /api/portal/:token/actions` `{ type: "approve_quote"|"decline_quote", id, note? }`
