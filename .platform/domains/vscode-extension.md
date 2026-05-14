---
domain_id: dom-vscode-extension
slug: vscode-extension
status: active
repo_ids: [git-worktree-diff]
related_domain_slugs: [git-worktrees]
created_at: 2026-05-14
updated_at: 2026-05-14
---

# vscode-extension

## What this domain does

This domain covers packaging the local Git Worktree Diff workbench as a VS Code extension so users can monitor multiple repositories, branches, and worktrees without leaving VS Code.

## Runtime boundaries

- The VS Code extension host owns editor integration, command registration, webview lifecycle, and any future VS Code-native Git/editor actions.
- The React workbench remains the primary UI and should be reusable both in browser/Vite mode and in a VS Code webview.
- The existing backend may be used as the first bridge for repo and diff data, but long-term extension-native Git calls should preserve the same allowlisted, argument-array execution model.
- Webview code cannot assume direct Node.js access; it must communicate through HTTPS/localhost APIs or VS Code `postMessage` bridges.

## Cross-layer touch points

- Extension manifest and activation: extension package metadata, commands, views, and activation events.
- Extension host code: creates the webview, resolves static assets, applies content security policy, and bridges messages to VS Code commands.
- Frontend build output: Vite assets must be loadable from a VS Code webview URI, not only from `/` in a browser.
- Backend contract: existing `/api/repos` and `/api/repos/diff` responses remain `{ ok, data?, error? }`.
- Editor integration: file-opening and diff-opening actions must keep repo root, worktree path, branch, and file path separate.

## Key files

- `package.json`
- `web/package.json`
- `web/vite.config.ts`
- `web/src/App.tsx`
- `web/src/lib/api.ts`
- `backend/services/repo-service.mjs`
- `backend/handlers/repos.mjs`
- Future: `extension/`

## Decisions locked

- Start with a VS Code webview wrapper around the existing React workbench to avoid rewriting a working product surface.
- Do not collapse repo root, worktree path, branch, and file identity into one VS Code workspace string.
- Do not expose the local backend beyond `127.0.0.1` as part of this extension work.
- Any destructive Git action surfaced inside VS Code must keep the same explicit user intent requirement as the browser workbench.
