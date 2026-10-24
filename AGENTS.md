# OpenCRM

## Architecture

The Go application owns business rules, validation, persistence and the versioned HTTP API.
Next.js owns presentation and proxies `/api/v1/*` to Go. Keep business rules out of Next.js handlers.
Organize backend code by business capability when adding domains; keep the application a modular monolith.
SQLite is the primary database. Use parameterized SQL and request contexts. Keep money as integer minor units when deals are introduced.

## Workflow

Read README.md for setup and docs/architecture.md before changing boundaries or persistence.
For Go changes, use the Modern Go Guidelines CLI when available and apply guidance for the version in src/backend/go.mod.
Use Server Components by default; introduce client components at interactive boundaries.
Add shared UI through the shadcn CLI and preserve accessible labels, focus states and error feedback.
Use Bun for frontend dependencies, Oxlint for linting and Oxfmt for formatting. Add validation libraries such as Zod when a concrete validation boundary needs them.
Change the API contract and its TypeScript types together.
Before finishing, run `make check`; add behavior tests for validation, persistence and domain rules that change.
Update setup documentation when commands or environment variables change. Keep secrets and SQLite files outside Git.

## Scope

The initial application is a local portfolio foundation without authentication or tenancy.
Before exposing customer endpoints publicly, implement authentication, authorization and CSRF protection for the chosen session model.
Schema changes after version 1 require ordered, transactional migrations rather than edits to the initial schema alone.

## Agent skills

### Issue tracker

Track issues and specs in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context domain layout. See `docs/agents/domain.md`.
