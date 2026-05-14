---
stream_id: stream-vscode-extension-workbench
slug: vscode-extension-workbench
type: feature
status: awaiting-verification
agent_owner: codex
domain_slugs: [vscode-extension, git-worktrees]
repo_ids: [git-worktree-diff]
base_branch: main
git_branch: feature/vscode-extension-workbench
created_at: 2026-05-14
updated_at: 2026-05-14
closure_approved: false
---

# vscode-extension-workbench

## Scope
- Package the existing React Git Worktree Diff workbench as an initial VS Code extension experience.
- Reuse the current browser workbench UI in a VS Code webview rather than rewriting the product surface.
- Keep the existing local backend/API path available for the first implementation slice.
- Add minimal VS Code-native integration where it materially improves the first version, such as opening the workbench panel from a command.
- Out of scope for the first slice: Marketplace publishing, replacing all backend Git calls with extension-host Git calls, hosted mode, auth, and new destructive Git workflows.

## Done criteria
- [x] A VS Code extension shell can launch the workbench UI inside VS Code.
- [x] The webview can load the built React assets with an appropriate CSP and asset URI handling.
- [x] The initial extension path preserves existing repo/worktree/diff behavior through the current local backend contract.
- [x] Developer commands for building/running/package-checking the extension are documented in package scripts or stream notes.
- [x] Relevant automated checks pass.
- [x] Manual VS Code Extension Development Host QA verifies the workbench opens from inside VS Code.
- [x] `.platform/memory/log.md` appended.
- [x] `decisions.md` updated if any architectural choices were made.

## Key decisions

2026-05-14 — Use `main` as the base branch for this stream — the repository currently has no `develop` branch.
2026-05-14 — Use a VS Code `WebviewPanel` for the first slice — the existing workbench needs editor-width space and should not be squeezed into a sidebar before the core extension wrapper is proven.
2026-05-14 — Keep the existing `127.0.0.1:8420` backend bridge for v0 — this preserves the working Git command surface and avoids mixing UI packaging with backend migration.
2026-05-14 — Activate the first dev-build extension on startup — the command contribution appeared before the command handler registered in manual QA, so eager activation is acceptable for this local-first v0.

## Worktree / Local environment

| Repo | Worktree path | Branch | Base | Dependencies | Local command | Localhost port(s) |
|---|---|---|---|---|---|---|
| git-worktree-diff | `/private/tmp/git-worktree-diff-vscode-extension-workbench` | `feature/vscode-extension-workbench` | `main` | `web/npm install` completed with existing Node engine warning and moderate audit findings; backend has no dependencies | Backend: `cd backend && npm start`; frontend: `cd web && npm run dev`; extension command: TBD in implementation, likely VS Code Extension Development Host via `F5` or `code --extensionDevelopmentPath` | Backend `8420`; Vite default `5173` |

## Resume state

- **Last updated:** 2026-05-14 by codex
- **What just happened:** User verified the VS Code Extension Development Host opens the Git Worktree Diff workbench and renders repo diffs inside VS Code.
- **Current focus:** Await human approval to commit.
- **Next action:** If approved, commit the feature branch changes.
- **Blockers:** none

## Progress log

2026-05-14 00:00 — Stream registered for the VS Code extension workbench.
2026-05-14 00:00 — Created isolated worktree at `/private/tmp/git-worktree-diff-vscode-extension-workbench` on `feature/vscode-extension-workbench`.
2026-05-14 00:00 — Installed frontend dependencies; npm reported the existing Node engine warning and moderate audit findings.
2026-05-14 00:00 — Completed bounded research: first slice should use a VS Code `WebviewPanel`, relative Vite assets, localhost API base injection, CSP, and restricted local resource roots.
2026-05-14 00:00 — Implemented root extension manifest/scripts, VS Code webview host, launch/task config, `.vscodeignore`, and frontend API-base support.
2026-05-14 00:00 — Verified `npm run build`, `npm run test:web`, `npm run lint:web`, backend health, and Extension Development Host launch; UI automation was blocked by macOS permissions.
2026-05-14 00:00 — Manual QA found `gitWorktreeDiff.openWorkbench` was contributed but not registered at command execution; changed activation to eager startup and cleaned up the command title.
2026-05-14 00:00 — User verified the workbench renders inside the VS Code Extension Development Host and shows repository diffs.

## Open questions

_None._

---

## 🔍 Audit Report

_Status: not yet run_
