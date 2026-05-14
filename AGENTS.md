<!-- agentboard:root-entry:begin v=1 -->
# git-worktree-diff

**What this is:** A local-first web workbench for quickly checking Git diffs across repositories, branches, and worktrees. The product goal is to make switching between worktrees and reviewing precise code diffs easier than GitHub Desktop, with future Agentboard project/repo grouping.

## Stack

React 19 + TypeScript + Vite + Tailwind CSS in `web/`; Node.js ESM local HTTP API in `backend/`; Git CLI for repository state and actions.

## Repo Structure

Single repo:

| Area | Path | Notes |
|---|---|---|
| Frontend | `web/` | Vite app, workbench UI, diff parser/rendering, Vitest tests |
| Backend | `backend/` | Local API on `127.0.0.1:8420`, Git command execution, repo registry |
| Agent context | `.platform/` | Architecture, domains, conventions, active work tracking |

## How This Project Actually Works

- The backend stores tracked repo paths in `~/.git-worktree-diff/repos.json`.
- Repo summaries and diffs come from local Git commands, not GitHub APIs.
- The frontend fetches `/api/repos` and `/api/repos/diff`, parses unified diff text, and renders unified/split views.
- Git actions are allowlisted backend routes; destructive actions must stay explicit in the UI.
- Future Agentboard integration must model project root, repo root, worktree path, branch, and stream slug separately.

## Workflow

Session start:

1. Run `agentboard brief`.
2. Read `.platform/work/BRIEF.md`.
3. Read `.platform/work/ACTIVE.md`.
4. If one active stream exists, run `ab handoff <slug>` and confirm continuation with the user.
5. If multiple active streams exist, ask which to resume.
6. If none exist, ask what to work on or proceed with the user's current request.

For non-trivial work, follow `.platform/workflow.md`: triage -> interview -> research -> propose -> execute -> verify. New implementation streams require domain context, a stream file, ACTIVE/BRIEF updates, research first, and a separate worktree before coding.

## Reference Pack (.platform/)

- `.platform/STATUS.md` — feature areas, priorities, gotchas, release blocklist
- `.platform/architecture.md` — components, data flow, invariants, debt
- `.platform/repos.md` — repo routing and specialist guidance
- `.platform/workflow.md` — full multi-step workflow and stream closure protocol
- `.platform/work/BRIEF.md` and `.platform/work/ACTIVE.md` — current work state
- `.platform/domains/git-worktrees.md` — core diff/repo/branch/worktree domain
- `.platform/domains/agentboard-projects.md` — future Agentboard project grouping domain
- `.platform/conventions/` — API, security, testing, deployment, QA, React/Vite, Node.js
- `.platform/memory/decisions.md` and `.platform/memory/log.md` — durable decisions and task history

## Hard Constraints (Don't Break These)

1. Diff precision is the product: every changed line returned by Git must be visible or clearly expandable.
2. Worktree path, repo root, branch, and future Agentboard stream identity must not be collapsed into one ambiguous string.
3. The UX must stay faster and clearer than GitHub Desktop for branch/worktree diff review.
4. Backend Git commands must remain allowlisted and executed through argument arrays.
5. Keep the backend local-only unless hosted mode gets a full auth/security design.
6. Destructive Git actions require explicit user intent and clear recovery/error messaging.
<!-- agentboard:root-entry:end v=1 -->
