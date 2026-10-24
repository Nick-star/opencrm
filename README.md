# OpenCRM

A local, single-owner CRM built with a Go modular monolith, SQLite, Next.js App Router, TypeScript, shadcn/ui and Bun. Interface languages: Russian and English.

## MVP

- Customers: server-side search, pagination, contact details, notes, editing, archive and restore.
- Deals: fixed new → negotiation → proposal → won/lost pipeline, integer RUB amounts, explicit reopening.
- Tasks: customer/deal links, exact due times, completion, today's and overdue lists in the browser's time zone.
- Dashboard: active customers, open/won deal values and upcoming/overdue work.

The complete flow is customer → deal → next-contact task → completion → sale outcome. Closing a deal never silently completes tasks. Customer history is preserved; archiving requires all work to be closed.

## Run locally

Requirements: Go 1.26+, Node.js 22.15+, Bun 1.4.4+. SQLite uses a pure-Go driver; system SQLite is unnecessary.

```sh
cd src/backend
go mod download
cd ../frontend
bun install --frozen-lockfile
cd ../..
```

Start these commands in separate terminals from the repository root:

```sh
make dev-api
```

```sh
make dev-web
```

Open http://localhost:3000. The root redirects to `/ru`; use the language switch for English. Customer, deal and task data persist in `src/backend/opencrm.db`, excluded from Git. No sample customer records are inserted automatically.

Both development services bind to loopback. This MVP has no authentication and is intended only for local use.

## Configuration

Defaults work without an environment file. Go reads process environment variables; `.env.example` is documentation, not an automatically loaded file.

| Variable | Service | Default |
| --- | --- | --- |
| HTTP_ADDR | Go | 127.0.0.1:8080 |
| DATABASE_PATH | Go | opencrm.db |
| API_ORIGIN | Next.js | http://127.0.0.1:8080 |

For Next.js overrides copy `src/frontend/.env.example` to `src/frontend/.env.local`. Set Go overrides in the environment, e.g. `DATABASE_PATH=/tmp/demo.db make dev-api`. Task times are stored in UTC and shown in the browser time zone; API calendar queries accept an IANA `timeZone`.

Existing scaffold databases are upgraded transactionally on startup without losing customers. A newer unsupported schema stops startup. Back up an existing database before upgrading: stop the API, then copy the database and any remaining `-wal`/`-shm` files together. Restore while the API is stopped.

## Verify

Install the Chromium browser once:

```sh
cd src/frontend
bun x playwright install chromium
cd ../..
make check
```

`make check` runs Go HTTP integration tests with temporary SQLite and the race detector, go vet, Oxfmt, Oxlint, TypeScript, production build and Playwright Chromium. Browser tests start actual Go/Next.js servers on ports 18080/13000 and use a disposable database, never your ordinary CRM data. On Linux, browser system packages can be installed with `bun x playwright install --with-deps chromium`.

GitHub Actions runs the same checks and retains browser traces on failure. `bun run test:e2e` runs browser tests alone from `src/frontend`.

Tests cover migrations and restart persistence, search beyond 100 records, stage transitions, exact amounts, link validation, archive conflicts/concurrency, UTC/calendar boundaries, two languages, server error recovery and daylight-saving gaps.

## Development

From `src/frontend`: `bun run lint`, `bun run lint:fix`, `bun run format`, `bun run format:check`, `bun run typecheck`. Commit `bun.lock` when dependencies change. All UI additions use locally owned shadcn/ui components. Zod checks forms and API responses; Go owns authoritative validation and business rules.

- `src/backend/internal/customer`, `deal`, `task` — domain vocabulary and rules.
- `src/backend/internal/app` — application operations and transactional invariants.
- `src/backend/internal/httpapi` — transport DTOs, routes and integration tests.
- `src/backend/internal/store` — SQLite queries and embedded migrations.
- `src/frontend/src/app` — localized server-rendered routes.
- `src/frontend/src/components` — interactive forms and shared UI.
- [GLOSSARY.md](GLOSSARY.md) — domain language.
- [Architecture](docs/architecture.md) and [API contract](docs/api.md).
- [AGENTS.md](AGENTS.md) — coding-agent conventions.

Teams, authentication, notifications, integrations, import/export and configurable pipelines are outside this MVP. Add authentication and access controls before any public deployment.

## License

MIT
