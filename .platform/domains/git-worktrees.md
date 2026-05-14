---
domain_id: dom-git-worktrees
slug: git-worktrees
status: active
repo_ids: [git-worktree-diff]
related_domain_slugs: [agentboard-projects]
created_at: 2026-05-14
updated_at: 2026-05-14
---

# git-worktrees

## What this domain does

This domain covers the core user workflow: inspect precise local diffs while moving quickly between repositories, branches, and worktrees. It is the product center of the app.

## Backend / source of truth

- `backend/lib/git.mjs` executes Git commands with `execFile`.
- `backend/services/repo-service.mjs` normalizes tracked paths and summarizes branch, branches, changed file count, and numstat.
- `backend/handlers/repos.mjs` exposes repo list, add/remove, diff, status, and checkout routes.
- `backend/handlers/git-actions.mjs` exposes allowlisted Git actions only.
- `backend/store/repo-store.mjs` persists tracked repositories in `~/.git-worktree-diff/repos.json`.

## Frontend / clients

- `web/src/App.tsx` owns selected repo, selected branch target, selected file paths, diff mode, and Git action orchestration.
- `web/src/components/workbench/RepositoryPanel.tsx` handles tracked repo and branch selection.
- `web/src/components/workbench/FilesPanel.tsx` shows changed files, totals, and selection state.
- `web/src/components/workbench/DiffPane.tsx` renders the current file diff in unified or split mode.
- `web/src/components/diff/DiffView.tsx` parses and displays line-level diff content.

## API contract locked

- API responses use `{ ok: boolean, data?: T, error?: string }`.
- Repo targets are currently absolute Git toplevel paths.
- `/api/repos/diff` returns raw `git diff HEAD --` text for one tracked path.
- Git actions are allowlisted: `stage`, `unstage`, `reject`, `commit`, `amend`, `fetch`, `pull`, `push`, `rebase`.
- Future worktree support must preserve separate identifiers for project, repo, worktree path, and branch.

## Key files

- `backend/lib/git.mjs`
- `backend/services/repo-service.mjs`
- `backend/handlers/repos.mjs`
- `backend/handlers/git-actions.mjs`
- `web/src/App.tsx`
- `web/src/components/diff/DiffView.tsx`
- `web/src/utils/parseDiff.ts`

## Decisions locked

- Diff precision is non-negotiable: never hide changed lines in a way that looks like data loss.
- Worktree path and branch name are separate pieces of identity.
- Destructive Git actions require deliberate UI affordances and backend allowlisting.
- Do not expose the backend beyond localhost without a new security design.
