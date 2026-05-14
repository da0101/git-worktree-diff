# Feature Brief — git-worktree-diff

> Read this first — every session, every agent (Claude, Codex, Gemini).
> 30-second orientation: what we're building, why, and where we stand.

**Feature:** Project activation and product baseline
**Status:** Activated baseline; no active implementation stream yet
**Stream file:** None yet

---

## What we're building

Git Worktree Diff is a local-first web workbench for quickly checking code diffs across Git repositories, branches, and worktrees. The long-term direction is to make worktree/branch switching easier and more precise than GitHub Desktop, including Agentboard-managed multi-repo projects.

## Why

Developers and AI-assisted workflows need a fast, trustworthy way to inspect local changes across multiple worktrees without losing repo, branch, or file-diff context.

## What done looks like

- Every changed line in a selected file is visible or clearly expandable in unified and split diff modes.
- Repositories, branches, and worktrees are represented as distinct concepts.
- Agentboard project roots can eventually surface their related repos and worktrees.
- Destructive Git actions are explicit, understandable, and recoverable from the user's perspective.

## Architecture decisions locked

- Local-first app: React/Vite frontend plus Node backend bound to `127.0.0.1`.
- Backend Git operations use `execFile` argument arrays and allowlisted actions.
- API responses use `{ ok, data?, error? }`.
- Hosted and AI-powered modes are deferred until the local diff/worktree workflow is reliable.

## Current state

The initial local repo tracker, branch selector, diff viewer, and Git actions exist. The biggest current product gaps are precise full diff visibility, worktree visualization, and Agentboard project/repo grouping.

See `work/ACTIVE.md` for stream status.

## Relevant context

> Only load the files listed here. Everything else is out of scope unless the current stream says otherwise.

- `.platform/domains/git-worktrees.md` — core repo, branch, worktree, diff, and Git action behavior
- `.platform/domains/agentboard-projects.md` — future Agentboard project/repo/worktree grouping behavior
- `.platform/conventions/react-vite.md` — frontend conventions for the workbench UI
- `.platform/conventions/nodejs.md` — backend conventions for local Git command execution
- `.platform/conventions/security.md` — local privileged command surface and hosted-mode gate
- `.platform/conventions/testing.md` — verification expectations
- `.platform/conventions/qa.md` — manual QA expectations

**Do not load:** hosted-mode design unless the task explicitly targets hosting, auth, or AI services.
**Never load:** `work/archive/*`

## Key files

- `web/src/App.tsx`
- `web/src/components/workbench/RepositoryPanel.tsx`
- `web/src/components/workbench/DiffPane.tsx`
- `web/src/components/diff/DiffView.tsx`
- `web/src/utils/parseDiff.ts`
- `backend/services/repo-service.mjs`
- `backend/handlers/repos.mjs`
- `backend/handlers/git-actions.mjs`
