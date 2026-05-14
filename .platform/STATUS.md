# git-worktree-diff — Current Status

Last updated: 2026-05-14

> Local-first web UI for quickly reviewing diffs across Git worktrees and branches.

---

## Feature areas

| Area | Status | Last touched | Notes |
|---|---|---|---|
| Local repository tracking | 🔵 Exists | 2026-05-13 | Tracks manually added Git repositories in `~/.git-worktree-diff/repos.json`; supports macOS folder picker through `osascript`. |
| Working-tree diff viewer | ⚠ Flagged | 2026-05-13 | Unified and split views exist, but the current UI collapses/truncates context in ways that can hide changed-line confidence from the user. |
| Branch switching | 🔵 Exists | 2026-05-13 | Branch list and checkout are wired through the local backend; UX must stay fast and safe around dirty worktrees. |
| Git actions | 🔵 Exists | 2026-05-13 | Stage, unstage, reject, commit, amend, fetch, pull, push, and rebase are exposed locally. Destructive actions require clear confirmation. |
| Worktree visualization | ⧗ Pending | 2026-05-14 | Core next priority: show worktrees and branches for the same repo, including Agentboard-created worktrees. |
| Agentboard project repo grouping | ⧗ Pending | 2026-05-14 | Needed for projects such as `/Users/danilulmashev/Documents/GitHub/takecare-platform` that coordinate multiple repos. |
| Hosted / AI-powered mode | 🔴 Deferred | 2026-05-14 | Possible future direction; current architecture is local-only and must not assume network-hosted auth or cloud storage. |

**Legend:**
- ✓ Done — shipped, tested, merged
- 🔵 Exists — in place but may need review
- ⧗ Pending — planned, not started
- ⚠ Flagged — known issue that needs attention
- 🔴 Deferred — decided to punt or keep future-facing

## Immediate priorities

1. **Accurate full diff rendering** — the diff pane must make every changed line inspectable without surprising truncation or hidden context.
2. **Worktree and branch visualization** — make it extremely easy to compare different worktrees and branches of the same repo.
3. **Agentboard project repo grouping** — when viewing an Agentboard-managed project, surface the project repos and their worktrees as first-class selectable targets.

## Open decisions

| # | Question | Deadline |
|---|---|---|
| 1 | Should the app auto-discover Agentboard projects and repos, or require users to add the project root first? | Before worktree/grouping implementation |
| 2 | Should hosted mode be a separate product mode or an evolution of the local backend? | Before adding auth, remote storage, or AI services |

## Release blocklist

Things that must be resolved before this project is considered useful enough to rely on:

- [ ] Diff view proves every changed line is visible and selectable in unified and split modes.
- [ ] Worktrees for the same repository are discoverable and easy to switch between.
- [ ] Branch switching clearly communicates dirty-worktree risks and failures.
- [ ] Agentboard-managed multi-repo projects can be represented without losing repo/worktree identity.

## Known gotchas (pinned)

- **Diff precision is the product** — any truncation, collapsed section, parser bug, or stale diff cache undermines the main use case.
- **Worktree identity matters** — branch name alone is not enough; multiple worktrees can point at related branches and must remain distinguishable by path and repo root.
- **Local Git commands are powerful** — reject, checkout, rebase, pull, push, and amend must stay explicit and recoverable from the user's point of view.

## File size violations

> Global rule: max ~300 lines per file. Track known offenders here so they get split before being added to.

- `web/src/App.tsx` — around 300 lines; split further before adding large new workflows.
- `web/src/components/diff/DiffView.tsx` — over 500 lines; should be decomposed before changing diff behavior deeply.

---

For architecture and conventions, see `.platform/architecture.md`, `.platform/repos.md`, and `.platform/conventions/`.
