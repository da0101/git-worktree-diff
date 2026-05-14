# React / Vite Conventions

Last updated: 2026-05-14

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, lucide-react icons.

## Structure

- `web/src/App.tsx` owns current app orchestration; split before adding major new workflows.
- `web/src/components/workbench/` owns the main repo/files/diff/actions workbench panels.
- `web/src/components/diff/` owns reusable diff rendering and review UI.
- `web/src/lib/` owns frontend API and diff-file helpers.
- `web/src/utils/` owns pure parsing utilities and their tests.

## UI Rules

- Keep the first screen as the actual workbench, not a landing page.
- Favor dense, scannable tool UI over marketing-style layouts.
- Use lucide icons for buttons where available.
- Keep cards/panels at 8px radius unless the existing design changes globally.
- Long paths and file names must truncate predictably without hiding the active repo/worktree identity.

## State Rules

- Persist user preferences such as theme, diff mode, repo path input, and selected repo through local storage only when it improves continuity.
- Clear selections when repo or diff source changes.
- Do not treat branch name as a unique identifier once worktree support is introduced.

## Diff Rendering Rules

- Changed lines must always be visible or clearly discoverable.
- If context is collapsed, the control must state exactly what is hidden.
- Full diff access must not depend on an arbitrary threshold that makes smaller diffs appear incomplete.
- Parser and renderer changes need tests.
