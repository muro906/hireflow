.PHONY: dev down build migrate migrate-down seed test lint clean help

BACKEND_DIR  := ./backend
FRONTEND_DIR := ./frontend
MIGRATE      := docker run --rm --network host \
                  -v $(PWD)/backend/migrations:/migrations \
                  migrate/migrate

# ─── Dev ──────────────────────────────────────────────────────────────────────

## dev: Start all services with docker-compose
dev:
	docker compose up --build

## dev-bg: Start all services in the background
dev-bg:
	docker compose up --build -d

## down: Stop all services
down:
	docker compose down

## down-v: Stop all services and remove volumes
down-v:
	docker compose down -v

# ─── Database Migrations ──────────────────────────────────────────────────────

## migrate: Run all pending migrations
migrate:
	$(MIGRATE) -path /migrations -database "$(DATABASE_URL)" up

## migrate-down: Roll back one migration
migrate-down:
	$(MIGRATE) -path /migrations -database "$(DATABASE_URL)" down 1

## migrate-reset: Roll back all migrations
migrate-reset:
	$(MIGRATE) -path /migrations -database "$(DATABASE_URL)" drop -f

## migrate-create: Create a new migration (usage: make migrate-create name=add_index)
migrate-create:
	$(MIGRATE) create -ext sql -dir /migrations -seq $(name)

# ─── Code Generation ─────────────────────────────────────────────────────────

## sqlc: Generate Go code from SQL queries (requires sqlc installed)
sqlc:
	cd $(BACKEND_DIR) && sqlc generate

# ─── Testing ─────────────────────────────────────────────────────────────────

## test: Run backend unit + integration tests
test:
	cd $(BACKEND_DIR) && go test ./... -v -cover

## test-short: Run backend tests excluding integration tests
test-short:
	cd $(BACKEND_DIR) && go test ./... -short -v

## test-fe: Run frontend tests
test-fe:
	cd $(FRONTEND_DIR) && npm run test

## test-all: Run all tests
test-all: test test-fe

# ─── Linting ─────────────────────────────────────────────────────────────────

## lint: Lint backend (golangci-lint) and frontend (eslint)
lint: lint-be lint-fe

## lint-be: Lint Go backend
lint-be:
	cd $(BACKEND_DIR) && golangci-lint run ./...

## lint-fe: Lint React frontend
lint-fe:
	cd $(FRONTEND_DIR) && npm run lint

## fmt: Format Go code
fmt:
	cd $(BACKEND_DIR) && gofmt -w .

## typecheck: TypeScript type check (no emit)
typecheck:
	cd $(FRONTEND_DIR) && npx tsc --noEmit

# ─── Build ────────────────────────────────────────────────────────────────────

## build: Build production Docker images
build:
	docker compose build

## build-be: Build backend binary locally
build-be:
	cd $(BACKEND_DIR) && go build -o bin/api ./cmd/api && go build -o bin/worker ./cmd/worker

## build-fe: Build frontend for production
build-fe:
	cd $(FRONTEND_DIR) && npm run build

# ─── Seed ────────────────────────────────────────────────────────────────────

## seed: Insert demo data
seed:
	cd $(BACKEND_DIR) && go run ./cmd/seed

# ─── Dependencies ────────────────────────────────────────────────────────────

## deps: Install all dependencies
deps: deps-be deps-fe

## deps-be: Download Go modules
deps-be:
	cd $(BACKEND_DIR) && go mod download

## deps-fe: Install Node modules
deps-fe:
	cd $(FRONTEND_DIR) && npm install

# ─── Utilities ────────────────────────────────────────────────────────────────

## clean: Remove build artifacts
clean:
	cd $(BACKEND_DIR) && rm -rf bin/
	cd $(FRONTEND_DIR) && rm -rf dist/

## logs: Tail docker-compose logs
logs:
	docker compose logs -f

## psql: Open a psql shell
psql:
	docker compose exec postgres psql -U hireflow -d hireflow

## redis-cli: Open a redis-cli shell
redis-cli:
	docker compose exec redis redis-cli

## help: Show this help
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ": "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' | sed 's/## //'
