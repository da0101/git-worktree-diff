# Worktree Diff

Worktree Diff is a local-first workbench for reviewing changes across multiple Git repositories, branches, worktrees, and commit history from one place.

The main use case is AI-assisted development where several agents are working in parallel on different branches or worktrees. Instead of jumping between terminal tabs, folders, and GitHub Desktop windows, this tool keeps the changed files, native diffs, Git actions, and agent handoff flow together.

## What It Does

- Tracks local Git repositories and their worktrees.
- Shows changed files across repos and branches.
- Shows recent commit history with authors, changed files, and commit diffs.
- Opens precise file diffs.
- Supports selected-file Git actions such as commit, stage, unstage, discard, ignore, stash, push, pull, fetch, amend, rebase, and branch checkout.
- Keeps linked worktrees locked to their branch while allowing checkout in the main repo worktree.
- Sends selected files or editor selections to an existing VS Code terminal running Codex, Claude Code, Gemini, or another CLI agent.
- Keeps the browser app and VS Code extension separate so each can evolve for its own environment.

## Project Layout

```text
backend/             Local Node HTTP API for the browser app
web/                 React/Vite browser workbench
vs-code-extention/   VS Code-native extension implementation
.platform/           Agentboard project context, streams, decisions, and workflow notes
```

The extension folder is intentionally named `vs-code-extention/` to match the existing project stream.

## Browser Workbench

Install and run the web app:

```bash
npm --prefix web install
npm --prefix web run dev
```

The browser app talks to the local backend on `127.0.0.1:8420`.

## VS Code Extension

Install root dependencies:

```bash
npm install
```

Build the extension:

```bash
npm run build
```

Launch it in VS Code:

1. Open this repository in VS Code.
2. Press `F5` to start the Extension Development Host.
3. Open the Worktree Diff icon in the Activity Bar.
4. Add or select a tracked repository.
5. Select changed files and use the Actions panel for commits, Git actions, or agent handoff.
6. Open History to inspect previous commits and commit file diffs for the selected repo or worktree.

## Install Locally in VS Code

You can install Worktree Diff globally in your local VS Code without publishing it to the Marketplace.

Package the current version as a `.vsix` file:

```bash
npm install
npm run package:extension
```

This creates:

```text
git-worktree-diff-1.2.1.vsix
```

Install it into your normal VS Code user profile:

```bash
code --install-extension git-worktree-diff-1.2.1.vsix --force
```

After installing, restart VS Code. The Worktree Diff icon is available globally in the Activity Bar for all projects opened with the same VS Code profile.

For local testing before Marketplace release, rebuild and reinstall the current package version with one command:

```bash
npm run update:extension
```

Then run **Developer: Reload Window** in any open VS Code window that should pick up the new extension host code.

Uninstall it later with:

```bash
code --uninstall-extension danilulmashev.git-worktree-diff
```

## Agent Terminal Handoff

The VS Code extension sends prompts to terminals that already exist in VS Code. Start Codex, Claude Code, Gemini, or another CLI agent in the integrated terminal, then choose that terminal from the Agent tab.

You can send:

- checked changed files from the Worktrees tree
- a whole open file
- a highlighted editor or diff selection

The extension rebuilds selected-file context at send time, so changing the checked files changes what gets sent to the agent.

## Verification

Run the full local check set:

```bash
npm run build
npm run test
npm run lint:web
git diff --check
```

## Release Tags

Release tags use semantic versioning:

```bash
git tag -a v1.2.1 -m "Release v1.2.1"
git push origin v1.2.1
```
