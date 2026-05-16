import * as vscode from 'vscode'
import { treeDecorationScheme } from './fileDecorations'
import { listChangedFiles, listRepos } from './gitApi'
import type { FileDiffSummary, RepoSummary, RepoTarget, WorkbenchSelection, WorktreeSummary } from './types'

export class RepoTreeProvider implements vscode.TreeDataProvider<RepoTreeItem> {
  private readonly changed = new vscode.EventEmitter<RepoTreeItem | undefined | null | void>()
  readonly onDidChangeTreeData = this.changed.event
  private readonly selectionChanged = new vscode.EventEmitter<SelectionSummary>()
  readonly onDidChangeSelection = this.selectionChanged.event

  private repos: RepoSummary[] = []
  private knownRepoItems: RepoItem[] = []
  private filesByPath = new Map<string, FileDiffSummary[]>()
  private selectedFiles = new Map<string, WorkbenchSelection>()

  refresh() {
    this.filesByPath.clear()
    this.pruneSelection()
    this.changed.fire(undefined)
    for (const item of this.knownRepoItems) {
      this.changed.fire(item)
    }
    this.emitSelectionChanged()
  }

  getTreeItem(element: RepoTreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: RepoTreeItem): Promise<RepoTreeItem[]> {
    if (!element) {
      this.repos = await listRepos()
      this.knownRepoItems = this.repos.map(repo => new RepoItem(repo))
      return this.knownRepoItems
    }

    if (element instanceof RepoItem) {
      const worktrees = normalizeWorktrees(element.repo)
      if (worktrees.length > 1) {
        return worktrees.map(worktree => new WorktreeItem(element.repo, worktree))
      }
      return this.getFileItems(element.repo.path, { repoPath: element.repo.path })
    }

    if (element instanceof WorktreeItem) {
      return this.getFileItems(element.worktree.path, {
        repoPath: element.repo.path,
        worktreePath: element.worktree.path,
      })
    }

    return []
  }

  private async getFileItems(diffPath: string, selection: WorkbenchSelection) {
    const files = await this.getChangedFilesForPath(diffPath)

    return files.map(file => new FileItem(file, {
      ...selection,
      filePath: file.path,
      fileStatus: file.status,
    }, this.isSelected({
      ...selection,
      filePath: file.path,
      fileStatus: file.status,
    })))
  }

  async getChangedFilesForPath(repoPath: string) {
    const files = await listChangedFiles(repoPath)
    this.filesByPath.set(repoPath, files)
    return files
  }

  setFileSelected(selection: WorkbenchSelection, checked: boolean) {
    if (!selection.filePath) return
    const key = selectionKey(selection)
    if (checked) this.selectedFiles.set(key, selection)
    else this.selectedFiles.delete(key)
    this.changed.fire()
    this.emitSelectionChanged()
  }

  async selectAll(target?: RepoTarget) {
    const repos = this.repos.length > 0 ? this.repos : await listRepos()
    const targets = target ? [target] : repos.flatMap(repo => normalizeWorktrees(repo).map(worktree => ({
      repoPath: repo.path,
      worktreePath: worktree.path,
    })))

    this.selectedFiles.clear()

    for (const selectionTarget of targets) {
      const repoPath = selectionTarget.worktreePath || selectionTarget.repoPath
      const files = await this.getChangedFilesForPath(repoPath)
      for (const file of files) {
        const selection = {
          repoPath: selectionTarget.repoPath,
          worktreePath: selectionTarget.worktreePath,
          filePath: file.path,
          fileStatus: file.status,
        }
        this.selectedFiles.set(selectionKey(selection), selection)
      }
    }

    this.changed.fire()
    this.emitSelectionChanged()
  }

  clearSelection() {
    this.selectedFiles.clear()
    this.changed.fire()
    this.emitSelectionChanged()
  }

  getSelectedFiles() {
    return [...this.selectedFiles.values()]
  }

  getSelectionSummary(): SelectionSummary {
    const files = this.getSelectedFiles()
    return {
      selectedFiles: files.length,
      repositories: new Set(files.map(file => file.worktreePath || file.repoPath)).size,
    }
  }

