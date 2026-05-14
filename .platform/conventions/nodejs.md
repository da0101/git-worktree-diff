# Node.js Backend Conventions

Last updated: 2026-05-14

## Stack

Node.js ESM with the built-in `node:http` server. No backend framework is currently used.

## Structure

- `backend/server.mjs` starts the server.
- `backend/router.mjs` maps methods and paths to handlers.
- `backend/handlers/` owns HTTP request/response behavior.
- `backend/services/` owns repo/worktree business logic.
- `backend/lib/` owns reusable Git/HTTP primitives.
- `backend/store/` owns local persistence.

## Command Execution

- Use `execFile`, never shell strings.
- Keep operation allowlists close to the handler/service that executes them.
- Pass files after `--` for Git commands that accept pathspecs.
- Set practical timeouts and buffers for Git commands.

## Persistence

- Current registry is `~/.git-worktree-diff/repos.json`.
- Future migrations must preserve user data and handle malformed JSON gracefully.
- Store explicit fields; avoid encoding repo/worktree/project identity into one overloaded path string.

## Error Handling

- Convert expected user/action failures to clear API errors.
- Do not swallow conflict details if they help the user recover.
- Keep route handlers small and move repeated logic into services.
