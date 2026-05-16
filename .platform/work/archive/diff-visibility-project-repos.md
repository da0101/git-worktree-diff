---
stream_id: stream-diff-visibility-project-repos
slug: diff-visibility-project-repos
type: bugfix
status: awaiting-verification
agent_owner: codex
domain_slugs: [git-worktrees, agentboard-projects]
repo_ids: [git-worktree-diff]
base_branch: main
git_branch: bugfix-diff-visibility-project-repos
created_at: 2026-05-14
updated_at: 2026-05-14
closure_approved: false
---

# diff-visibility-project-repos

## Scope
- Fix the current diff panel so users can scroll through and inspect the full selected file diff.
- Verify unified and split modes do not hide changed lines behind a trapped or clipped scroll container.
- Research the minimum backend/frontend shape needed to show repos/worktrees managed by an Agentboard project such as `takecare-platform`.
- Keep Agentboard project grouping as the next implementation slice unless the full-diff fix requires shared data-model changes.
- Out of scope for the first patch: hosted mode, AI review, remote Git providers, or destructive Git action changes.

## Done criteria
- [x] Selected file diff can be scrolled from top to bottom in the main pane.
- [x] Changed-line counts shown in the file list match inspectable rendered changes.
- [x] Unified and split modes remain usable with large diffs.
- [x] Agentboard project/repo/worktree discovery has a concrete follow-up plan or first minimal implementation, depending on research findings.
- [x] `npm run test`, `npm run lint`, and `npm run build` pass in `web/`.
- [x] Manual browser QA verifies the screenshot repro case or an equivalent large diff.
- [x] `.platform/memory/log.md` appended.
- [ ] `decisions.md` updated if any architectural choices were made.

## Key decisions

2026-05-14 — Use `main` as the base branch for this stream — the repository currently has no `develop` branch, so following the worktree rule literally is not possible without inventing a new base branch.
2026-05-14 — Use `bugfix-diff-visibility-project-repos` as the actual branch name — the slash form could not be created in the current Git ref layout, so the safe hyphenated branch keeps the stream isolated.

## Worktree / Local environment

| Repo | Worktree path | Branch | Base | Dependencies | Local command | Localhost port(s) |
|---|---|---|---|---|---|---|
| git-worktree-diff | `/private/tmp/git-worktree-diff-diff-visibility-project-repos` | `bugfix-diff-visibility-project-repos` | `main` | `web/npm install` completed; backend has no dependencies | Backend: `cd backend && npm start`; frontend: `cd web && npm run dev` | Backend `8420`; Vite default `5173` |

## Resume state

- **Last updated:** 2026-05-14 by codex
- **What just happened:** Implemented bounded diff-body scrolling, always-visible Full diff access, removed clipped shadows, wrapped full filenames in the file list, and expanded Agentboard hub repos from `.platform/repos.md`.
- **Current focus:** Awaiting user verification in the running app.
- **Next action:** User should refresh/retry `takecare-platform`; if accepted, close the stream with human approval.
- **Blockers:** none

## Progress log

2026-05-14 20:55 — Merged fixes to `main`; restarted backend on `127.0.0.1:8420`; API now lists `takecare-platform` plus managed repos.
2026-05-14 20:25 — Stream registered for diff visibility and Agentboard project repo/worktree discovery.
2026-05-14 20:32 — Created isolated worktree at `/private/tmp/git-worktree-diff-diff-visibility-project-repos` on branch `bugfix-diff-visibility-project-repos`.
2026-05-14 20:34 — Installed frontend dependencies in the stream worktree; npm reported an existing Node engine warning and moderate audit findings.

## Open questions

- Should Agentboard project grouping auto-discover repos from `.platform/repos.md`, Agentboard CLI output, or both?

---

## 🔍 Audit Report

_Status: not yet run_
