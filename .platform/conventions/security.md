# Security Conventions

Last updated: 2026-05-14

## Current Threat Model

The app is local-only, but the backend can modify any tracked Git repository. Treat local API routes as privileged command endpoints.

## Required Rules

- Bind the backend to `127.0.0.1` unless a hosted-mode security design has been approved.
- Use `execFile` with argument arrays for Git and local commands.
- Keep Git actions allowlisted.
- Validate that repo paths are tracked before reading diffs or executing actions.
- Never log secrets, full environment dumps, tokens, or credential helper output.
- Never read `.env` files during agent work; `.env.example` files are allowed.

## Destructive Actions

- `reject`, `checkout`, `rebase`, `pull`, `push`, and `amend` require clear UI intent.
- Preserve or improve confirmations for discard-style operations.
- Backend errors must not hide conflict states; surface enough detail for recovery.

## Hosted Mode Gate

Before hosted or AI-powered network behavior, design:

- Authentication and session handling
- Authorization per user/project/repo
- CSRF and origin protections
- Secret storage
- Audit logging
- Safe remote execution boundaries

No current code should assume those systems exist.
