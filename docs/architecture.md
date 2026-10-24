# Architecture

OpenCRM is a local, single-owner sales workspace. Browser → Next.js → Go HTTP API → SQLite.

## Domain and application

The Go monolith contains customer, deal and task domain packages. They own vocabulary and validation and import neither HTTP nor SQLite. See the root GLOSSARY.md.

The application package coordinates writes and business rules. Each mutation runs in a SQLite transaction, including related-record checks: archiving and adding work cannot race into an invalid state. Store queries accept either a database connection or transaction through the same small executor interface. Dependencies are composed in the process entry point and HTTP handler constructor.

HTTP DTOs are separate from domain entities. Only writable fields are accepted as input. Errors expose stable codes and optional field keys; SQL details are logged only on the server. Mutations require an application/json object, reject unknown fields and trailing JSON, and have a 32 KiB body limit.

SQLite uses WAL, foreign keys, a busy timeout and one connection. Migration 1 is the original customer schema; migration 2 adds customer fields, deals and tasks. Initialization upgrades version 0/1 transactionally and rejects newer unsupported versions. Existing customer IDs and records are retained. Unicode case folding is provided by a deterministic Go-backed SQLite function for Russian and English search.

Money is stored as integer kopecks, from 0 to 1,000,000,000,000 per deal. Closed deals can be explicitly reopened to new. Customer reassignment on deals and tasks is excluded from this MVP. Archived customers retain history; restore them before editing their deals or tasks. No records are physically deleted.

Task timestamps are normalized to UTC. Calendar filters use IANA time zones and local midnight boundaries, including daylight-saving changes. Completing a deal never completes its tasks. Dashboard summaries and their task lists are read in one transaction.

## Frontend

App Router uses ru/en URL prefixes and typed dictionaries. Russian is the default. Language switching retains the route and query. Dates and RUB amounts use Intl.

Server Components load initial records and aggregates directly from Go, without caching. Interactive Client Components perform mutations through the same-origin /api/v1 proxy, then refresh server-rendered data. Zod checks input and API responses; Go remains authoritative. Calendar screens resolve the browser time zone before exposing forms. Error states preserve input and provide retry controls.

Webpack and the standard Tailwind PostCSS plugin are used for development and production. Bun manages dependencies; Oxlint and Oxfmt enforce linting and formatting.

## Tests and local operation

Go integration tests exercise HTTP behavior with temporary SQLite databases. Playwright launches real Go and Next.js processes and Chromium. Its API binary and database are built in a disposable OS temporary directory, cleaned on process exit. Test ports are 18080 and 13000; the ordinary application database is never used.

The Go API and Next.js development commands bind to loopback by default. There is no authentication, multi-tenancy, notification service or external integration. Public deployment requires authentication and access controls first.

See api.md for the HTTP contract and README.md for setup and verification.
