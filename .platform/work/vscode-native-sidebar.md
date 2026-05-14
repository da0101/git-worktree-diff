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
updated_at: 2026-05-14
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

- **Last updated:** 2026-05-14 by codex
- **What just happened:** Corrected the target from React wrapper to native replacement: `vs-code-extention/` now reads the repo store and runs Git directly, with native repo/branch/commit/file commands.
- **Current focus:** Await manual Extension Development Host verification of the fully native workflow.
- **Next action:** Reload/restart the Extension Development Host, expand Worktrees, click a changed file, verify native diff opens, and test safe stage/unstage plus branch checkout/commit prompts.
- **Blockers:** none

## Progress log

2026-05-14 00:00 — Stream created for native-feeling VS Code Activity Bar/sidebar integration.
2026-05-14 00:00 — Implemented Activity Bar/sidebar contributions and compact sidebar webview provider backed by `/api/repos`.
2026-05-14 00:00 — Verified `npm run build`, `npm run test:web`, and `npm run lint:web`.
2026-05-14 00:00 — Added clickable sidebar repo/worktree navigation into the full React workbench and reverified build/test/lint.
2026-05-14 00:00 — Created sibling `vs-code-extention/`, moved the native extension source there, added API/types/TreeView modules, and replaced the placeholder icon with a custom worktree-diff SVG.
2026-05-14 00:00 — Added native diff editor support via virtual HEAD content and file context actions for stage, unstage, and discard; build/test/lint pass.
2026-05-14 00:00 — Removed backend HTTP and React workbench dependency from the extension workflow; native extension now reads `~/.git-worktree-diff/repos.json` and executes Git directly.

## Open questions

_None._

---

## 🔍 Audit Report

_Status: not yet run_
