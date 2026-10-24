# Architecture

Browser → Next.js `/api/v1/*` rewrite → Go HTTP API → SQLite.

Go runs as one process. The standard library HTTP router uses method-aware routes.
The store embeds the initial schema and initializes SQLite with WAL, foreign keys and a busy timeout.
A single database connection serializes writes; this is a deliberate starting point for a small local CRM.
The API binds to loopback by default and shuts down gracefully on SIGINT/SIGTERM.

Next.js uses App Router, TypeScript, Tailwind CSS and locally owned shadcn/ui components.
The interactive customer workspace calls the same-origin API proxy, so browser requests need no CORS configuration.
API_ORIGIN is server-only and defaults to http://127.0.0.1:8080.
There is no application logic or database access in Next.js.

## Initial contract

- GET /api/v1/health — database readiness, 200 or 503.
- GET /api/v1/customers — newest 100 customers, empty array on a fresh database.
- POST /api/v1/customers — name, email, company; returns persisted customer with ID and timestamp (201).
- Errors use {"error":"message"}; malformed input returns 400.

## Next milestones

1. Authentication, session protection and per-user access rules.
2. Customer update/delete and pagination; versioned transactional migrations.
3. Contacts, deal stages, activities and dashboard aggregates.
4. OpenAPI contract, browser tests, deployment and SQLite backup/restore procedure.

The initial UI describes only persisted customers. There are no artificial sales metrics or seeded records.

Development and production builds use Webpack with the standard Tailwind PostCSS plugin. This avoids Turbopack requiring an extra local socket for CSS processing in restricted environments.
