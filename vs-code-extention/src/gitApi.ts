import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import type { CommitSummary, FileDiffSummary, RepoSummary, RepoTarget, WorkbenchSelection, WorktreeSummary } from './types'

const execFileAsync = promisify(execFile)
const storeDir = path.join(homedir(), '.git-worktree-diff')
const storePath = path.join(storeDir, 'repos.json')

export async function listRepos(): Promise<RepoSummary[]> {
  const repos = await expandTrackedRepos(await readRepos())
  return Promise.all(repos.map(summarizeRepo))
}

export async function addRepo(inputPath: string): Promise<void> {
  const repoPath = await normalizeRepoPath(inputPath)
  const repos = await readRepos()
  const next = [...repos.filter(repo => repo.path !== repoPath), { path: repoPath }]
  await writeRepos(next)
}

export async function removeRepo(repoPath: string): Promise<void> {
  const repos = await readRepos()
  await writeRepos(repos.filter(repo => repo.path !== repoPath))
}

export async function listChangedFiles(repoPath: string): Promise<FileDiffSummary[]> {
  const [nameStatus, numstat] = await Promise.all([
    git(repoPath, ['diff', 'HEAD', '--name-status', '--']),
    git(repoPath, ['diff', 'HEAD', '--numstat', '--']),
  ])
  return parseChangedFiles(nameStatus, numstat)
}

export async function listCommitHistory(repoPath: string, limit = 80): Promise<CommitSummary[]> {
  const raw = await git(repoPath, [
    'log',
    `--max-count=${limit}`,
    '--date=iso-strict',
    '--pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%s%x1e',
  ])
  return parseCommitHistory(raw)
}

export async function listCommitFiles(repoPath: string, sha: string): Promise<FileDiffSummary[]> {
  const [nameStatus, numstat] = await Promise.all([
    git(repoPath, ['show', '--format=', '--name-status', '--no-renames', sha, '--']),
    git(repoPath, ['show', '--format=', '--numstat', '--no-renames', sha, '--']),
  ])
  return parseChangedFiles(nameStatus, numstat)
}

export async function checkoutBranch(repoPath: string, branch: string): Promise<string> {
  return git(repoPath, ['checkout', branch])
}

export async function listBranches(repoPath: string): Promise<string[]> {
  const branches = await git(repoPath, [
    'for-each-ref',
    '--format=%(refname:short)',
    'refs/heads',
    'refs/remotes',
  ])
  return branches
    .split('\n')
    .map(branch => branch.trim())
    .filter(branch => branch && !branch.endsWith('/HEAD'))
}

export async function runRepoAction(
  action: 'fetch' | 'pull' | 'push' | 'rebase' | 'stageAll' | 'unstageAll' | 'stash',
  target: RepoTarget,
  options: { branch?: string; remote?: string; message?: string } = {},
): Promise<string> {
  const repoPath = target.worktreePath || target.repoPath
  const remote = options.remote || 'origin'

  if (action === 'fetch') return git(repoPath, ['fetch', remote, '--prune'])
  if (action === 'pull') return git(repoPath, ['pull', '--ff-only'])
  if (action === 'push') return git(repoPath, ['push', remote, 'HEAD'])
  if (action === 'stageAll') return git(repoPath, ['add', '--all'])
  if (action === 'unstageAll') return git(repoPath, ['restore', '--staged', '--', '.'])
  if (action === 'stash') return git(repoPath, ['stash', 'push', '-u', '-m', options.message || 'Git Worktree Diff stash'])
  if (action === 'rebase') {
    if (!options.branch) throw new Error('Target branch is required')
    return git(repoPath, ['rebase', options.branch])
  }

  throw new Error(`Unsupported action: ${action}`)
}

export async function runFileAction(action: 'stage' | 'unstage' | 'reject', selection: WorkbenchSelection): Promise<string> {
  if (!selection.filePath) {
    throw new Error('No file selected')
  }

  const repoPath = selection.worktreePath || selection.repoPath
  if (action === 'stage') return git(repoPath, ['add', '--', selection.filePath])
  if (action === 'unstage') return git(repoPath, ['restore', '--staged', '--', selection.filePath])
  return git(repoPath, ['restore', '--staged', '--worktree', '--', selection.filePath])
}

