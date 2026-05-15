import * as vscode from 'vscode'
import { listCommitFiles, listCommitHistory } from './gitApi'
import type { CommitFileSelection, CommitSummary, FileDiffSummary, RepoTarget } from './types'

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryTreeItem> {
  private readonly changed = new vscode.EventEmitter<HistoryTreeItem | undefined | null | void>()
  readonly onDidChangeTreeData = this.changed.event

  private activeTarget: RepoTarget | undefined
  private activeLabel = ''
  private commitsByPath = new Map<string, CommitSummary[]>()
  private filesByCommit = new Map<string, FileDiffSummary[]>()

  setTarget(target: RepoTarget, label: string) {
    this.activeTarget = target
    this.activeLabel = label
    this.changed.fire()
  }

  refresh() {
    this.commitsByPath.clear()
    this.filesByCommit.clear()
    this.changed.fire()
  }

  getTreeItem(element: HistoryTreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: HistoryTreeItem): Promise<HistoryTreeItem[]> {
    if (!this.activeTarget) {
      return [new HistoryMessageItem('Select a repository, worktree, or changed file to show history.')]
    }

    if (!element) {
      try {
        const commits = await this.getCommits(this.activeTarget)
        if (commits.length === 0) return [new HistoryMessageItem(`No commits found for ${this.activeLabel}.`)]
        return commits.map(commit => new CommitItem(commit, this.activeTarget!, this.activeLabel))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load commit history'
        return [new HistoryMessageItem(message)]
      }
    }

    if (element instanceof CommitItem) {
      const files = await this.getCommitFiles(element.target, element.commit.sha)
      if (files.length === 0) return [new HistoryMessageItem('No changed files in this commit.')]
      return files.map(file => new CommitFileItem(file, {
        ...element.target,
        sha: element.commit.sha,
        filePath: file.path,
        fileStatus: file.status,
      }))
    }

    return []
  }

  private async getCommits(target: RepoTarget) {
    const repoPath = target.worktreePath || target.repoPath
    const cached = this.commitsByPath.get(repoPath)
    if (cached) return cached
    const commits = await listCommitHistory(repoPath)
    this.commitsByPath.set(repoPath, commits)
    return commits
  }

  private async getCommitFiles(target: RepoTarget, sha: string) {
    const repoPath = target.worktreePath || target.repoPath
    const key = `${repoPath}\0${sha}`
    const cached = this.filesByCommit.get(key)
    if (cached) return cached
    const files = await listCommitFiles(repoPath, sha)
    this.filesByCommit.set(key, files)
    return files
  }
}

export type HistoryTreeItem = CommitItem | CommitFileItem | HistoryMessageItem

export class CommitItem extends vscode.TreeItem {
  constructor(readonly commit: CommitSummary, readonly target: RepoTarget, targetLabel: string) {
    super(commit.subject, vscode.TreeItemCollapsibleState.Collapsed)
    this.id = `commit:${target.worktreePath || target.repoPath}:${commit.sha}`
    this.description = `${commit.authorName}  ${formatRelativeTime(commit.authoredAt)}`
    this.tooltip = [
      commit.subject,
      `${commit.authorName} <${commit.authorEmail}>`,
      `${commit.shortSha}  ${formatAbsoluteTime(commit.authoredAt)}`,
      targetLabel,
    ].join('\n')
    this.iconPath = new vscode.ThemeIcon('git-commit')
    this.contextValue = 'history-commit'
    this.command = {
      command: 'gitWorktreeDiff.openCommitDiff',
      title: 'Open Commit Diff',
      arguments: [this],
    }
  }
}

export class CommitFileItem extends vscode.TreeItem {
  constructor(readonly file: FileDiffSummary, readonly selection: CommitFileSelection) {
    super(file.path, vscode.TreeItemCollapsibleState.None)
    this.id = `commit-file:${selection.repoPath}:${selection.worktreePath ?? ''}:${selection.sha}:${file.path}`
    this.description = `${statusLabel(file.status)}  +${file.additions} -${file.deletions}`
    this.tooltip = `${statusTitle(file.status)}\n${file.path}\n+${file.additions} -${file.deletions}`
    this.iconPath = new vscode.ThemeIcon(statusIcon(file.status), statusColor(file.status))
    this.contextValue = `history-file-${file.status}`
    this.command = {
      command: 'gitWorktreeDiff.openCommitFileDiff',
      title: 'Open Commit File Diff',
      arguments: [this],
    }
  }
}

class HistoryMessageItem extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None)
    this.id = `history-message:${message}`
    this.iconPath = new vscode.ThemeIcon('info')
    this.contextValue = 'history-message'
  }
}

function statusIcon(status: FileDiffSummary['status']) {
  if (status === 'added') return 'diff-added'
  if (status === 'deleted') return 'diff-removed'
  return 'diff-modified'
}

function statusColor(status: FileDiffSummary['status']) {
  if (status === 'added') return new vscode.ThemeColor('gitDecoration.addedResourceForeground')
  if (status === 'deleted') return new vscode.ThemeColor('gitDecoration.deletedResourceForeground')
  return new vscode.ThemeColor('gitDecoration.modifiedResourceForeground')
}

function statusLabel(status: FileDiffSummary['status']) {
  if (status === 'added') return 'A'
  if (status === 'deleted') return 'D'
  return 'M'
}

function statusTitle(status: FileDiffSummary['status']) {
  if (status === 'added') return 'Added file'
  if (status === 'deleted') return 'Deleted file'
  return 'Modified file'
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  if (!Number.isFinite(diffMs)) return value

  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  if (days < 14) return `${days}d ago`

  return date.toLocaleDateString()
}

function formatAbsoluteTime(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value
}
