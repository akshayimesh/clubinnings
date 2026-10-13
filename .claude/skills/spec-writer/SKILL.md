---
name: spec-writer
description: Write a feature spec for ClubInnings in docs/specs/ before any implementation. Use when the user asks to spec, scope or design a new feature or change, or says "write a spec".
---

# Spec writer

Writes a feature spec to `docs/specs/NNN-<kebab-name>.md`. In this project a spec comes before the plan, and the plan comes before the code.

## Steps

1. **Understand the request.** If the goal, the users affected, or the scope is unclear, ask up to 3 focused questions before writing anything.
2. **Ground it in the code.** Read `CLAUDE.md`, the existing specs in `docs/specs/`, and the relevant parts of `backend/src`, `backend/migrations` and `frontend/src`, so the spec matches the real routes, tables and conventions. Don't invent endpoints or columns that conflict with what exists.
3. **Pick the number.** List `docs/specs/`, take the highest `NNN` and add 1, zero-padded to 3 digits. The name is a short kebab-case slug of the feature (for example `001-team-rosters.md`).
4. **Write the spec** using the template below. Fill in every section. If a section doesn't apply, write `None` and say why in one line.
5. **Report back** with the file path, a 2–3 line summary, and any open questions. Don't start implementing.

## Rules

- Respect multi-tenancy: say how every new table and endpoint is scoped to `club_id`, and which roles (`admin`, `coach`, `player`) may do what.
- Acceptance criteria must be testable; each one should map to a unit or Supertest test.
- API changes use the project's error shape `{ "error": { "code", "message", "details"? } }` and list status codes.
- Data model changes describe the migration (columns, types, constraints, indexes) and what the down migration does.
- Keep it short. Prefer bullet points and tables to prose.

## Template

```markdown
# NNN – <Feature name>

- **Status**: Draft
- **Author**: <name>
- **Date**: <YYYY-MM-DD>

## Goal
One paragraph: the problem, who has it, and the outcome we want.

## User stories
- As a <role>, I want <capability> so that <benefit>.

## Requirements
### Functional
- R1 ...
### Non-functional
- Security, tenant isolation, performance, accessibility as relevant.

## API changes
| Method | Path | Auth / roles | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |

Example request and response bodies where useful.

## Data model
New or changed tables and columns, with types, constraints, indexes and the `club_id` scoping. Migration and rollback notes.

## Acceptance criteria
- [ ] AC1 – Given ..., when ..., then ...

## Out of scope
- Things we're deliberately not doing now.
```
