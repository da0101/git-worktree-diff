---
domain_id: dom-agentboard-projects
slug: agentboard-projects
status: active
repo_ids: [git-worktree-diff]
related_domain_slugs: [git-worktrees]
created_at: 2026-05-14
updated_at: 2026-05-14
---

# agentboard-projects

## What this domain does

This domain covers future integration with Agentboard-managed projects, where one project root can coordinate multiple repos, streams, branches, and worktrees. The intended user outcome is selecting a project such as `takecare-platform` and immediately seeing its related repos and available worktrees.

## Backend / source of truth

- No implemented backend model exists yet.
- Future code should read Agentboard project metadata from local `.platform/` files or Agentboard CLI output rather than guessing from folder names alone.
- The data model should distinguish project root, repo root, worktree path, branch, stream slug, and status.

## Frontend / clients

- No dedicated project selector exists yet.
- The current `RepositoryPanel` is a flat repo selector and will not scale to Agentboard projects without a grouped model.
- The future UI should make project, repo, worktree, and branch switching faster than GitHub Desktop.

## API contract locked

- Do not overload the current repo path string to mean project, repo, and worktree at once.
- A project can contain multiple repos.
- A repo can have multiple worktrees.
- A worktree has a path and branch, and may optionally link to an Agentboard stream slug.

## Key files

- `.platform/work/ACTIVE.md`
- `.platform/work/BRIEF.md`
- `.platform/repos.md`
- `backend/store/repo-store.mjs`
- `backend/services/repo-service.mjs`
- `web/src/components/workbench/RepositoryPanel.tsx`

## Decisions locked

- Agentboard integration is local-first.
- Agentboard metadata is context, not a replacement for Git as source of truth.
- The first usable version should favor explicit, inspectable grouping over hidden auto-magic.
