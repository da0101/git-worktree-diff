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
| 6 | 2026-05-15 | Branch flow | Use `develop` as the default development branch; feature and bugfix branches start from `develop`; `main` is release-only and should receive merges from `develop` only. | This gives the VS Code extension a stable integration branch for testing while keeping `main` as the released state. | Continuing direct feature work on `main`; branching features from release tags. |
| 6 | 2026-05-14 | VS Code extension first slice | Start with a VS Code `WebviewPanel` that loads the existing built React workbench and connects to the existing `127.0.0.1:8420` backend. | This gets the working multi-worktree diff UI inside VS Code quickly without rewriting Git/backend behavior or compressing the UI into a sidebar. | Rebuild the UI as native VS Code tree views first; move all Git execution into the extension host before proving the UX. |
| 7 | 2026-05-14 | VS Code native surface | Add an Activity Bar container with a compact `WebviewView` sidebar, while keeping the full React diff workbench as the editor-sized view. | The sidebar should feel native and stay narrow, but the diff viewer needs horizontal space and should not be forced into the primary sidebar. | Put the full workbench unchanged into the sidebar; rewrite the first sidebar as native TreeViews before validating the workflow. |
| 8 | 2026-05-14 | VS Code extension folder | Keep VS Code-native code in sibling folder `vs-code-extention/`, separate from browser code in `web/`. | The extension should become its own native implementation surface while reusing only shared contracts and the full React workbench bridge where useful. | Keep extension code mixed into `web/`; keep a generic `extension/` folder with unclear ownership. |
| 9 | 2026-05-14 | Native diff path | Changed-file rows in the VS Code tree open native `vscode.diff` editors using virtual HEAD content from the extension host. | This makes the VS Code extension useful without forcing users back through the React diff renderer for single-file review. | Continue routing all file clicks to the React workbench; write temporary files for HEAD content. |
| 10 | 2026-05-14 | Native extension replacement | The VS Code extension should replace the React workflow for VS Code users: direct Git execution, native TreeView, native diff editors, and native commands. | The requested product is a VS Code-native analog of the React app, not a wrapper around the React UI. | Keep the React workbench as the primary extension experience; require the backend server for VS Code usage. |
| 11 | 2026-05-14 | Agent handoff transport | Send code/file review prompts to existing VS Code terminals instead of direct vendor APIs. | The user already runs Codex, Claude, and Gemini CLIs in split terminals, so terminal handoff is the fastest native path and stays vendor-agnostic. | Build direct API integrations first; require managed terminals before supporting the user's current workflow. |

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