export async function commitFiles(repoPath: string, files: string[], message: string, body?: string): Promise<string> {
  if (files.length === 0) throw new Error('No changed files to commit')
  if (!message.trim()) throw new Error('Commit message is required')
  return git(repoPath, buildCommitArgs(files, message, body))
}

export async function amendCommit(target: RepoTarget, message?: string, body?: string, files?: string[]): Promise<string> {
  const repoPath = target.worktreePath || target.repoPath
  return git(repoPath, buildAmendArgs(message, body, files))
}

export function buildCommitArgs(files: string[], message: string, body?: string) {
  const args = body?.trim()
    ? ['commit', '--only', '-m', message.trim(), '-m', body.trim()]
    : ['commit', '--only', '-m', message.trim()]
  return [...args, '--', ...files]
}

export function buildAmendArgs(message?: string, body?: string, files?: string[]) {
  const args = message?.trim()
    ? body?.trim()
      ? ['commit', '--amend', '-m', message.trim(), '-m', body.trim()]
      : ['commit', '--amend', '-m', message.trim()]
    : ['commit', '--amend', '--no-edit']

  return files?.length ? [...args, '--only', '--', ...files] : args
}

export async function addPathToGitignore(selection: WorkbenchSelection): Promise<void> {
  if (!selection.filePath) throw new Error('No file selected')
  const repoPath = selection.worktreePath || selection.repoPath
  const ignorePath = path.join(repoPath, '.gitignore')
  const entry = `/${selection.filePath}\n`

  let current = ''
  try {
    current = await fs.readFile(ignorePath, 'utf8')
  } catch {
    current = ''
  }

  const entries = new Set(current.split('\n').map(line => line.trim()).filter(Boolean))
  if (entries.has(`/${selection.filePath}`) || entries.has(selection.filePath)) return

  const prefix = current && !current.endsWith('\n') ? '\n' : ''
  await fs.writeFile(ignorePath, `${current}${prefix}${entry}`)
}

export async function git(repoPath: string, args: string[], options: { maxBuffer?: number; timeout?: number } = {}) {
  const { stdout, stderr } = await execFileAsync('git', ['-C', repoPath, ...args], {
    maxBuffer: options.maxBuffer ?? 12 * 1024 * 1024,
    timeout: options.timeout ?? 15_000,
  })
  return (stdout || stderr).trimEnd()
}

async function summarizeRepo(repo: { path: string }): Promise<RepoSummary> {
  const name = path.basename(repo.path)

  try {
    const [branch, branches, status, numstat, worktreeRaw] = await Promise.all([
      git(repo.path, ['branch', '--show-current']),
      listBranches(repo.path),
      git(repo.path, ['status', '--short']),
      git(repo.path, ['diff', 'HEAD', '--numstat', '--']),
      git(repo.path, ['worktree', 'list', '--porcelain']),
    ])
    const totals = parseNumstat(numstat)

    return {
      ...repo,
      name,
      branch: branch || '(detached)',
      branches,
      worktrees: parseWorktrees(worktreeRaw),
      changedFiles: status.split('\n').filter(Boolean).length,
      additions: totals.additions,
      deletions: totals.deletions,
    }
  } catch (error) {
    return {
      ...repo,
      name,
      branch: 'unknown',
      branches: [],
      worktrees: [],
      changedFiles: 0,
      additions: 0,
      deletions: 0,
      error: error instanceof Error ? error.message : 'Unable to read repository',
    }
  }
}