  getBranchesForTarget(target?: RepoTarget) {
    if (!target) return []
    const repo = this.repos.find(repo => repo.path === target.repoPath)
    if (!repo) return []
    const activeBranch = target.worktreePath
      ? repo.worktrees.find(worktree => worktree.path === target.worktreePath)?.branch
      : repo.branch
    return repo.branches.filter(branch => branch !== activeBranch)
  }

  getCheckoutBranchesForTarget(target?: RepoTarget) {
    if (!target) return []
    const repo = this.repos.find(repo => repo.path === target.repoPath)
    if (!repo || !isMainRepoTarget(repo, target)) return []
    return repo.branches
  }

  getCheckoutCurrentBranch(target?: RepoTarget) {
    if (!target) return ''
    const repo = this.repos.find(repo => repo.path === target.repoPath)
    if (!repo || !isMainRepoTarget(repo, target)) return ''
    return repo.branch
  }

  canCheckoutBranch(target?: RepoTarget) {
    if (!target) return false
    const repo = this.repos.find(repo => repo.path === target.repoPath)
    return Boolean(repo && isMainRepoTarget(repo, target))
  }

  private isSelected(selection: WorkbenchSelection) {
    return this.selectedFiles.has(selectionKey(selection))
  }

  private pruneSelection() {
    const knownDiffPaths = new Set(this.filesByPath.keys())
    if (knownDiffPaths.size === 0) return

    for (const [key, selection] of this.selectedFiles) {
      const repoPath = selection.worktreePath || selection.repoPath
      const files = this.filesByPath.get(repoPath)
      if (files && !files.some(file => file.path === selection.filePath)) {
        this.selectedFiles.delete(key)
      }
    }
  }

  private emitSelectionChanged() {
    this.selectionChanged.fire(this.getSelectionSummary())
  }
}

export type RepoTreeItem = RepoItem | WorktreeItem | FileItem

export class RepoItem extends vscode.TreeItem {
  readonly target: RepoTarget

  constructor(readonly repo: RepoSummary) {
    super(repo.name, vscode.TreeItemCollapsibleState.Collapsed)
    this.target = { repoPath: repo.path }
    this.id = `repo:${repo.path}`
    this.description = [repo.branch, syncLabel(repo), repo.changedFiles > 0 ? String(repo.changedFiles) : ''].filter(Boolean).join('  ')
    this.tooltip = repoTooltip(repo)
    this.iconPath = new vscode.ThemeIcon('repo')
    this.resourceUri = vscode.Uri.file(repo.path)
    this.contextValue = 'repo'
  }
}

export class WorktreeItem extends vscode.TreeItem {
  readonly target: RepoTarget

  constructor(readonly repo: RepoSummary, readonly worktree: WorktreeSummary) {
    super(worktree.branch || 'detached', vscode.TreeItemCollapsibleState.Collapsed)
    this.target = { repoPath: repo.path, worktreePath: worktree.path }
    this.id = `worktree:${repo.path}:${worktree.path}`
    this.description = [baseName(worktree.path), syncLabel(worktree)].filter(Boolean).join('  ')
    this.tooltip = worktreeTooltip(worktree)
    this.iconPath = new vscode.ThemeIcon('git-branch')
    this.resourceUri = vscode.Uri.file(worktree.path)
    this.contextValue = worktree.path === repo.path ? 'main-worktree' : 'worktree'
  }
}

export class FileItem extends vscode.TreeItem {
  constructor(readonly file: FileDiffSummary, readonly selection: WorkbenchSelection, selected: boolean) {
    super(file.path, vscode.TreeItemCollapsibleState.None)
    this.id = `file:${selection.repoPath}:${selection.worktreePath ?? ''}:${file.path}`
    this.description = `${changeStateLabel(file)}  +${file.additions} -${file.deletions}`
    this.tooltip = `${changeStateTitle(file)}\n${file.path}\n+${file.additions} -${file.deletions}`
    this.iconPath = new vscode.ThemeIcon(statusIcon(file.status), statusColor(file.status))
    this.resourceUri = decoratedFileUri(selection, file)
    this.contextValue = `file-${file.status}`
    this.checkboxState = {
      state: selected ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked,
      tooltip: selected ? 'Selected for Git actions' : 'Select for Git actions',
    }
    this.command = {
      command: 'gitWorktreeDiff.openNativeDiff',
      title: 'Open Native Diff',
      arguments: [selection],
    }
  }
}

