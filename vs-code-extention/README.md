# VS Code Extension

This folder owns the VS Code-native experience for Worktree Diff.

The browser workbench remains in `web/`. The extension code here ports the same product behavior into VS Code-native surfaces:

- Activity Bar container
- Native Tree View for repos, worktrees, and changed files
- Native History view for recent commits, authors, commit file lists, and commit diffs
- Native VS Code diff editors for changed files
- Sidebar action panel for selected-file commits, Git actions, and agent terminal handoff
- Main-repo branch checkout while linked worktrees stay locked to their checked-out branches
- Modal confirmation before serious Git actions like commit and push
- Direct extension-host Git execution through argument-array commands

Current flow:

```text
VS Code Tree View -> VS Code diff editors -> extension-host Git logic
```

Agent handoff flow:

```text
Selected files/editor selection -> Agent tab -> existing VS Code terminal
```

History flow:

```text
Select repo/worktree -> History view -> commit -> changed file diff
```

Local install:

```bash
npm run update:extension
```

Reload any open VS Code window after reinstalling so the extension host loads the rebuilt output.
