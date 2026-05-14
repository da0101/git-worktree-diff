import * as vscode from 'vscode'
import type { FileDiffSummary } from './types'

export const treeDecorationScheme = 'git-worktree-diff-tree'

export class GitWorktreeDiffDecorationProvider implements vscode.FileDecorationProvider {
  private readonly changed = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>()
  readonly onDidChangeFileDecorations = this.changed.event

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (uri.scheme !== treeDecorationScheme) return undefined

    const params = new URLSearchParams(uri.query)
    const status = params.get('status') as FileDiffSummary['status'] | null
    if (status === 'added') {
      return new vscode.FileDecoration(
        'A',
        'Added file',
        new vscode.ThemeColor('gitDecoration.addedResourceForeground'),
      )
    }

    if (status === 'deleted') {
      return new vscode.FileDecoration(
        'D',
        'Deleted file',
        new vscode.ThemeColor('gitDecoration.deletedResourceForeground'),
      )
    }

    if (status === 'modified') {
      return new vscode.FileDecoration(
        'M',
        'Modified file',
        new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'),
      )
    }

    return undefined
  }

  refresh() {
    this.changed.fire(undefined)
  }
}
