# ClubInnings

Multi-tenant SaaS for cricket clubs and academies. Each **club** is a tenant; **users** belong to exactly one club and have a role of `admin`, `coach` or `player`.

## Stack

- **Backend**: Node.js 20+, TypeScript (ESM), Express 5, PostgreSQL 16 (`pg`), node-pg-migrate (SQL migrations), zod, bcryptjs, jsonwebtoken
- **Frontend**: React 19 + TypeScript, Vite, react-router
- **Tests**: Vitest + Supertest (integration tests use a real `clubinnings_test` database)
- **Infra**: Docker Compose runs Postgres only; API and web run locally

## Layout

```
backend/
  src/
    app.ts            createApp(): middleware + routes, no listen (used by tests)
    server.ts         listens on PORT, graceful shutdown
    config/env.ts     zod-validated env; the process exits on invalid config
    db/pool.ts        pg Pool, query(), withTransaction()
    routes/           Express routers; routes/index.ts is mounted at /api
    controllers/      thin HTTP handlers: read req, call a service, send JSON
    services/         business logic (*.service.ts) and SQL access (*.repository.ts)
    middleware/       requireAuth, validateBody, errorHandler, notFound
    validation/       zod request schemas
    types/            domain types, AppError helpers, Express Request augmentation
  migrations/         node-pg-migrate SQL files (-- Up Migration / -- Down Migration)
  scripts/migrate.mjs runs migrations using the root .env (--test targets TEST_DATABASE_URL)
  tests/unit/         service tests with repositories mocked
  tests/integration/  Supertest tests against the test database
frontend/src/
  api/                fetch client (attaches the JWT) and typed endpoint wrappers
  auth/               AuthProvider / useAuth
  components/         shared UI
  pages/              route components
docs/specs/           feature specs (NNN-name.md)
.claude/              project skills (spec-writer, pr-writer) and agents (test-runner, code-reviewer)
```

## Commands

Run from the repo root. Copy `.env.example` to `.env` first.

| Command | What it does |
| --- | --- |
| `make install` | `npm install` in backend and frontend |
| `make db-up` | Start Postgres (`docker compose up -d --wait`) |
| `make db-down` | Stop Postgres (the data volume is kept) |
| `make migrate` | Apply migrations to the dev database |
| `make migrate-test` | Apply migrations to the test database |
| `make dev-api` | API with reload on http://localhost:4000 |
| `make dev-web` | Vite on http://localhost:5173 (proxies `/api` and `/healthz` to the API) |
| `make test` | Starts the DB, runs backend tests (migrates the test DB first), then typechecks the frontend |

New migration: `cd backend && npm run migrate:create -- <name>`, then fill in the Up and Down sections.

## Conventions

- **Workflow: spec, then plan, then implement.** Write a spec in `docs/specs/` (use the `spec-writer` skill) before you start a feature, agree a plan, then build.
- **Branches**: `feature/<name>` for features (`chore/`, `fix/` for other work), branched from `main`.
- **Commits**: Conventional Commits, e.g. `feat(auth): add password reset`, `fix(api): ...`, `test: ...`, `chore: ...`, `docs: ...`. Keep commits small and logical.
- **Tests are required for new code.** Service logic gets unit tests; every endpoint gets Supertest tests that cover success, validation, auth and tenant-isolation cases. `make test` must pass before a PR.
- **Tenant isolation**: every query on tenant data filters by `club_id` taken from `req.auth.clubId`, never from the request body or URL. Write a test that proves cross-club access fails.
- **Errors**: throw `AppError` (or the helpers in `types/errors.ts`); never send error responses directly from controllers. Every error response has the shape `{ "error": { "code", "message", "details"? } }`.
- **Validation**: validate every request body with a zod schema via `validateBody(schema)`.
- **Config**: add new environment variables to both `config/env.ts` and `.env.example`.
- **SQL**: always use parameterised queries (`$1`); never put user input into SQL strings. Schema changes go in migrations only.
- **Imports**: backend is ESM, so relative imports use the `.js` extension.
- PR descriptions: use the `pr-writer` skill.
