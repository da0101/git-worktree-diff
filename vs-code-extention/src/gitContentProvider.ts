import { promises as fs } from 'node:fs'
import path from 'node:path'
import * as vscode from 'vscode'
import { git } from './gitApi'
import type { CommitFileSelection, CommitSummary, RepoTarget, WorkbenchSelection } from './types'

const SCHEME = 'git-worktree-diff'

export class GitContentProvider implements vscode.TextDocumentContentProvider {
  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const params = new URLSearchParams(uri.query)
    const side = params.get('side')
    const repoPath = params.get('repoPath') ?? ''
    const worktreePath = params.get('worktreePath') || repoPath
    const filePath = params.get('filePath') ?? ''
    const sha = params.get('sha') ?? ''

    if (!repoPath) return ''
    if (side === 'commit-patch') {
      if (!sha) return ''
      return git(worktreePath, ['show', '--stat', '--patch', '--find-renames', '--date=local', sha], {
        maxBuffer: 24 * 1024 * 1024,
        timeout: 15_000,
      })
    }

    if (!filePath) return ''
    if (side === 'empty') return ''
    if (side === 'working') {
      return fs.readFile(path.join(worktreePath, filePath), 'utf8')
    }
    if (side === 'commit-parent' || side === 'commit-file') {
      if (!sha) return ''
      const ref = side === 'commit-parent' ? `${sha}^` : sha
      try {
        return await git(worktreePath, ['show', `${ref}:${filePath}`], {
          maxBuffer: 12 * 1024 * 1024,
          timeout: 15_000,
        })
      } catch {
        return ''
      }
    }

    try {
      return await git(worktreePath, ['show', `HEAD:${filePath}`], {
        maxBuffer: 12 * 1024 * 1024,
        timeout: 15_000,
      })
    } catch {
      return ''
    }
  }
}

export async function openNativeDiff(selection: WorkbenchSelection) {
  if (!selection.filePath) {
    await vscode.window.showWarningMessage('Select a changed file to open a native diff.')
    return
  }

  const worktreePath = selection.worktreePath || selection.repoPath
  const left = selection.fileStatus === 'added'
    ? virtualUri(selection, 'empty')
    : virtualUri(selection, 'head')
  const right = selection.fileStatus === 'deleted'
    ? virtualUri(selection, 'empty')
    : vscode.Uri.file(path.join(worktreePath, selection.filePath))

  await vscode.commands.executeCommand(
    'vscode.diff',
    left,
    right,
    `${selection.filePath} (HEAD ↔ Working Tree)`,
  )
}

export async function openCommitDiff(commit: CommitSummary, target: RepoTarget) {
  const document = await vscode.workspace.openTextDocument(commitPatchUri(commit, target))
  await vscode.window.showTextDocument(document, { preview: true })
}

export async function openCommitFileDiff(selection: CommitFileSelection) {
  if (!selection.filePath) {
    await vscode.window.showWarningMessage('Select a commit file to open its diff.')
    return
  }

  const left = selection.fileStatus === 'added'
    ? virtualCommitFileUri(selection, 'empty')
    : virtualCommitFileUri(selection, 'commit-parent')
  const right = selection.fileStatus === 'deleted'
    ? virtualCommitFileUri(selection, 'empty')
    : virtualCommitFileUri(selection, 'commit-file')

  await vscode.commands.executeCommand(
    'vscode.diff',
    left,
    right,
    `${selection.filePath} (${selection.sha.slice(0, 7)} commit)`,
  )
}

function virtualUri(selection: WorkbenchSelection, side: 'head' | 'empty' | 'working') {
  const params = new URLSearchParams({
    side,
    repoPath: selection.repoPath,
    worktreePath: selection.worktreePath || '',
    filePath: selection.filePath || '',
  })

  return vscode.Uri.from({
    scheme: SCHEME,
    path: `/${selection.filePath || 'empty'}`,
    query: params.toString(),
  })
}

function virtualCommitFileUri(selection: CommitFileSelection, side: 'commit-parent' | 'commit-file' | 'empty') {
  const params = new URLSearchParams({
    side,
    repoPath: selection.repoPath,
    worktreePath: selection.worktreePath || '',
    filePath: selection.filePath,
    sha: selection.sha,
  })

  return vscode.Uri.from({
    scheme: SCHEME,
    path: `/${selection.sha.slice(0, 7)}/${selection.filePath}`,
    query: params.toString(),
  })
}

function commitPatchUri(commit: CommitSummary, target: RepoTarget) {
  const params = new URLSearchParams({
    side: 'commit-patch',
    repoPath: target.repoPath,
    worktreePath: target.worktreePath || '',
    sha: commit.sha,
  })

  return vscode.Uri.from({
    scheme: SCHEME,
    path: `/${commit.shortSha || commit.sha.slice(0, 7)}.diff`,
    query: params.toString(),
  })
}

export const gitContentScheme = SCHEME
