# OpenCRM

A portfolio CRM foundation with a Go modular monolith, Next.js App Router, TypeScript, shadcn/ui and SQLite.

The first vertical slice is functional: create a customer, validate input, store it in SQLite and display it in the workspace. This is the project foundation; authentication, deals and activities are planned.

## Run locally

Requirements: Go 1.26+, Node.js 22.15+ and Bun 1.2.21+. SQLite uses a pure-Go driver; a system SQLite installation is unnecessary.

```sh
cd src/backend
go mod download
cd ../frontend
bun install --frozen-lockfile
cd ../..
```

In two terminals from the repository root:

```sh
make dev-api
```

```sh
make dev-web
```

Open http://localhost:3000. The API listens on http://127.0.0.1:8080.
Customer data persists in src/backend/opencrm.db, excluded from Git.

## Configuration

Defaults work without configuration. The programs read process environment variables; .env.example files document overrides and are not loaded automatically by Go.

| Variable | Service | Default |
| --- | --- | --- |
| HTTP_ADDR | Go | 127.0.0.1:8080 |
| DATABASE_PATH | Go | opencrm.db |
| API_ORIGIN | Next.js | http://127.0.0.1:8080 |

For Next.js overrides copy src/frontend/.env.example to src/frontend/.env.local. Set Go overrides with environment variables, for example `DATABASE_PATH=/tmp/demo.db make dev-api`.

## Verify

```sh
make check
```

Runs Go integration tests with the race detector, go vet, Oxlint, Oxfmt, TypeScript and the production Next.js build. GitHub Actions runs equivalent checks.

## Layout

- src/backend/cmd/api — process configuration and graceful shutdown
- src/backend/internal/httpapi — HTTP transport and request validation
- src/backend/internal/store — SQLite persistence and embedded initial schema
- src/frontend/src/app — App Router entry points
- src/frontend/src/components — customer workspace and shadcn/ui source
- docs/architecture.md — boundaries, contract and milestones
- AGENTS.md — project conventions for coding agents

This starter is intended for local use. Add authentication and authorization before deploying customer data publicly. See [architecture](docs/architecture.md) for the roadmap.

## Stack references

[Next.js installation](https://nextjs.org/docs/app/getting-started/installation) · [shadcn/ui for Next.js](https://ui.shadcn.com/docs/installation/next) · [Modern Go Guidelines](https://github.com/JetBrains/go-modern-guidelines)

## License

MIT

## Frontend tooling

From `src/frontend`, run `bun run lint` for Oxlint, `bun run lint:fix` for fixes, `bun run format` for Oxfmt, and `bun run format:check` to check formatting. TypeScript strict mode and `bun run typecheck` check types separately. Bun is the package manager; commit bun.lock when dependencies change.
