---
stream_id: stream-vscode-native-sidebar
slug: vscode-native-sidebar
type: feature
status: awaiting-verification
agent_owner: codex
domain_slugs: [vscode-extension, git-worktrees]
repo_ids: [git-worktree-diff]
base_branch: feature/vscode-extension-workbench
git_branch: feature/vscode-extension-workbench
created_at: 2026-05-14
updated_at: 2026-05-15
closure_approved: false
---

# vscode-native-sidebar

## Scope
- Add a native-feeling VS Code Activity Bar entry for Git Worktree Diff.
- Add a compact sidebar view for repositories, worktrees/branches, file counts, and quick opening the full workbench.
- Keep the full React workbench in the editor tab for wide diff inspection.
- Keep web browser mode under `web/` unchanged except where shared API behavior already supports VS Code webviews.
- Out of scope for this slice: replacing the backend, native VS Code diff editor integration, Marketplace publish polish, and destructive Git actions from the sidebar.

## Done criteria
- [x] Activity Bar shows a Git Worktree Diff container/icon.
- [x] Sidebar view renders inside that container and fetches repo summaries and changed files from `127.0.0.1:8420`.
- [x] Sidebar offers refresh, open-full-workbench, and clickable repo/worktree navigation actions.
- [x] Changed-file rows open VS Code native diff editors.
- [x] Changed-file context menus expose stage, unstage, and discard actions through existing allowlisted backend routes.
- [x] Extension no longer depends on the React workbench or backend server for the native VS Code workflow.
- [x] Native commands support add repo, remove repo, branch checkout, commit changed files, refresh, open diff, stage, unstage, and discard.
- [x] Full workbench editor tab still opens and renders.
- [x] `npm run build`, `npm run test:web`, and `npm run lint:web` pass.
- [ ] Manual Extension Development Host QA verifies the Activity Bar/sidebar.
- [x] `.platform/memory/log.md` appended.
- [x] `decisions.md` updated if any architectural choices were made.

## Key decisions

2026-05-14 — Stack this stream on `feature/vscode-extension-workbench` — the native sidebar depends on the uncommitted VS Code extension wrapper that was just manually verified.
2026-05-14 — Use a `WebviewView` for the first sidebar slice — it gives the custom compact UI quickly while keeping the option to migrate lists to native TreeViews later.

## Worktree / Local environment

| Repo | Worktree path | Branch | Base | Dependencies | Local command | Localhost port(s) |
|---|---|---|---|---|---|---|
| git-worktree-diff | `/private/tmp/git-worktree-diff-vscode-extension-workbench` | `feature/vscode-extension-workbench` | stacked on uncommitted extension stream | `web/npm install` and root `npm install` completed | Backend: `cd backend && npm start`; Extension: open folder in VS Code and run `Run Extension` | Backend `8420` |

## Resume state
_Overwritten by `ab checkpoint` — the compact payload the next agent reads first. Keep this block under ~10 lines._

- **Last updated:** 2026-05-15 by danilulmashev
- **What just happened:** Added a dynamic inline Ask Agent CodeLens above non-empty editor selections so the quick ask flow is visible near selected diff/editor code.
- **Current focus:** —
- **Next action:** Reload/restart the Extension Development Host, select code in a diff/editor, verify an inline Ask Agent CodeLens appears above the selection, click it, enter a question, choose terminal, and verify send.
- **Blockers:** none

## Progress log

2026-05-15 13:45 — Added a dynamic inline Ask Agent CodeLens above non-empty editor selections so the quick ask flow is visible near selected diff/editor code.

2026-05-15 13:43 — Added modal confirmations for commit selected files and push actions so serious Git actions require explicit approval before execution.

2026-05-15 13:41 — Added an editor selection Ask Agent quick flow via the VS Code lightbulb/context menu: prompt for question, choose terminal, and send immediately without sidebar draft state.

2026-05-15 12:51 — Fixed duplicate agent terminals by using per-terminal ids instead of raw names, labels duplicate Codex terminals distinctly, and added automatic Actions view terminal refresh every 2.5s.

2026-05-15 12:46 — Added agent terminal detection so VS Code terminal process labels like node can display as Codex/Claude/Gemini when the terminal process tree exposes the agent CLI.

2026-05-15 12:41 — Fixed Agent tab terminal dropdown cleanup, multi-file selected context sends, visible Agent clear action, and automatic selection/draft clearing after a successful send.

2026-05-15 12:31 — Corrected the Actions panel branch dropdown so it includes and selects the current main-repo branch; checkout only enables after choosing a different branch.

2026-05-15 12:23 — Added repo-only branch checkout in the native Actions panel and locked linked worktrees out of checkout while preserving file/Git actions.

2026-05-14 00:00 — Stream created for native-feeling VS Code Activity Bar/sidebar integration.
2026-05-14 00:00 — Implemented Activity Bar/sidebar contributions and compact sidebar webview provider backed by `/api/repos`.
## Open questions

_None._

---

## 🔍 Audit Report

_Status: not yet run_
