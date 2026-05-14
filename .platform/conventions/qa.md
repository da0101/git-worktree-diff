# QA Conventions

Last updated: 2026-05-14

## Product Quality Bar

User experience is the differentiator. The app should be easier than GitHub Desktop for inspecting multiple worktrees and branches of the same repo.

## Manual QA Scope For UI Changes

- Add and remove a local repository.
- Switch between branches.
- Review changed files in unified and split modes.
- Confirm that every changed line is visible or clearly expandable.
- Select files and verify Git action enabled/disabled states.
- Exercise destructive-action confirmation for reject/discard behavior.
- Check empty, loading, error, and clean-working-tree states.

## Browser / Layout Checks

- Desktop wide viewport, because this is the primary workbench layout.
- Narrow viewport only when the touched UI is expected to remain usable there.
- Check text truncation for long repo paths and long file paths.
- Confirm no panel overlaps or scroll traps hide controls.

## Evidence To Capture

- Screenshot of the changed workflow.
- Short note describing test repo, branch, and changed file count.
- Any backend error text encountered during Git action testing.
