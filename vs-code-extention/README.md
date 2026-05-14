# VS Code Extension

This folder owns the VS Code-native experience for Git Worktree Diff.

The browser workbench remains in `web/`. The extension code here ports the same product behavior into VS Code-native surfaces:

- Activity Bar container
- Native Tree View for repos, worktrees, and changed files
- Native VS Code diff editors for changed files
- Sidebar action panel for selected-file commits, Git actions, and agent terminal handoff
- Direct extension-host Git execution through argument-array commands

Current flow:

```text
VS Code Tree View -> VS Code diff editors -> extension-host Git logic
```

Agent handoff flow:

```text
Selected files/editor selection -> Agent tab -> existing VS Code terminal
```
