# git-worktree-diff — Architecture

Last updated: 2026-05-14

> Local-first Git worktree and branch diff workbench.

---

## 1. What this system does

Git Worktree Diff helps a developer quickly inspect code changes across local Git repositories, branches, and worktrees. The product exists because GitHub Desktop does not make it easy enough to jump between multiple worktrees and branches for the same repository while keeping diff review precise.

Technically, this is a local web app: a Vite/React frontend talks to a Node HTTP backend bound to `127.0.0.1`. The backend shells out to Git for repository summaries, diffs, branch checkout, and selected Git actions.

**Who uses it:** local developers and AI-assisted workflows managed through Agentboard, Claude, Codex, and Gemini.
**Who deploys it:** currently the developer runs it locally.
**Hosting target:** local machine for now; hosted and AI-powered modes are future possibilities, not current assumptions.

## 2. High-level components

```text
Browser UI (React/Vite)
  -> local HTTP API on 127.0.0.1:8420
  -> Git CLI in tracked repo/worktree paths
  -> local repo registry at ~/.git-worktree-diff/repos.json

Optional future context:
Agentboard project roots
  -> project repo registry / stream metadata
  -> worktree paths created for feature, bugfix, and hotfix streams
```

## 3. Tech stack (summary)

| Layer | Choice | Notes |
|---|---|---|
| Frontend language | TypeScript / React 19 | Vite app under `web/`. |
| Frontend styling | Tailwind CSS v4 plus CSS variables | `web/src/index.css` owns app shell, theme, and diff colors. |
| Backend language | Node.js ESM | Minimal `node:http` server under `backend/`; no framework. |
| Backend integrations | Git CLI, macOS `osascript` | Git commands use `execFile`; folder picker is macOS-specific. |
| Data store | JSON file in user home | `~/.git-worktree-diff/repos.json` stores tracked repositories only. |
| Build/test | npm, Vite, TypeScript, Vitest, ESLint | Backend currently has only a `start` script. |

Per-stack conventions live in `.platform/conventions/`.

## 4. Data flow

1. The user tracks a repo path manually or through the folder picker.
2. The backend normalizes the path to the Git toplevel and stores it in `repos.json`.
3. The frontend asks `/api/repos` for summaries; the backend runs Git commands for branch, branches, status, and numstat.
4. The frontend asks `/api/repos/diff?path=...`; the backend returns `git diff HEAD --`.
5. The frontend parses unified diff text into per-file structures and renders unified or split review modes.
6. Git actions post back through `/api/git/:action`; the backend executes allowlisted Git commands and returns refreshed repo summaries.

## 5. Auth model

There is no current auth model. The process is local-only and bound to `127.0.0.1`, but it can read and modify any Git repository path the user tracks. Treat every API route as a privileged local command surface.

Do not add hosted behavior without first designing authentication, authorization, tenant/data isolation, CSRF protection, and audit logging.

## 6. External services

| Service | What it's used for | Where the secret lives |
|---|---|---|
| Git CLI | Reading diffs, branches, status and executing user-triggered Git actions | No secret managed by this app |
| macOS `osascript` | Native folder picker for choosing a repo | No secret |
| Agentboard | Future source of project/repo/worktree metadata | Local `.platform/` files and Agentboard CLI state |

No network services or API credentials are required today.

## 7. Deploy topology

Current topology is local development:

- Backend: `npm start` from `backend/`, listening on `127.0.0.1:8420`.
- Frontend: `npm run dev` from `web/`; Vite proxies `/api` and `/health` to the backend.
- Preview/build: `npm run build` from `web/`.

Hosted deployment is deferred. Do not assume the local backend is safe to expose to a network.

## 8. Cross-component invariants

1. Diff rendering must be precise: every changed line returned by Git must be inspectable in the UI.
2. Repo, worktree, and branch identity must stay separate; a branch name alone is not a stable target.
3. Backend Git operations must remain allowlisted and use argument arrays, not shell string interpolation.
4. Destructive operations such as reject, checkout conflicts, rebase, amend, pull, and push need explicit user-facing affordances.
5. Future Agentboard integration must preserve project, repo, stream, worktree path, and branch relationships.

## 9. Known architectural debt

| Area | Issue | Planned fix |
|---|---|---|
| Diff rendering | `DiffView.tsx` is large and includes collapse, split rendering, modal, review hooks, and line rows in one file. | Split before changing diff behavior deeply. |
| Repo model | Current store tracks only flat repo paths. | Introduce project/repo/worktree grouping before Agentboard integration. |
| Backend tests | Backend has no test script or route-level tests. | Add focused tests around Git command construction and repo/worktree model behavior. |
| Platform support | Folder picker depends on macOS `osascript`. | Keep manual path entry as the portable baseline. |
