# Git Worktree Diff

Git Worktree Diff is a local-first workbench for reviewing changes across multiple Git repositories, branches, and worktrees from one place.

The main use case is AI-assisted development where several agents are working in parallel on different branches or worktrees. Instead of jumping between terminal tabs, folders, and GitHub Desktop windows, this tool keeps the changed files, native diffs, Git actions, and agent handoff flow together.

## What It Does

- Tracks local Git repositories and their worktrees.
- Shows changed files across repos and branches.
- Opens precise file diffs.
- Supports selected-file Git actions such as commit, stage, unstage, discard, ignore, stash, push, pull, fetch, amend, and rebase.
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
3. Open the Git Worktree Diff icon in the Activity Bar.
4. Add or select a tracked repository.
5. Select changed files and use the Actions panel for commits, Git actions, or agent handoff.

## Install Locally in VS Code

You can install Git Worktree Diff globally in your local VS Code without publishing it to the Marketplace.

Package version `1.1.0` as a `.vsix` file:

```bash
npm install
npm run build
npx @vscode/vsce package
```

This creates:

```text
git-worktree-diff-1.1.0.vsix
```

Install it into your normal VS Code user profile:

```bash
code --install-extension git-worktree-diff-1.1.0.vsix
```

After installing, restart VS Code. The Git Worktree Diff icon is available globally in the Activity Bar for all projects opened with the same VS Code profile.

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
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```
