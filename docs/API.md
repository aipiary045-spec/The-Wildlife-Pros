# CritterOps API

All office endpoints require the `critterops_session` cookie unless noted.

## Auth

`POST /api/auth/login` `{ email, password }`  
`POST /api/auth/logout`  
`GET /api/auth/me`

## CRM & jobs

`GET /api/clients`  
`POST /api/clients` `{ firstName, lastName, email, phone, companyName, notes, property? }`  
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
`POST /api/payments` `{ invoiceId, amount, method, reference }`

## Dispatch & routing

`GET /api/schedule?date` — Monday–Friday week payload  
`PATCH /api/schedule` `{ jobId, technicianId, scheduledStart, scheduledEnd }`  
`POST /api/routes/optimize` `{ date?, technicianIds?, persist? }`  
`GET /api/routes/optimize?date`

Optimization uses Haversine miles, nearest-neighbor construction, and 2-opt improvement from each technician’s home coordinates. Average speed is 22 mph until a maps provider is wired in.

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

`GET /api/portal/:token`  
`POST /api/portal/:token/actions` `{ type: "approve_quote"|"decline_quote"|"pay_invoice", id, note?, method? }`
