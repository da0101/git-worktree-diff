# git-worktree-diff — Repos & Specialist Routing

Last updated: 2026-05-14

---

## Repos

| Repo ID | Path | Role / stack hint | Deep reference |
|---|---|---|---|
| git-worktree-diff | `.` | single repo with `web/` React/Vite frontend and `backend/` Node local API | `.platform/architecture.md` |

This is a single-repo project today. Future behavior may read Agentboard-managed project roots that themselves coordinate multiple sibling repos, but this codebase remains one repo unless explicitly changed.

## Conventions — which file governs which area

| Area you're touching | Read first |
|---|---|
| HTTP / API endpoints | `.platform/conventions/api.md` |
| Local command execution / secrets / destructive Git actions | `.platform/conventions/security.md` |
| Tests | `.platform/conventions/testing.md` |
| Local dev / release / rollback | `.platform/conventions/deployment.md` |
| UI and manual verification | `.platform/conventions/qa.md` |
| React/Vite frontend | `.platform/conventions/react-vite.md` |
| Node local backend | `.platform/conventions/nodejs.md` |
| Git repo, branch, diff, worktree behavior | `.platform/domains/git-worktrees.md` |
| Agentboard project/repo grouping | `.platform/domains/agentboard-projects.md` |

## Specialist routing

| When you touch... | Use skill |
|---|---|
| New feature or medium+ workflow | `ab-triage`, then `ab-workflow` if scope stays medium+ |
| Product scope / user value | `ab-pm` |
| Repo/worktree data model or cross-cutting design | `ab-architect` |
| Backend command behavior or a non-obvious bug | `ab-debug` |
| Frontend UI change | `ab-qa` before shipping |
| Tests | `ab-test-writer` |
| Pre-PR review | `ab-review` |
| Security-sensitive Git operations or hosted-mode prep | `ab-security` |

## Hard repo rules carried over from the platform

1. Max ~300 lines per file; split large files before expanding them.
2. No secrets in code, logs, committed files, or local registry files.
3. API response shape is `{ ok, data?, error? }`.
4. Git command execution must use allowlisted operations and argument arrays.
5. Every behavior change needs at least one happy-path test and one edge/failure test where feasible.