function normalizeWorktrees(repo: RepoSummary) {
  if (repo.worktrees.length > 0) return repo.worktrees
  return [{ path: repo.path, branch: repo.branch }]
}

function isMainRepoTarget(repo: RepoSummary, target: RepoTarget) {
  return !target.worktreePath || target.worktreePath === repo.path
}

function statusIcon(status: FileDiffSummary['status']) {
  if (status === 'added') return 'diff-added'
  if (status === 'untracked') return 'diff-added'
  if (status === 'deleted') return 'diff-removed'
  if (status === 'conflicted') return 'warning'
  return 'diff-modified'
}

function statusColor(status: FileDiffSummary['status']) {
  if (status === 'added') return new vscode.ThemeColor('gitDecoration.addedResourceForeground')
  if (status === 'untracked') return new vscode.ThemeColor('gitDecoration.untrackedResourceForeground')
  if (status === 'deleted') return new vscode.ThemeColor('gitDecoration.deletedResourceForeground')
  if (status === 'conflicted') return new vscode.ThemeColor('gitDecoration.conflictingResourceForeground')
  return new vscode.ThemeColor('gitDecoration.modifiedResourceForeground')
}

function statusLabel(status: FileDiffSummary['status']) {
  if (status === 'added') return 'A'
  if (status === 'untracked') return '?'
  if (status === 'deleted') return 'D'
  if (status === 'conflicted') return '!'
  return 'M'
}

function statusTitle(status: FileDiffSummary['status']) {
  if (status === 'added') return 'Added file'
  if (status === 'untracked') return 'Untracked file'
  if (status === 'deleted') return 'Deleted file'
  if (status === 'conflicted') return 'Conflicted file'
  return 'Modified file'
}

function changeStateLabel(file: FileDiffSummary) {
  const staged = file.stagedStatus ? `${statusLabel(file.stagedStatus)} staged` : ''
  const unstaged = file.unstagedStatus ? `${statusLabel(file.unstagedStatus)} unstaged` : ''
  return [staged, unstaged].filter(Boolean).join(' / ') || statusLabel(file.status)
}

function changeStateTitle(file: FileDiffSummary) {
  const staged = file.stagedStatus ? `${statusTitle(file.stagedStatus)} staged` : ''
  const unstaged = file.unstagedStatus ? `${statusTitle(file.unstagedStatus)} unstaged` : ''
  return [staged, unstaged].filter(Boolean).join('\n') || statusTitle(file.status)
}

function decoratedFileUri(selection: WorkbenchSelection, file: FileDiffSummary) {
  const basePath = selection.worktreePath || selection.repoPath
  return vscode.Uri.from({
    scheme: treeDecorationScheme,
    path: `/${encodeURIComponent(`${basePath}/${file.path}`)}`,
    query: `status=${encodeURIComponent(file.status)}`,
  })
}

function baseName(value: string) {
  return value.split('/').filter(Boolean).pop() ?? value
}

function syncLabel(target: { ahead?: number; behind?: number }) {
  const parts = []
  if (target.ahead) parts.push(`↑${target.ahead}`)
  if (target.behind) parts.push(`↓${target.behind}`)
  return parts.join(' ')
}

function repoTooltip(repo: RepoSummary) {
  return [
    repo.path,
    `${repo.changedFiles} changed files`,
    repo.upstream ? `Upstream: ${repo.upstream}` : 'No upstream branch',
    syncTooltip(repo),
  ].filter(Boolean).join('\n')
}

function worktreeTooltip(worktree: WorktreeSummary) {
  return [
    worktree.path,
    worktree.upstream ? `Upstream: ${worktree.upstream}` : '',
    syncTooltip(worktree),
  ].filter(Boolean).join('\n')
}

function syncTooltip(target: { ahead?: number; behind?: number }) {
  const ahead = target.ahead ?? 0
  const behind = target.behind ?? 0
  if (ahead === 0 && behind === 0) return ''
  return `${ahead} commit${ahead === 1 ? '' : 's'} to push, ${behind} commit${behind === 1 ? '' : 's'} to pull`
}

function selectionKey(selection: WorkbenchSelection) {
  return `${selection.repoPath}\0${selection.worktreePath ?? ''}\0${selection.filePath ?? ''}`
}

export type SelectionSummary = {
  selectedFiles: number
  repositories: number
}
