# Testing Conventions

Last updated: 2026-05-14

## Current Tools

- Frontend: Vitest, Testing Library, jsdom.
- Frontend scripts: `npm run test`, `npm run lint`, `npm run build` from `web/`.
- Backend: no test runner configured yet.

## Testing Bar

- Diff parsing/rendering changes need fixture-style tests that prove additions, deletions, context, file names, and large diffs are handled correctly.
- Repo/worktree model changes need tests for path identity, branch identity, duplicate paths, and multiple worktrees per repo.
- Git action changes need command-construction tests before expanding action coverage.
- UI workflow changes need a browser/manual QA pass because user experience is a core constraint.

## Preferred Patterns

- Keep parser tests close to parser utilities.
- Use stable sample diff strings rather than relying on the current repository's live state.
- Mock backend/API calls in component tests.
- Avoid tests that mutate real user repositories.

## Minimum Verification Before Handoff

- `npm run test` in `web/`
- `npm run lint` in `web/`
- `npm run build` in `web/`
- Backend smoke check: start backend and hit `/health` when backend behavior changes.
