import { git, runCommand } from '../lib/git.mjs'
import { bodyString, readJsonBody, send, sendError } from '../lib/http.mjs'
import {
  assertTracked,
  listRepoSummaries,
  removeRepoPath,
  summarizeRepo,
  upsertRepoPath,
} from '../services/repo-service.mjs'

export async function listRepos(_req, res) {
  send(res, 200, { ok: true, data: await listRepoSummaries() })
}

export async function addRepo(req, res) {
  const body = await readJsonBody(req)
  const inputPath = bodyString(body, 'path')
  if (!inputPath) {
    send(res, 400, { ok: false, error: 'Repository path is required' })
    return
  }

  try {
    send(res, 200, { ok: true, data: await upsertRepoPath(inputPath) })
  } catch {
    send(res, 400, { ok: false, error: 'Path is not a readable Git repository' })
  }
}

export async function pickRepo(_req, res) {
  try {
    const pickedPath = await runCommand('osascript', [
      '-e',
      'POSIX path of (choose folder with prompt "Choose a Git repository to track")',
    ], {
      timeout: 120_000,
    })
    send(res, 200, { ok: true, data: await upsertRepoPath(pickedPath.stdout.trim()) })
  } catch (error) {
    const message = error instanceof Error && error.message.includes('User canceled')
      ? 'Folder picker was cancelled'
      : 'Selected folder is not a readable Git repository'
    send(res, 400, { ok: false, error: message })
  }
}

export async function removeRepo(req, res, url) {
  const repoPath = url.searchParams.get('path')
  if (!repoPath) {
    send(res, 400, { ok: false, error: 'Repository path is required' })
    return
  }

  send(res, 200, { ok: true, data: await removeRepoPath(repoPath) })
}

export async function repoDiff(_req, res, url) {
  const repoPath = url.searchParams.get('path')
  if (!repoPath) {
    send(res, 400, { ok: false, error: 'Repository path is required' })
    return
  }

  try {
    await assertTracked(repoPath)
    const diff = await git(repoPath, ['diff', 'HEAD', '--'])
    send(res, 200, { ok: true, data: { path: repoPath, diff } })
  } catch (error) {
    sendError(res, error, 'Unable to read repository diff')
  }
}

export async function repoStatus(_req, res, url) {
  const repoPath = url.searchParams.get('path')
  if (!repoPath) {
    send(res, 400, { ok: false, error: 'Repository path is required' })
    return
  }

  try {
    await assertTracked(repoPath)
    const status = await git(repoPath, ['status', '--porcelain=v1'])
    const files = status.split('\n').filter(Boolean).map(line => ({
      code: line.slice(0, 2),
      path: line.slice(3),
    }))
    send(res, 200, { ok: true, data: { path: repoPath, files } })
  } catch (error) {
    sendError(res, error, 'Unable to read repository status')
  }
}

export async function checkoutBranch(req, res) {
  const body = await readJsonBody(req)
  const repoPath = bodyString(body, 'path')
  const branch = bodyString(body, 'branch')

  if (!repoPath || !branch) {
    send(res, 400, { ok: false, error: 'Repository path and branch are required' })
    return
  }

  try {
    const repos = await assertTracked(repoPath)
    const branchNames = (await git(repoPath, ['branch', '--format=%(refname:short)']))
      .split('\n')
      .filter(Boolean)

    if (!branchNames.includes(branch)) {
      send(res, 400, { ok: false, error: 'Branch is not available in this repository' })
      return
    }

    await git(repoPath, ['switch', branch])
    const summaries = await Promise.all(repos.map(summarizeRepo))
    send(res, 200, { ok: true, data: summaries })
  } catch {
    send(res, 409, { ok: false, error: 'Unable to switch branch. Commit or stash conflicting changes first.' })
  }
}
