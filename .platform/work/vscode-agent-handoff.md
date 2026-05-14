---
stream_id: stream-vscode-agent-handoff
slug: vscode-agent-handoff
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

# vscode-agent-handoff

## Scope
- Add native VS Code commands to send selected code or an active file reference to an existing agent terminal.
- Support users with Claude, Codex, and Gemini CLI terminals open in split terminal panes.
- Include repo/worktree/file/line metadata and the user's question in the generated prompt.
- Add missing native Git commands needed for the extension workflow: fetch, pull, push, rebase, amend, stage all, unstage all.
- Out of scope: direct Claude/Codex/Gemini APIs, autonomous terminal discovery beyond VS Code terminal names, and non-terminal chat integrations.

## Done criteria
- [x] Command sends selected editor text to a chosen VS Code terminal.
- [x] Command can send active file context without requiring selected text.
- [x] Terminal picker uses current VS Code terminals and remembers the last chosen terminal by name.
- [x] Prompt includes repo/worktree/file/line range/question/code context with size guardrails.
- [x] Native Git commands include fetch, pull, push, rebase, amend, stage all, unstage all.
- [x] `npm run build`, `npm run test:web`, and `npm run lint:web` pass.
- [ ] Manual Extension Development Host QA verifies send-to-agent and native Git command paths.
- [x] `.platform/memory/log.md` appended.
- [x] `decisions.md` updated if any architectural choices were made.

## Key decisions

2026-05-14 — Use VS Code terminals as the agent transport — the user already runs Codex/Claude/Gemini CLIs in split terminals, so `terminal.sendText` matches the actual workflow.

## Worktree / Local environment

| Repo | Worktree path | Branch | Base | Dependencies | Local command | Localhost port(s) |
|---|---|---|---|---|---|---|
| git-worktree-diff | `/private/tmp/git-worktree-diff-vscode-extension-workbench` | `feature/vscode-extension-workbench` | stacked on native extension work | root `npm install`; `web/npm install` | Extension: open folder in VS Code and run `Run Extension` | none required for native extension |

## Resume state

- **Last updated:** 2026-05-14 by codex
- **What just happened:** Added editor context commands for sending selection/file prompts to an existing VS Code terminal and added native fetch/pull/push/rebase/amend/stage-all/unstage-all.
- **Current focus:** Await manual Extension Development Host QA.
- **Next action:** Reload dev host, right-click selected code and choose send-to-agent command, choose a Codex/Claude/Gemini terminal, and verify prompt delivery.
- **Blockers:** none

## Progress log

2026-05-14 00:00 — Stream opened for VS Code terminal agent handoff and remaining native Git actions.
2026-05-14 00:00 — Implemented terminal handoff prompt builder, terminal picker with remembered terminal name, editor context commands, and remaining native Git commands; build/test/lint pass.

## Open questions

_None._

---

## 🔍 Audit Report

_Status: not yet run_
