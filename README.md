# ClubInnings

Multi-tenant SaaS for cricket clubs and academies. This repository contains the base app: club signup, JWT auth, a tenant-scoped `/api/me`, and a minimal React frontend.

- **API**: Node.js 20+, TypeScript, Express 5, PostgreSQL 16, zod, bcryptjs, jsonwebtoken
- **Web**: React + TypeScript (Vite)
- **Tests**: Vitest + Supertest

## Prerequisites

- Node.js 20.19+ and npm
- Docker (Docker Desktop on Windows/macOS)
- GNU Make. On Windows, install it with `choco install make` from an elevated shell, or use the npm scripts shown below.

## Quick start

```bash
cp .env.example .env      # then set JWT_SECRET to a long random string
make install              # npm install for backend and frontend
make db-up                # start Postgres 16 in Docker
make migrate              # create tables
make dev-api              # API on http://localhost:4000   (terminal 1)
make dev-web              # web on http://localhost:5173   (terminal 2)
```

Open http://localhost:5173, create a club, and you'll land on the dashboard.

Check the API: `curl http://localhost:4000/healthz` should return `{"status":"ok"}`.

### Without make

| make target | equivalent |
| --- | --- |
| `make db-up` | `docker compose up -d --wait` |
| `make migrate` | `npm --prefix backend run migrate` |
| `make dev-api` | `npm --prefix backend run dev` |
| `make dev-web` | `npm --prefix frontend run dev` |
| `make test` | `docker compose up -d --wait && npm --prefix backend test && npm --prefix frontend run typecheck` |

## Tests

```bash
make test
```

Backend tests run against a separate `clubinnings_test` database. Postgres creates it the first time the volume is initialised, and the test setup migrates it automatically. If your volume predates that init script, recreate it with `docker compose down -v`, which **deletes local data**.

## API

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/healthz` | – | Liveness plus a DB check |
| POST | `/api/auth/signup` | – | `{clubName, clubSlug?, email, password}` creates a club and its admin, and returns `{token, user, club}` |
| POST | `/api/auth/login` | – | `{email, password}` returns `{token, user, club}` |
| GET | `/api/me` | Bearer | The current user and club |

Errors always look like `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`.

## Configuration

All settings come from `.env` (see `.env.example`) and are validated at startup:

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | – | required |
| `TEST_DATABASE_URL` | – | used when `NODE_ENV=test` |
| `JWT_SECRET` | – | required, at least 32 characters |
| `JWT_EXPIRES_IN` | `1h` | |
| `BCRYPT_ROUNDS` | `10` | |
| `PORT` | `4000` | |
| `CORS_ORIGIN` | `http://localhost:5173` | |
| `POSTGRES_*` | see `.env.example` | used by docker compose |

## Project docs

- `CLAUDE.md`: layout, commands and conventions (also read by Claude Code)
- `docs/specs/`: feature specs; start with `000-base-app.md`
- `.claude/`: project skills (`spec-writer`, `pr-writer`) and agents (`test-runner`, `code-reviewer`)
