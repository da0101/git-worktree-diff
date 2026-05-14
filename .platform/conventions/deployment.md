# Deployment Conventions

Last updated: 2026-05-14

## Current Mode

This is a local development tool, not a deployed service.

## Local Runbook

- Backend: `cd backend && npm start`
- Frontend: `cd web && npm run dev`
- Backend listens on `http://127.0.0.1:8420`.
- Vite proxies `/api` and `/health` to the backend.

## Build

- Frontend production build: `cd web && npm run build`.
- Backend currently has no build step.

## Rollback

- Code rollback is Git rollback.
- User-tracked repo registry lives at `~/.git-worktree-diff/repos.json`; avoid destructive migrations without a backup/export plan.

## Hosted Mode

Hosted deployment is deferred. Do not expose the current backend to a network without a security redesign.
