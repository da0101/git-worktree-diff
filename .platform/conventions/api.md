# API Conventions

Last updated: 2026-05-14

## Scope

Applies to the local Node HTTP API under `backend/` and the frontend helper in `web/src/lib/api.ts`.

## Response Shape

- Return JSON for every route.
- Use `{ ok: true, data }` for success.
- Use `{ ok: false, error }` for failures.
- Keep errors human-readable; they are shown directly in the UI.

## Route Rules

- Keep routes explicit in `backend/router.mjs`.
- Validate required query/body fields at the handler boundary.
- Use `readJsonBody`, `bodyString`, and `bodyFiles` instead of open-coded request parsing.
- Keep Git command construction in backend helpers/services, not React components.

## Frontend Rules

- Call the backend through `api<T>()`; do not duplicate response-envelope handling.
- Reset stale UI state after repo/path changes where old selections would be misleading.
- Treat `path`, `branch`, and future `worktreePath` as separate values.

## Avoid

- Do not introduce ad hoc response envelopes.
- Do not use shell command strings for API-driven Git operations.
- Do not return partial success as HTTP 200 unless the UI can represent it clearly.
