import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function git(repoPath, args, options = {}) {
  const { stdout, stderr } = await execFileAsync('git', ['-C', repoPath, ...args], {
    maxBuffer: options.maxBuffer ?? 12 * 1024 * 1024,
    timeout: options.timeout ?? 15_000,
  })
  return (stdout || stderr).trimEnd()
}

export async function runCommand(command, args, options = {}) {
  return execFileAsync(command, args, {
    timeout: options.timeout ?? 30_000,
    maxBuffer: options.maxBuffer ?? 12 * 1024 * 1024,
  })
}

export async function normalizeRepoPath(inputPath) {
  const expanded = inputPath.startsWith('~/')
    ? path.join(homedir(), inputPath.slice(2))
    : inputPath
  const absolute = path.resolve(expanded)
  const real = await fs.realpath(absolute)
  return git(real, ['rev-parse', '--show-toplevel'])
}

export function parseNumstat(numstat) {
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

export function countStatusLines(status) {
  return status.split('\n').filter(Boolean).length
}
