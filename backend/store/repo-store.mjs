import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const storeDir = path.join(homedir(), '.git-worktree-diff')
const storePath = path.join(storeDir, 'repos.json')

export async function readRepos() {
  try {
    const raw = await fs.readFile(storePath, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter(repo => typeof repo.path === 'string' && repo.path.trim())
      : []
  } catch {
    return []
  }
}

export async function writeRepos(repos) {
  await fs.mkdir(storeDir, { recursive: true })
  await fs.writeFile(storePath, `${JSON.stringify(repos, null, 2)}\n`)
}
