---
name: pr-writer
description: Write a pull request description for the current branch with Summary, Changes, How to test and Risks. Use when the user asks for a PR description, PR body or PR summary.
---

# PR writer

Writes a PR description for the current branch compared with `main`. Gather the facts first, then write.

## Steps

1. **Gather context** (read-only):
   - `git branch --show-current`
   - `git log --oneline main..HEAD`
   - `git diff --stat main...HEAD`
   - `git diff main...HEAD`. For large diffs, read the stat first, then the files that matter.
   - Any spec in `docs/specs/` that this branch adds or references.
2. **Check what was verified.** Note whether tests were added or changed. If you can, run `make test` and report the result honestly. Never claim tests pass unless you saw them pass.
3. **Write the description** with the template below and print it as Markdown, ready to paste. Suggest a Conventional Commit style title (for example `feat(auth): add password reset`).
4. Don't push, open the PR, or edit files unless the user asks.

## Rules

- Describe what changed and why, not a commit-by-commit diary.
- Group changes by area (API, database, frontend, tests, tooling).
- "How to test" must be steps a reviewer can copy and run: make targets, curl commands, UI clicks, and expected results.
- "Risks" covers migrations and rollback, auth or tenant-isolation impact, breaking API changes, new environment variables, and anything not tested. Write `Low – <reason>` if that's true; don't leave it empty.
- Link the spec (`docs/specs/NNN-*.md`) if there is one.

## Template

```markdown
## Summary
1–3 sentences: what this PR does and why. Link the spec if there is one.

## Changes
- **API**: ...
- **Database**: ...
- **Frontend**: ...
- **Tests**: ...
- **Tooling/docs**: ...

## How to test
1. `cp .env.example .env && make install && make db-up && make migrate`
2. `make test`, expecting all tests to pass
3. ...feature-specific steps, each with the expected result

## Risks
- ...
```
