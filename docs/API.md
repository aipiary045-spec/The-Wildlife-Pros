# CritterOps API

All office endpoints require the `critterops_session` cookie unless noted.

## Auth

`POST /api/auth/login` `{ email, password }`  
`POST /api/auth/logout`  
`GET /api/auth/me`

## CRM & jobs

`GET /api/clients`  
`POST /api/clients` `{ firstName, lastName, email, phone, companyName, notes, property? }` — if the property has an address but no lat/lng, CritterOps geocodes it  
`GET /api/clients/:id`  
`PATCH /api/clients/:id`

`GET /api/jobs?status&technicianId&from&to`  
`POST /api/jobs` `{ clientId, propertyId, title, type, scheduledStart, technicianId, lineItems[] }`  
`GET /api/jobs/:id`  
`PATCH /api/jobs/:id` `{ status, technicianId, scheduledStart, scheduledEnd }`

## Quotes, invoices, payments

`GET|POST /api/quotes`  
`GET|PATCH /api/quotes/:id`  
`GET|POST /api/invoices` — `POST` with `jobId` copies job line items and marks the job `INVOICED`  
`GET /api/invoices/:id`  
`POST /api/payments` `{ invoiceId, amount, method: "SQUARE"|"CASH"|"CHECK", reference }` — staff record of a Terminal/POS/cash/check payment  
`GET /api/payments/square/config` — application id, location, sandbox, configured  
`POST /api/payments/square` `{ invoiceId, sourceId, amount, idempotencyKey }` — staff-keyed Square charge

Clients never pay through CritterOps. Square is the processor.

## Dispatch & routing

`GET /api/schedule?view=day|week&date=YYYY-MM-DD` — day board or Monday–Sunday week payload  
`PATCH /api/schedule` `{ jobId, technicianId, scheduledStart, scheduledEnd }` — move a job  
`POST /api/schedule` `{ jobId, technicianId, scheduledStart, scheduledEnd, instructions?, durationMin? }` — new trip card: same client and job details, new visit info  
`POST /api/routes/optimize` `{ date?: "YYYY-MM-DD", technicianIds?, mode?: "reorder"|"rebalance", startHour?: 5-12, persist?: boolean }`  
`GET /api/routes/optimize?date=YYYY-MM-DD`

Default `mode` is `reorder`: keep each job on its technician and only fix driving order. Unassigned jobs go to the nearest home. `rebalance` may move stops between selected techs. `persist: false` (the UI preview) returns the plan without writing. `persist: true` upserts `RouteDay` / `RouteStop`, rewrites `scheduledStart` from `startHour` (default 8:00) plus each stop’s ETA offset, and deletes a saved route when a selected tech ends up with zero stops.

Jobs that are on site, in progress, completed, invoiced, cancelled, or on hold are left alone. Jobs without coordinates are geocoded from the property **address** when possible (Mapbox if `MAPBOX_TOKEN` is set, otherwise OpenStreetMap Nominatim). If geocoding fails they come back in `skipped`. Techs navigate by address in Google/Apple Maps; GPS is only the backup pin. Average speed is 22 mph (Haversine) unless Mapbox Directions snaps the previewed order to road time. `driveTimes` in the POST response is `haversine` or `mapbox`.

## Wildlife field data

`GET|POST /api/traps`  
`GET|POST|PATCH /api/deployments`  
`GET|POST /api/species-logs`  
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

`GET /api/exports/google-sheets` — whether Sheets is configured and the linked workbook  
`POST /api/exports/google-sheets` — create the workbook once, then update/append in place

`GET /api/portal/:token` — visits and quotes only  
`POST /api/portal/:token/actions` `{ type: "approve_quote"|"decline_quote", id, note? }`
