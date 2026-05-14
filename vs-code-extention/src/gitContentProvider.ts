import { promises as fs } from 'node:fs'
import path from 'node:path'
import * as vscode from 'vscode'
import { git } from './gitApi'
import type { WorkbenchSelection } from './types'

const SCHEME = 'git-worktree-diff'

export class GitContentProvider implements vscode.TextDocumentContentProvider {
  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const params = new URLSearchParams(uri.query)
    const side = params.get('side')
    const repoPath = params.get('repoPath') ?? ''
    const worktreePath = params.get('worktreePath') || repoPath
    const filePath = params.get('filePath') ?? ''

    if (!repoPath || !filePath) return ''
    if (side === 'empty') return ''
    if (side === 'working') {
      return fs.readFile(path.join(worktreePath, filePath), 'utf8')
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

export const gitContentScheme = SCHEME
