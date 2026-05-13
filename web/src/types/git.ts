import type { ParsedDiff } from '@/utils/parseDiff'

export type DiffMode = 'unified' | 'split'
export type Theme = 'light' | 'dark'

export interface FileDiff {
  id: string
  path: string
  parsed: ParsedDiff
  status: 'modified' | 'added' | 'deleted'
}

export interface RepoSummary {
  path: string
  name: string
  branch: string
  branches: string[]
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
