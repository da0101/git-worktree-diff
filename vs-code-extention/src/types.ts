export type FileDiffStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'conflicted'

export type WorkbenchSelection = {
  repoPath: string
  worktreePath?: string
  filePath?: string
  fileStatus?: FileDiffStatus
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
  status: FileDiffStatus
  stagedStatus?: FileDiffStatus
  unstagedStatus?: FileDiffStatus
  oldPath?: string
  rawStatus?: string
  additions: number
  deletions: number
}

export type RepoTarget = {
  repoPath: string
  worktreePath?: string
}

export interface CommitSummary {
  sha: string
  shortSha: string
  authorName: string
  authorEmail: string
  authoredAt: string
  subject: string
}

export type CommitFileSelection = RepoTarget & {
  sha: string
  filePath: string
  fileStatus: FileDiffStatus
}
