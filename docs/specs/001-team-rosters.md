# 001 – Team rosters

- **Status**: Draft
- **Author**: Akshay Soni
- **Date**: 2026-10-13

## Goal

A club runs several teams (1st XI, 2nd XI, U15s, …), but ClubInnings has nowhere to record them or who plays in them. Admins and coaches need to create teams and keep each team's squad up to date, and players need to see which teams they are in. The outcome is a club-scoped list of teams and players, and a roster for each team that admins and coaches can edit and everyone in the club can read.

## User stories

- As an **admin or coach**, I want to create, rename and list my club's teams, so that the club's structure is in the app.
- As an **admin or coach**, I want to add players to the club, so that I can build squads before every player has an account.
- As an **admin or coach**, I want to add and remove players on a team's roster, set shirt numbers and pick a captain, so that the squad is up to date.
- As an **admin**, I want to delete a team, so that old teams don't clutter the list.
- As a **player**, I want to see my club's teams and their rosters, so that I know who I play with.

## Requirements

### Functional

- R1 A **team** belongs to one club and has a name (1–60 characters). Names are unique within a club, ignoring case.
- R2 A **player** belongs to one club and has a full name (1–100 characters). A player can optionally be linked to a user account in the same club (`userId`); this is stored but nothing sets it from the UI yet.
- R3 A **roster entry** links one team to one player of the same club, with an optional shirt number (0–999) and a captain flag. A player can be on many teams, but only once per team.
- R4 Shirt numbers are unique within a team. A team has at most one captain; making a player captain removes the flag from the current captain in the same transaction.
- R5 Admins and coaches may create and update teams, players and roster entries. Only admins may delete a team. Players have read-only access.
- R6 Deleting a team deletes its roster entries. Deleting players is out of scope.
- R7 A new `requireRole(...roles)` middleware returns 403 `FORBIDDEN` when `req.auth.role` is not allowed. Add a `forbidden()` helper to `types/errors.ts`.
- R8 The web app gets a **Teams** page (list + create) and a **Team** page (roster with add/remove, shirt number, captain). Edit controls are hidden for players; the API still enforces roles.

### Non-functional

- **Tenant isolation**: every query filters by `club_id` from `req.auth.clubId`. A team or player id from another club behaves exactly like an unknown id (404), so other clubs' data can't be probed.
- The database also enforces same-club links: roster entries use composite foreign keys on `(team_id, club_id)` and `(player_id, club_id)`.
- Path ids that aren't valid UUIDs return 404 instead of a 500 from Postgres.
- `GET /api/teams/:teamId` returns the roster in one query (join), not one query per player.
- All SQL is parameterised; all bodies are validated with zod via `validateBody`.

## API changes

All endpoints need `Authorization: Bearer <jwt>` and are mounted under `/api`. "Read" = `admin`, `coach`, `player`; "Write" = `admin`, `coach`.

| Method | Path | Roles | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/teams` | Read | – | 200 `{teams: Team[]}` sorted by name | 401 |
| POST | `/teams` | Write | `{name}` | 201 `{team}` | 400, 401, 403, 409 |
| GET | `/teams/:teamId` | Read | – | 200 `{team, roster: RosterEntry[]}` | 401, 404 |
| PATCH | `/teams/:teamId` | Write | `{name}` | 200 `{team}` | 400, 401, 403, 404, 409 |
| DELETE | `/teams/:teamId` | `admin` | – | 204 | 401, 403, 404 |
| GET | `/players` | Read | – | 200 `{players: Player[]}` sorted by name | 401 |
| POST | `/players` | Write | `{fullName}` | 201 `{player}` | 400, 401, 403 |
| POST | `/teams/:teamId/players` | Write | `{playerId, shirtNumber?, isCaptain?}` | 201 `{entry}` | 400, 401, 403, 404, 409 |
| PATCH | `/teams/:teamId/players/:playerId` | Write | `{shirtNumber?, isCaptain?}` (at least one; `shirtNumber: null` clears it) | 200 `{entry}` | 400, 401, 403, 404, 409 |
| DELETE | `/teams/:teamId/players/:playerId` | Write | – | 204 | 401, 403, 404 |

Shapes:

- `Team` = `{id, clubId, name, playerCount, createdAt}`
- `Player` = `{id, clubId, userId, fullName, createdAt}`
- `RosterEntry` = `{player: Player, shirtNumber, isCaptain, addedAt}`

Error codes: 400 `VALIDATION_ERROR` / `INVALID_JSON`; 401 `UNAUTHORIZED`; 403 `FORBIDDEN`; 404 `NOT_FOUND` (team, player or roster entry not in the caller's club); 409 `CONFLICT` (duplicate team name, player already on the team, shirt number taken).

Example:

```http
POST /api/teams/9b1d…/players
{ "playerId": "4c7e…", "shirtNumber": 7, "isCaptain": true }
```

```json
201
{ "entry": { "player": { "id": "4c7e…", "clubId": "a12f…", "userId": null, "fullName": "Asha Patel", "createdAt": "2026-10-13T09:00:00.000Z" },
             "shirtNumber": 7, "isCaptain": true, "addedAt": "2026-10-13T09:05:00.000Z" } }
