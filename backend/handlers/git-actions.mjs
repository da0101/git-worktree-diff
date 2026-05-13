import { git } from '../lib/git.mjs'
import { bodyFiles, bodyString, readJsonBody, send } from '../lib/http.mjs'
import { assertTracked, summarizeRepo } from '../services/repo-service.mjs'

const allowedActions = new Set(['stage', 'unstage', 'reject', 'commit', 'amend', 'fetch', 'pull', 'push', 'rebase'])

export async function gitAction(req, res, action) {
  if (!allowedActions.has(action)) {
    send(res, 404, { ok: false, error: 'Unknown Git action' })
    return
  }

  const body = await readJsonBody(req)
  const repoPath = bodyString(body, 'path')
  const files = bodyFiles(body)
  const message = bodyString(body, 'message')
  const branch = bodyString(body, 'branch')
  const remote = bodyString(body, 'remote') || 'origin'

  if (!repoPath) {
    send(res, 400, { ok: false, error: 'Repository path is required' })
    return
  }

  try {
    const repos = await assertTracked(repoPath)
    const output = await runGitAction(action, { repoPath, files, message, branch, remote })
    const summaries = await Promise.all(repos.map(summarizeRepo))
    send(res, 200, { ok: true, data: { output, repos: summaries } })
  } catch (error) {
    send(res, 409, {
      ok: false,
      error: error instanceof Error ? error.message : `Unable to ${action}`,
    })
  }
}

async function runGitAction(action, context) {
  const { repoPath, files, message, branch, remote } = context

  if (action === 'stage') {
    requireFiles(files, 'stage')
    return git(repoPath, ['add', '--', ...files])
  }

  if (action === 'unstage') {
    requireFiles(files, 'unstage')
    return git(repoPath, ['restore', '--staged', '--', ...files])
  }

  if (action === 'reject') {
    requireFiles(files, 'reject')
    return git(repoPath, ['restore', '--staged', '--worktree', '--', ...files])
  }

  if (action === 'commit') {
    requireFiles(files, 'commit')
    if (!message) throw new Error('Commit message is required')
    await git(repoPath, ['add', '--', ...files])
    return git(repoPath, ['commit', '-m', message])
  }

  if (action === 'amend') {
    if (files.length > 0) await git(repoPath, ['add', '--', ...files])
    return message
      ? git(repoPath, ['commit', '--amend', '-m', message])
      : git(repoPath, ['commit', '--amend', '--no-edit'])
  }

  if (action === 'fetch') return git(repoPath, ['fetch', remote, '--prune'])
  if (action === 'pull') return git(repoPath, ['pull', '--ff-only'])
  if (action === 'push') return git(repoPath, ['push', remote, 'HEAD'])

  if (action === 'rebase') {
    if (!branch) throw new Error('Target branch is required')
    return git(repoPath, ['rebase', branch])
  }

  throw new Error(`Unsupported action: ${action}`)
}

function requireFiles(files, action) {
  if (files.length === 0) {
    throw new Error(`Select at least one file to ${action}`)
  }
}
