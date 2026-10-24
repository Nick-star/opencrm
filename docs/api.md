# HTTP API

Base path: `/api/v1`. Mutations require `Content-Type: application/json`. JSON keys use camelCase. Read-only keys such as id and createdAt are rejected in request bodies.

## Routes

| Method | Route | Behavior |
| --- | --- | --- |
| GET | /health | Database readiness; 200 or 503 |
| GET | /customers | Search, archive filter, pagination |
| GET | /customers/{id} | Customer details |
| POST | /customers | Create a customer; 201 |
| PATCH | /customers/{id} | Update supplied writable contact fields |
| PATCH | /customers/{id}/archive | `{ "archived": true/false }` |
| GET | /deals | Customer/stage filters, title search, pagination |
| GET | /deals/{id} | Deal details |
| POST | /deals | Create a deal in the new stage; 201 |
| PATCH | /deals/{id} | Update title, amountMinor, description |
| PATCH | /deals/{id}/stage | `{ "stage": "won" }` |
| POST | /deals/{id}/reopen | `{}`; reopen a closed deal to new |
| GET | /tasks | Customer/status/calendar filters, pagination |
| GET | /tasks/{id} | Task details |
| POST | /tasks | Create an open task; 201 |
| PATCH | /tasks/{id} | Update title, dueAt, dealId |
| PATCH | /tasks/{id}/completion | `{ "completed": true/false }` |
| GET | /dashboard | Customer count, open/won deal counts and sums, today's and overdue task pages |

Other successful operations return 200 and the resulting record.

## Records

- Customer: id, name, email, company, phone, notes, archived, createdAt. Name (1–120 characters) and email are required. Company (120), phone (50) and notes (5000) default to empty strings.
- Deal: id, customerId, title, amountMinor, stage, description, createdAt. customerId and title (1–120) are required. amountMinor defaults to 0, is an integer between 0 and 1,000,000,000,000. Description is at most 5000 characters. Stage is new, negotiation, proposal, won or lost.
- Task: id, customerId, dealId, title, dueAt, completed, createdAt. customerId, title (1–120) and dueAt are required. dueAt is RFC 3339 with an explicit UTC offset and is returned in UTC. dealId is null when unlinked; PATCH with null removes the link.

Customer IDs on existing deals/tasks cannot be changed. A task's deal must belong to its customer. Archiving conflicts with any open deal or incomplete task. Restore a customer before creating or modifying its deals/tasks. Closed deal stages are changed only through explicit reopening.

## Lists and filters

All lists return `{ "items": [], "total": 0, "page": 1, "pageSize": 20 }`.

- page starts at 1; pageSize defaults to 20, maximum 100.
- customers: q searches name, email and company, archived is false (default), true or all.
- deals: customerId, stage, q searches title.
- tasks: customerId, filter is all (default), open, completed, today or overdue.
- tasks/dashboard: timeZone is an IANA identifier, default UTC. Today includes only incomplete tasks within that local calendar day. Overdue means incomplete and strictly earlier than the server's current time.
- Customer/deal lists sort newest first; tasks sort by due instant then ID. IDs are stable across updates and migration.

Dashboard returns activeCustomers, openDeals, wonDeals, openAmountMinor, wonAmountMinor, today and overdue. The last two are task list envelopes (first 20 records with full counts); use /tasks for further pages. Won sums describe deal values, not received payments.

## Errors

`{ "code": "validation", "error": "message", "fields": { "email": "message" } }`

Codes: validation (400), not_found (404), conflict (409), internal (500), unavailable (health 503). Field details may be null. The UI translates codes and field labels; English error text is diagnostic. Unexpected storage errors never expose SQL.

The list envelope replaces the original scaffold's bare customer array. There are no external compatibility guarantees for this local MVP.