async function readRepos(): Promise<Array<{ path: string }>> {
  try {
    const raw = await fs.readFile(storePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((repo): repo is { path: string } => typeof repo?.path === 'string' && repo.path.trim().length > 0)
      : []
  } catch {
    return []
  }
}

async function writeRepos(repos: Array<{ path: string }>) {
  await fs.mkdir(storeDir, { recursive: true })
  await fs.writeFile(storePath, `${JSON.stringify(repos, null, 2)}\n`)
}

async function normalizeRepoPath(inputPath: string) {
  const expanded = inputPath.startsWith('~/')
    ? path.join(homedir(), inputPath.slice(2))
    : inputPath
  const absolute = path.resolve(expanded)
  const real = await fs.realpath(absolute)
  return git(real, ['rev-parse', '--show-toplevel'])
}

async function expandTrackedRepos(repos: Array<{ path: string }>) {
  const discovered = await Promise.all(repos.map(repo => discoverAgentboardRepoPaths(repo.path)))
  const nextPaths = [...new Set([...repos.map(repo => repo.path), ...discovered.flat()])]
  const currentPaths = repos.map(repo => repo.path)
  const changed = nextPaths.length !== currentPaths.length || nextPaths.some((repoPath, index) => repoPath !== currentPaths[index])
  const next = nextPaths.map(repoPath => ({ path: repoPath }))
  if (changed) await writeRepos(next)
  return next
}

async function discoverAgentboardRepoPaths(repoPath: string) {
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

  return normalized.filter((repoPath): repoPath is string => Boolean(repoPath))
}

export function parseChangedFiles(nameStatus: string, numstat: string): FileDiffSummary[] {
  const totals = new Map<string, { additions: number; deletions: number }>()
  for (const line of numstat.split('\n').filter(Boolean)) {
    const [rawAdditions, rawDeletions, ...pathParts] = line.split('\t')
    const filePath = pathParts[pathParts.length - 1] ?? ''
    totals.set(filePath, {
      additions: rawAdditions === '-' ? 0 : Number(rawAdditions) || 0,
      deletions: rawDeletions === '-' ? 0 : Number(rawDeletions) || 0,
    })
  }

  return nameStatus.split('\n').filter(Boolean).map(line => {
    const [rawStatus, ...pathParts] = line.split('\t')
    const filePath = pathParts[pathParts.length - 1] ?? ''
    const total = totals.get(filePath) ?? { additions: 0, deletions: 0 }
    return {
      path: filePath,
      status: parseStatus(rawStatus),
      additions: total.additions,
      deletions: total.deletions,
    }
  })
}

export function parseStatus(rawStatus: string): FileDiffSummary['status'] {
  if (rawStatus.startsWith('A')) return 'added'
  if (rawStatus.startsWith('D')) return 'deleted'
  return 'modified'
}

export function parseNumstat(numstat: string) {
  return numstat.split('\n').filter(Boolean).reduce(
    (acc, line) => {
      const [additions, deletions] = line.split('\t')
      return {
        additions: acc.additions + (additions === '-' ? 0 : Number(additions) || 0),
        deletions: acc.deletions + (deletions === '-' ? 0 : Number(deletions) || 0),
      }
    },
    { additions: 0, deletions: 0 },
  )
}

export function parseCommitHistory(raw: string): CommitSummary[] {
  return raw.split('\x1e').map(entry => entry.trim()).filter(Boolean).map(entry => {
    const [sha = '', shortSha = '', authorName = '', authorEmail = '', authoredAt = '', subject = ''] = entry.split('\x1f')
    return {
      sha,
      shortSha,
      authorName,
      authorEmail,
      authoredAt,
      subject,
    }
  }).filter(commit => commit.sha && commit.subject)
}

export function parseWorktrees(raw: string): WorktreeSummary[] {
  return raw.trim().split('\n\n').filter(Boolean).map(block => {
    const entries = Object.fromEntries(
      block.split('\n').filter(Boolean).map(line => {
        const spaceIdx = line.indexOf(' ')
        return [line.slice(0, spaceIdx), line.slice(spaceIdx + 1)]
      }),
    )
    return {
      path: entries['worktree'],
      branch: entries['branch']?.replace('refs/heads/', '') ?? '(detached)',
    }
  }).filter((worktree): worktree is WorktreeSummary => Boolean(worktree.path))
}
