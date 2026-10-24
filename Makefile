.PHONY: dev-api dev-web check test

dev-api:
	cd src/backend && go run ./cmd/api

dev-web:
	cd src/frontend && bun run dev

test:
	cd src/backend && go test -race ./...

check: test
	cd src/backend && go vet ./...
	cd src/frontend && bun run format:check && bun run lint && bun run typecheck && bun run build
