# git-worktree-diff — Decision Log

Last updated: 2026-05-14

> **Purpose:** capture the _why_ behind architectural, product, and tooling decisions so future AI sessions and developers don't have to re-derive them.

---

## Format

Each decision is one row. **Locked** decisions are final until a new decision supersedes them. **Deferred** decisions are explicit non-decisions with a trigger for when to revisit.

## Locked decisions

| # | Date | Topic | Decision | Why | Rejected alternatives |
|---|---|---|---|---|---|
| 1 | 2026-05-14 | Product center | Optimize first for fast, precise local diff review across repos, branches, and worktrees. | The user need is a simpler, more focused workflow than GitHub Desktop provides for multi-worktree branch review. | General Git client parity; PR-review-first UX. |
| 2 | 2026-05-14 | Runtime model | Keep the current app local-first with a browser UI and `127.0.0.1` Node backend. | The backend performs privileged local Git operations and is not designed for network exposure. | Hosted-by-default web app. |
| 3 | 2026-05-14 | Backend command execution | Use Node `execFile` with argument arrays for Git commands. | Avoids shell interpolation risk while keeping the backend small and dependency-light. | Shell command strings; adding a Git wrapper before the command surface requires it. |
| 4 | 2026-05-14 | API shape | Keep API responses in `{ ok, data?, error? }` format. | The frontend API helper and backend routes already share this simple contract. | Throw-only frontend flow; mixed response envelopes per route. |
| 5 | 2026-05-14 | Agentboard fit | Treat Agentboard project/repo/worktree discovery as a first-class future domain, not a generic folder list. | Agentboard creates stream files and worktrees that should be visible as organized project context. | Flat repo-only store as the long-term model. |

## Deferred decisions

| # | Date | Topic | Current non-decision | Trigger to revisit |
|---|---|---|---|---|
| 1 | 2026-05-14 | Hosted mode | No auth, cloud storage, remote execution, or hosted deployment is designed yet. | Revisit before any network-hosted or multi-user feature. |
| 2 | 2026-05-14 | AI-powered features | Do not assume AI review/summary behavior in the core diff model yet. | Revisit after worktree/project visualization is reliable. |
| 3 | 2026-05-14 | Cross-platform folder picker | macOS `osascript` remains acceptable because manual path entry is available. | Revisit before packaging for non-macOS users. |

## How to add a decision

1. Use the highest unused `#`.
2. Fill date, status, topic, decision, why, rejected alternatives.
3. If this supersedes a prior decision, reference it: "Supersedes #N".
4. If it's deferred, include a trigger condition.
5. Commit with message: `Record decision #N: <topic>`.
