import path from 'node:path'
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
  const repos = await readRepos()
  return Promise.all(repos.map(summarizeRepo))
}

export async function upsertRepoPath(inputPath) {
  const repoPath = await normalizeRepoPath(inputPath)
  const repos = await readRepos()
  const next = [
    ...repos.filter(repo => repo.path !== repoPath),
    { path: repoPath },
  ]
  await writeRepos(next)
  return Promise.all(next.map(summarizeRepo))
}

export async function removeRepoPath(repoPath) {
  const repos = await readRepos()
  const next = repos.filter(repo => repo.path !== repoPath)
  await writeRepos(next)
  return Promise.all(next.map(summarizeRepo))
}

export async function assertTracked(repoPath) {
  const repos = await readRepos()
  if (!repos.some(repo => repo.path === repoPath)) {
    throw httpError('Repository is not tracked', 404)
  }
  return repos
}
