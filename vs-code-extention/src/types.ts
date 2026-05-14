export type WorkbenchSelection = {
  repoPath: string
  worktreePath?: string
  filePath?: string
  fileStatus?: FileDiffSummary['status']
}

export interface WorktreeSummary {
  path: string
  branch: string
}

export interface RepoSummary {
  path: string
  name: string
  branch: string
  branches: string[]
  worktrees: WorktreeSummary[]
  changedFiles: number
  additions: number
  deletions: number
  error?: string
}

export interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

export interface GitActionResult {
  output: string
  repos: RepoSummary[]
}

export interface FileDiffSummary {
  path: string
  status: 'modified' | 'added' | 'deleted'
  additions: number
  deletions: number
}

export type RepoTarget = {
  repoPath: string
  worktreePath?: string
}
