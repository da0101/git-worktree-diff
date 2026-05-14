import path from 'node:path'
import { promises as fs } from 'node:fs'
import { countStatusLines, git, normalizeRepoPath, parseNumstat } from '../lib/git.mjs'
import { httpError } from '../lib/http.mjs'
import { readRepos, writeRepos } from '../store/repo-store.mjs'

export async function summarizeRepo(repo) {
  const name = path.basename(repo.path)

  try {
    const [branch, branches, status, numstat] = await Promise.all([
      git(repo.path, ['branch', '--show-current']),
      git(repo.path, ['branch', '--format=%(refname:short)']),
      git(repo.path, ['status', '--short']),
      git(repo.path, ['diff', 'HEAD', '--numstat', '--']),
    ])
    const totals = parseNumstat(numstat)

    return {
      ...repo,
      name,
      branch: branch || '(detached)',
      branches: branches.split('\n').filter(Boolean),
      changedFiles: countStatusLines(status),
      additions: totals.additions,
      deletions: totals.deletions,
    }
  } catch (error) {
    return {
      ...repo,
      name,
      branch: 'unknown',
      branches: [],
      changedFiles: 0,
      additions: 0,
      deletions: 0,
      error: error instanceof Error ? error.message : 'Unable to read repository',
    }
  }
}

export async function listRepoSummaries() {
  const repos = await expandTrackedRepos(await readRepos())
  return Promise.all(repos.map(summarizeRepo))
}

export async function upsertRepoPath(inputPath) {
  const repoPath = await normalizeRepoPath(inputPath)
  const repos = await readRepos()
  const next = await expandTrackedRepos([...repos.filter(repo => repo.path !== repoPath), { path: repoPath }])
  return Promise.all(next.map(summarizeRepo))
}

export async function removeRepoPath(repoPath) {
  const repos = await readRepos()
  const next = repos.filter(repo => repo.path !== repoPath)
  await writeRepos(next)
  return Promise.all(next.map(summarizeRepo))
}

export async function assertTracked(repoPath) {
  const repos = await expandTrackedRepos(await readRepos())
  if (!repos.some(repo => repo.path === repoPath)) {
    throw httpError('Repository is not tracked', 404)
  }
  return repos
}

async function expandTrackedRepos(repos) {
  const discovered = await Promise.all(repos.map(repo => discoverAgentboardRepoPaths(repo.path)))
  const nextPaths = [...new Set([...repos.map(repo => repo.path), ...discovered.flat()])]
  const currentPaths = repos.map(repo => repo.path)
  const changed = nextPaths.length !== currentPaths.length || nextPaths.some((repoPath, index) => repoPath !== currentPaths[index])
  const next = nextPaths.map(repoPath => ({ path: repoPath }))
  if (changed) await writeRepos(next)
  return next
}

async function discoverAgentboardRepoPaths(repoPath) {
  const reposFile = path.join(repoPath, '.platform', 'repos.md')
  let raw = ''
  try {
    raw = await fs.readFile(reposFile, 'utf8')
  } catch {
    return []
  }

  const candidatePaths = raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('|') && !line.includes('---'))
    .map(line => line.split('|').map(cell => cell.trim()))
    .filter(cells => cells.length >= 5 && cells[2] && cells[2] !== 'Path')
    .map(cells => cells[2].replace(/^`|`$/g, ''))
    .filter(candidate => candidate.startsWith('/') || candidate.startsWith('~/'))

  const normalized = await Promise.all(candidatePaths.map(async candidate => {
    try {
      return await normalizeRepoPath(candidate)
    } catch {
      return null
    }
  }))

  return normalized.filter(Boolean)
}
