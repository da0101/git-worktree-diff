# VS Code Extension

This folder owns the VS Code-native experience for Git Worktree Diff.

The browser workbench remains in `web/`. The extension code here ports the same product behavior into VS Code-native surfaces:

- Activity Bar container
- Native Tree View for repos, worktrees, and changed files
- Commands for refresh and opening the full workbench
- Bridge into the React workbench only for the wide diff/review surface

Current bridge:

```text
VS Code Tree View -> extension commands -> React workbench panel -> backend on 127.0.0.1:8420
```

Long-term target:

```text
VS Code Tree View -> VS Code diff editors and Git commands -> extension-host Git logic
```