```

```json
409
{ "error": { "code": "CONFLICT", "message": "Shirt number 7 is already taken on this team" } }
```

## Data model

New migration `<timestamp>_create-teams-and-rosters.sql`.

**teams**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | `gen_random_uuid()` |
| club_id | uuid | not null, FK → `clubs.id` `ON DELETE CASCADE` |
| name | text | not null |
| created_at | timestamptz | default `now()` |

Indexes: unique `(club_id, lower(name))`; unique `(id, club_id)` (target for the composite FK).

**players**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | `gen_random_uuid()` |
| club_id | uuid | not null, FK → `clubs.id` `ON DELETE CASCADE`, indexed |
| user_id | uuid | nullable, FK → `users.id` `ON DELETE SET NULL`; partial unique index where not null |
| full_name | text | not null |
| created_at | timestamptz | default `now()` |

Indexes: unique `(id, club_id)`; `(club_id)`. Same-club user linking is checked in the service (no endpoint sets it yet).

**team_players**

| Column | Type | Notes |
| --- | --- | --- |
| team_id | uuid | not null |
| player_id | uuid | not null |
| club_id | uuid | not null |
| shirt_number | smallint | nullable, check `0–999` |
| is_captain | boolean | not null, default `false` |
| added_at | timestamptz | default `now()` |

Constraints: PK `(team_id, player_id)`; FK `(team_id, club_id)` → `teams (id, club_id)` `ON DELETE CASCADE`; FK `(player_id, club_id)` → `players (id, club_id)` `ON DELETE CASCADE`; unique `(team_id, shirt_number)`; partial unique `(team_id)` where `is_captain`. Index on `(player_id)`.

Down migration: drop `team_players`, then `players`, then `teams`.

## Acceptance criteria

- [ ] AC1 – Given an admin or coach, when they `POST /api/teams` with a valid name, then 201 and the team is stored with their `club_id`.
- [ ] AC2 – Given a player, when they call any write endpoint, then 403 `FORBIDDEN` and nothing changes.
- [ ] AC3 – Given a coach, when they `DELETE /api/teams/:teamId`, then 403; given an admin, then 204 and the team's roster entries are gone.
- [ ] AC4 – Given a team name that already exists in the club with different case, when a team is created or renamed to it, then 409; the same name in another club succeeds.
- [ ] AC5 – Given an empty or 61-character name, a missing `fullName`, a non-UUID `playerId`, or a shirt number outside 0–999, then 400 `VALIDATION_ERROR` with field details.
- [ ] AC6 – Given a player already on a team, when they are added again, then 409.
- [ ] AC7 – Given shirt number 7 is taken on a team, when another player is given 7 on that team, then 409; number 7 on a different team succeeds.
- [ ] AC8 – Given a team with a captain, when another player is made captain, then 200 and the old captain's `isCaptain` is `false`.
- [ ] AC9 – Given a user in club A, when they read, update or delete a team of club B, or add a club-B player to a club-A team, then 404 and club B's data is unchanged.
- [ ] AC10 – `GET /api/teams` and `GET /api/players` return only the caller's club's rows; `GET /api/teams/:teamId` returns the roster with player details and correct `playerCount`.
- [ ] AC11 – A non-UUID `:teamId` or `:playerId` returns 404, not 500.
- [ ] AC12 – Every endpoint returns 401 without a valid token.
- [ ] AC13 – Unit tests cover the team/roster services with repositories mocked (captain swap, not-found and conflict paths); `requireRole` has unit tests.
- [ ] AC14 – Migration up creates the three tables; down removes them cleanly.
- [ ] AC15 – The web app lists teams, creates one, opens a team, adds/removes a player and sets the captain; a player login sees no edit controls. `make test` passes.

## Out of scope

- Inviting users or linking players to accounts from the UI (only the `user_id` column exists)
- Deleting or editing players beyond creation
- Seasons, divisions, fixtures, match selections and availability
- Player profiles (batting/bowling style, playing role, stats)
- Bulk import of players (CSV)
- Pagination (club sizes are small; revisit if lists exceed a few hundred rows)
