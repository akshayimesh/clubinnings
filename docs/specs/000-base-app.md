# 000 – Base application

- **Status**: Implemented (branch `chore/base-app`)
- **Date**: 2026-10-13

## Goal

Give ClubInnings a working, tested foundation that later features can build on: a multi-tenant API where a club signs up, its users log in, and every authenticated request knows its club and role; a minimal web app that exercises this; and the project tooling (Docker, Make, tests, Claude Code config) to develop features spec-first.

## User stories

- As a **club organiser**, I want to sign up with my club's name, my email and a password, so that my club gets its own space and I become its admin.
- As a **club member**, I want to log in with my email and password, so that I can reach my club's dashboard.
- As a **logged-in user**, I want to see my club's name on the dashboard, so that I know which club I'm working in.
- As an **operator**, I want a health endpoint that checks the database, so that I can monitor the service.
- As a **developer**, I want one command to run every test, and clear conventions, so that I can add features safely.

## Requirements

### Functional

- R1 `GET /healthz` returns `200 {"status":"ok"}` when `SELECT 1` succeeds, and `503` otherwise.
- R2 Signup creates a club and its first `admin` user **in one transaction**. If either insert fails, nothing is saved.
- R3 The club slug is taken from the request (`clubSlug`) or derived from `clubName`. A derived slug that is already taken gets a random 6-hex suffix; an explicit slug that is taken is rejected with 409.
- R4 Emails are stored lowercased and are unique across all clubs, so login needs only email and password.
- R5 Login returns a JWT (HS256) with claims `sub` (user id), `clubId` and `role`, valid for `JWT_EXPIRES_IN`.
- R6 `requireAuth` accepts only `Authorization: Bearer <jwt>`, verifies the signature, expiry and claim shape, and sets `req.auth = { userId, clubId, role }`.
- R7 `GET /api/me` returns the user and club, looking up the user by **both** `userId` and `clubId` from the token.
- R8 Every request body is validated with zod. Every error returns `{ "error": { "code", "message", "details"? } }`.
- R9 Configuration comes from environment variables, which are validated at startup. The process exits with a readable list of problems if any are invalid.
- R10 The web app has login, signup and a protected dashboard showing the club name. Its API client attaches the JWT.

### Non-functional

- Passwords are hashed with bcrypt (cost `BCRYPT_ROUNDS`, default 10) and are never returned.
- Login gives the same error and similar timing for an unknown email and a wrong password (it compares against a dummy hash).
- `helmet` security headers are set; CORS is restricted to `CORS_ORIGIN`; JSON bodies are limited to 100 kB.
- All SQL is parameterised.

## API changes

| Method | Path | Auth | Request | Success | Errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/healthz` | – | – | 200 `{status:"ok"}` | 503 `{status:"error"}` |
| POST | `/api/auth/signup` | – | `{clubName, clubSlug?, email, password}` | 201 `{token, user, club}` | 400 `VALIDATION_ERROR`/`INVALID_JSON`, 409 `CONFLICT` |
| POST | `/api/auth/login` | – | `{email, password}` | 200 `{token, user, club}` | 400, 401 `INVALID_CREDENTIALS` |
| GET | `/api/me` | Bearer | – | 200 `{user, club}` | 401 `UNAUTHORIZED`, 404 `NOT_FOUND` |

Validation rules: `clubName` 2–100 characters; `clubSlug` lowercase `a-z0-9` with single hyphens, 2–60 characters; `email` a valid address of at most 254 characters; `password` 8–72 characters (bcrypt only uses the first 72 bytes).

`user` = `{id, clubId, email, role, createdAt}`; `club` = `{id, name, slug, plan, createdAt}`.

## Data model

Migration `1760000000000_create-clubs-and-users.sql`:

**clubs**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | `gen_random_uuid()` |
| name | text | not null |
| slug | text | not null, unique |
| plan | text | not null, default `free`, check in (`free`, `pro`, `academy`) |
| created_at | timestamptz | default `now()` |

**users**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | `gen_random_uuid()` |
| club_id | uuid | FK → `clubs.id` `ON DELETE CASCADE`, indexed |
| email | text | unique index on `lower(email)` |
| password_hash | text | bcrypt |
| role | text | check in (`admin`, `coach`, `player`) |
| created_at | timestamptz | default `now()` |

The down migration drops `users`, then `clubs`.

## Acceptance criteria

- [x] `docker compose up -d` starts Postgres 16 with a named volume, and creates `clubinnings` and `clubinnings_test`.
- [x] `make migrate` creates both tables. The down migration removes them cleanly.
- [x] `/healthz` returns 200 when the DB is up and 503 when the DB check fails.
- [x] Signup returns 201 with a token. The stored password is a bcrypt hash.
- [x] A duplicate email on signup returns 409 and leaves no orphan club behind (transaction rollback).
- [x] Login with valid credentials returns a token whose claims match the user and club. Email matching is case-insensitive.
- [x] A wrong password and an unknown email both return the same 401 body.
- [x] `/api/me` returns 401 for a missing, forged, expired or malformed token.
- [x] A token that pairs a user with a different club cannot read that user (404).
- [x] Invalid bodies return 400 `VALIDATION_ERROR` with per-field details.
- [x] The web app supports signup, then the dashboard with the club name, then logout, then login.
- [x] `make test` passes: 44 backend tests (17 unit, 27 integration) and the frontend typecheck.

## Out of scope

- Inviting coaches and players, and role-based permissions beyond storing the role
- Password reset, email verification, refresh tokens and token revocation
- Plans and billing (the `plan` column only exists for later use)
- Rate limiting and account lockout
- Frontend unit tests, and production deployment (Dockerfiles, CI)
