import * as vscode from 'vscode'
import { ActionPanelProvider, type TerminalOption } from './actionPanel'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { buildTerminalOptions, chooseAgentSelectionsForTreeCommand, getProcessTreeCommands } from './agentUtils'
import { GitWorktreeDiffDecorationProvider } from './fileDecorations'
import { addPathToGitignore, addRepo, amendCommit, checkoutBranch, commitFiles, removeRepo, runFileAction, runRepoAction } from './gitApi'
import { GitContentProvider, gitContentScheme, openCommitDiff, openCommitFileDiff, openNativeDiff } from './gitContentProvider'
import { CommitFileItem, CommitItem, HistoryTreeProvider } from './historyTree'
import { FileItem, RepoItem, RepoTreeProvider, WorktreeItem } from './repoTree'
import type { RepoTarget, WorkbenchSelection } from './types'

export function activate(context: vscode.ExtensionContext) {
  const treeProvider = new RepoTreeProvider()
  const historyProvider = new HistoryTreeProvider()
  const decorationProvider = new GitWorktreeDiffDecorationProvider()
  let activeTarget: RepoTarget | undefined
  let explicitAgentContext: AgentContext | undefined
  const treeView = vscode.window.createTreeView('gitWorktreeDiff.sidebar', {
    treeDataProvider: treeProvider,
    manageCheckboxStateManually: true,
  })
  const historyView = vscode.window.createTreeView('gitWorktreeDiff.history', {
    treeDataProvider: historyProvider,
  })
  const actionPanel = new ActionPanelProvider(
    context.extensionUri,
    treeProvider,
    () => getTerminalOptions(context),
    () => getBranchOptions(treeProvider, activeTarget),
    () => getCheckoutBranchOptions(treeProvider, activeTarget),
    () => getCheckoutCurrentBranch(treeProvider, activeTarget),
    () => canCheckoutBranch(treeProvider, activeTarget),
    () => hasCheckoutTarget(treeProvider, activeTarget),
    async message => {
      if (message.type === 'selectAll') await treeProvider.selectAll(activeTarget)
      if (message.type === 'clearSelection') {
        explicitAgentContext = undefined
        treeProvider.clearSelection()
        actionPanel.clearAgentContext()
      }
      if (message.type === 'checkoutActive') await checkoutPanelTarget(activeTarget, treeProvider, message.branch)
      if (message.type === 'stageSelected') await runSelectedFileAction('stage', treeProvider)
      if (message.type === 'unstageSelected') await runSelectedFileAction('unstage', treeProvider)
      if (message.type === 'discardSelected') await runSelectedFileAction('reject', treeProvider)
      if (message.type === 'ignoreSelected') await addSelectedToGitignore(treeProvider)
      if (message.type === 'commitSelected') await commitSelectedFiles(treeProvider, message.summary, message.description)
      if (message.type === 'amendSelected') await amendWithSelectedFiles(treeProvider, message.summary, message.description)
      if (message.type === 'fetchActive') await runPanelRepoAction('fetch', activeTarget, treeProvider)
      if (message.type === 'pullActive') await runPanelRepoAction('pull', activeTarget, treeProvider)
      if (message.type === 'pushActive') await runPanelRepoAction('push', activeTarget, treeProvider)
      if (message.type === 'stashActive') await stashPanelTarget(activeTarget, treeProvider, message.message)
      if (message.type === 'rebaseActive') await rebasePanelTarget(activeTarget, treeProvider, message.branch)
      if (message.type === 'sendAgent') {
        const agentContext = explicitAgentContext ?? await buildChangedFilesAgentContext(treeProvider.getSelectedFiles())
        const sent = await sendAgentContext(context, agentContext, message.message, message.terminalName)
        if (sent) {
          explicitAgentContext = undefined
          treeProvider.clearSelection()
          actionPanel.clearAgentContext()
          actionPanel.resetAgentDraft()
        }
      }
      if (message.type === 'refreshTerminals') actionPanel.refresh()
      if (message.type !== 'refreshTerminals' && message.type !== 'sendAgent') historyProvider.refresh()
      actionPanel.refresh()
    },
  )

  treeView.onDidChangeCheckboxState(event => {
    for (const [item, state] of event.items) {
      if (item instanceof FileItem) {
        treeProvider.setFileSelected(item.selection, state === vscode.TreeItemCheckboxState.Checked)
      }
    }
    explicitAgentContext = undefined
    actionPanel.clearAgentContext()
  })

  treeView.onDidChangeSelection(event => {
    const item = event.selection[0]
    const next = targetFromTreeSelection(item)
    if (!next) return
    activeTarget = next.target
    actionPanel.setActiveTarget(next.label)
    historyProvider.setTarget(next.target, next.label)
  })

  context.subscriptions.push(
    treeView,
    historyView,
    vscode.window.registerFileDecorationProvider(decorationProvider),
    vscode.window.onDidOpenTerminal(() => actionPanel.refresh()),
    vscode.window.onDidCloseTerminal(() => actionPanel.refresh()),
    vscode.window.onDidChangeActiveTerminal(() => actionPanel.refresh()),
    vscode.window.onDidChangeTerminalState(() => actionPanel.refresh()),
    vscode.workspace.registerTextDocumentContentProvider(gitContentScheme, new GitContentProvider()),
    vscode.window.registerWebviewViewProvider('gitWorktreeDiff.actions', actionPanel),
    vscode.languages.registerCodeActionsProvider('*', {
      provideCodeActions(document, range) {
        if (range.isEmpty) return []
        const action = new vscode.CodeAction('Send Selection to Agent', vscode.CodeActionKind.QuickFix)
        action.command = {
          command: 'gitWorktreeDiff.sendSelectionToAgent',
          title: 'Send Selection to Agent',
        }
        return [action]
      },
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.addRepo', async () => {
      await addTrackedRepo(treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.removeRepo', async (item: RepoItem) => {
      await removeTrackedRepo(item, treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.checkoutBranch', async (item: RepoItem | WorktreeItem) => {
      await checkoutRepoBranch(item, treeProvider, historyProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.fetch', async (item: RepoItem | WorktreeItem) => {
      await runNativeRepoAction('fetch', item, treeProvider, historyProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.pull', async (item: RepoItem | WorktreeItem) => {
      await runNativeRepoAction('pull', item, treeProvider, historyProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.push', async (item: RepoItem | WorktreeItem) => {
      await runNativeRepoAction('push', item, treeProvider, historyProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.stageAll', async (item: RepoItem | WorktreeItem) => {
      await runNativeRepoAction('stageAll', item, treeProvider, historyProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.unstageAll', async (item: RepoItem | WorktreeItem) => {
      await runNativeRepoAction('unstageAll', item, treeProvider, historyProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.openNativeDiff', async (target: FileItem | WorkbenchSelection) => {
      await openNativeDiff(selectionFromTarget(target))
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.stageFile', async (target: FileItem | WorkbenchSelection) => {
      await runNativeFileAction('stage', selectionFromTarget(target), treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.unstageFile', async (target: FileItem | WorkbenchSelection) => {
      await runNativeFileAction('unstage', selectionFromTarget(target), treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.discardFile', async (target: FileItem | WorkbenchSelection) => {
      await runNativeFileAction('reject', selectionFromTarget(target), treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.addToGitignore', async (target: FileItem | WorkbenchSelection) => {
      await addFileToGitignore(selectionFromTarget(target), treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.refreshSidebar', () => {
      treeProvider.refresh()
      historyProvider.refresh()
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.refreshHistory', () => {
      historyProvider.refresh()
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.openCommitDiff', async (item: CommitItem | undefined) => {
      if (!item) return
      await openCommitDiff(item.commit, item.target)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.openCommitFileDiff', async (target: CommitFileItem | undefined) => {
      if (!target) return
      await openCommitFileDiff(target.selection)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.selectAllChangedFiles', async () => {
      await treeProvider.selectAll()
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.clearSelectedFiles', () => {
      treeProvider.clearSelection()
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.stageSelectedFiles', async () => {
      await runSelectedFileAction('stage', treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.unstageSelectedFiles', async () => {
      await runSelectedFileAction('unstage', treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.discardSelectedFiles', async () => {
      await runSelectedFileAction('reject', treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.addSelectedToGitignore', async () => {
      await addSelectedToGitignore(treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.sendSelectionToAgent', async () => {
      treeProvider.clearSelection()
      explicitAgentContext = buildEditorAgentContext(false)
      if (explicitAgentContext) actionPanel.composeAgent(explicitAgentContext.label)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.sendFileToAgent', async () => {
      treeProvider.clearSelection()
      explicitAgentContext = buildEditorAgentContext(true)
      if (explicitAgentContext) actionPanel.composeAgent(explicitAgentContext.label)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.sendTreeFileToAgent', async (target: FileItem | WorkbenchSelection) => {
      const selection = selectionFromTarget(target)
      const selectedFiles = treeProvider.getSelectedFiles()
      const selections = chooseAgentSelectionsForTreeCommand(selection, selectedFiles)
      explicitAgentContext = selections.length > 1 ? undefined : await buildChangedFilesAgentContext(selections)
      if (selections.length > 1) {
        actionPanel.composeSelectedAgent()
      } else if (explicitAgentContext) {
        treeProvider.clearSelection()
        actionPanel.composeAgent(explicitAgentContext.label)
      }
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.sendSelectedToAgent', async () => {
      explicitAgentContext = undefined
      const agentContext = await buildChangedFilesAgentContext(treeProvider.getSelectedFiles())
      if (agentContext) actionPanel.composeSelectedAgent()
    }),
  )
}

export function deactivate() {}

async function runNativeFileAction(
  action: 'stage' | 'unstage' | 'reject',
  selection: WorkbenchSelection,
  treeProvider: RepoTreeProvider,
) {
  if (action === 'reject') {
    const confirmed = await vscode.window.showWarningMessage(
      `Discard local changes in ${selection.filePath}? This cannot be undone by Git Worktree Diff.`,
      { modal: true },
      'Discard Changes',
    )
    if (confirmed !== 'Discard Changes') return
  }

  try {
    const output = await runFileAction(action, selection)
    treeProvider.refresh()
    void vscode.window.showInformationMessage(output || `${action} completed`)
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unable to ${action} file`
    void vscode.window.showErrorMessage(message)
  }
}

async function runSelectedFileAction(
  action: 'stage' | 'unstage' | 'reject',
  treeProvider: RepoTreeProvider,
) {
  const selections = treeProvider.getSelectedFiles()
  if (selections.length === 0) {
    void vscode.window.showWarningMessage('Select one or more changed files first.')
    return
  }

  if (action === 'reject') {
    const confirmed = await vscode.window.showWarningMessage(
      `Discard local changes in ${selections.length} selected file(s)? This cannot be undone by Git Worktree Diff.`,
      { modal: true },
      'Discard Selected',
    )
    if (confirmed !== 'Discard Selected') return
  }

  try {
    for (const selection of selections) {
      await runFileAction(action, selection)
    }
    treeProvider.refresh()
    void vscode.window.showInformationMessage(`${labelForAction(action)} ${selections.length} selected file(s)`)
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unable to ${action} selected files`
    void vscode.window.showErrorMessage(message)
  }
}

async function commitSelectedFiles(treeProvider: RepoTreeProvider, summary: string, description: string) {
  const selections = treeProvider.getSelectedFiles()
  if (selections.length === 0) {
    void vscode.window.showWarningMessage('Select one or more changed files first.')
    return
  }

  const target = ensureSingleWorktree(selections)
  if (!target) return
  const confirmed = await vscode.window.showWarningMessage(
    `Commit ${selections.length} selected file(s) in ${targetLabel(target)}?`,
    { modal: true },
    'Commit Selected Files',
  )
  if (confirmed !== 'Commit Selected Files') return

  try {
    const output = await commitFiles(target.worktreePath || target.repoPath, selections.map(selection => selection.filePath).filter(isString), summary, description)
    treeProvider.clearSelection()
    treeProvider.refresh()
    void vscode.window.showInformationMessage(output || 'Commit created')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to commit selected files'
    void vscode.window.showErrorMessage(message)
  }
}

async function amendWithSelectedFiles(treeProvider: RepoTreeProvider, summary: string, description: string) {
  const selections = treeProvider.getSelectedFiles()
  if (selections.length === 0) {
    void vscode.window.showWarningMessage('Select one or more changed files first.')
    return
  }

  const target = ensureSingleWorktree(selections)
  if (!target) return

  const confirmed = await vscode.window.showWarningMessage(
    `Stage ${selections.length} selected file(s) and amend the latest commit?`,
    { modal: true },
    'Amend Commit',
  )
  if (confirmed !== 'Amend Commit') return

  try {
    const output = await amendCommit(target, summary, description, selections.map(selection => selection.filePath).filter(isString))
    treeProvider.clearSelection()
    treeProvider.refresh()
    void vscode.window.showInformationMessage(output || 'Commit amended')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to amend commit'
    void vscode.window.showErrorMessage(message)
  }
}

async function addSelectedToGitignore(treeProvider: RepoTreeProvider) {
  const selections = treeProvider.getSelectedFiles()
  if (selections.length === 0) {
    void vscode.window.showWarningMessage('Select one or more changed files first.')
    return
  }

  try {
    for (const selection of selections) {
      await addPathToGitignore(selection)
    }
    treeProvider.refresh()
    void vscode.window.showInformationMessage(`Added ${selections.length} selected file(s) to .gitignore`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update .gitignore'
    void vscode.window.showErrorMessage(message)
  }
}

async function runPanelRepoAction(
  action: 'fetch' | 'pull' | 'push',
  activeTarget: RepoTarget | undefined,
  treeProvider: RepoTreeProvider,
) {
  const target = activeTarget || targetFromSelectedFiles(treeProvider.getSelectedFiles())
  if (!target) return
  if (action === 'push' && !await confirmPush(target)) return

  try {
    const output = await runRepoAction(action, target)
    treeProvider.refresh()
    void vscode.window.showInformationMessage(output || `${action} completed`)
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unable to ${action}`
    void vscode.window.showErrorMessage(message)
  }
}

async function stashPanelTarget(activeTarget: RepoTarget | undefined, treeProvider: RepoTreeProvider, stashMessage: string) {
  const target = activeTarget || targetFromSelectedFiles(treeProvider.getSelectedFiles())
  if (!target) return

  try {
    const output = await runRepoAction('stash', target, { message: stashMessage || 'Git Worktree Diff stash' })
    treeProvider.refresh()
    void vscode.window.showInformationMessage(output || 'Changes stashed')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to stash changes'
    void vscode.window.showErrorMessage(message)
  }
}

async function rebasePanelTarget(activeTarget: RepoTarget | undefined, treeProvider: RepoTreeProvider, branch: string) {
  const target = activeTarget || targetFromSelectedFiles(treeProvider.getSelectedFiles())
  if (!target) return

  if (!branch) {
    void vscode.window.showWarningMessage('Choose a branch to rebase onto.')
    return
  }

  try {
    const output = await runRepoAction('rebase', target, { branch })
    treeProvider.refresh()
    void vscode.window.showInformationMessage(output || `Rebased onto ${branch}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to rebase'
    void vscode.window.showErrorMessage(message)
  }
}

async function checkoutPanelTarget(activeTarget: RepoTarget | undefined, treeProvider: RepoTreeProvider, branch: string) {
  const target = activeTarget || targetFromSelectedFilesWithoutWarning(treeProvider.getSelectedFiles())
  if (!target) {
    void vscode.window.showWarningMessage('Select the main repository worktree first.')
    return
  }

  if (!treeProvider.canCheckoutBranch(target)) {
    void vscode.window.showWarningMessage('Branch checkout is locked for linked worktrees. Select the main repository worktree to switch branches.')
    return
  }

  if (!branch) {
    void vscode.window.showWarningMessage('Choose a branch to checkout.')
    return
  }

  if (branch === treeProvider.getCheckoutCurrentBranch(target)) {
    void vscode.window.showInformationMessage(`${branch} is already checked out.`)
    return
  }

  try {
    const output = await checkoutBranch(target.repoPath, branch)
    treeProvider.refresh()
    void vscode.window.showInformationMessage(output || `Checked out ${branch}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to checkout branch'
    void vscode.window.showErrorMessage(message)
  }
}

async function addTrackedRepo(treeProvider: RepoTreeProvider) {
  const selected = await vscode.window.showOpenDialog({
    title: 'Track Git Repository',
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
    openLabel: 'Track Repository',
  })
  if (!selected?.[0]) return

  try {
    await addRepo(selected[0].fsPath)
    treeProvider.refresh()
    void vscode.window.showInformationMessage(`Tracking ${selected[0].fsPath}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to track repository'
    void vscode.window.showErrorMessage(message)
  }
}

async function removeTrackedRepo(item: RepoItem | undefined, treeProvider: RepoTreeProvider) {
  if (!item) return
  const confirmed = await vscode.window.showWarningMessage(
    `Stop tracking ${item.repo.name}? This does not delete files.`,
    { modal: true },
    'Stop Tracking',
  )
  if (confirmed !== 'Stop Tracking') return

  await removeRepo(item.repo.path)
  treeProvider.refresh()
}

async function checkoutRepoBranch(
  item: RepoItem | WorktreeItem | undefined,
  treeProvider: RepoTreeProvider,
  historyProvider: HistoryTreeProvider,
) {
  if (!item) return
  const repo = item instanceof RepoItem ? item.repo : item.repo
  const target = targetFromItem(item)
  if (!treeProvider.canCheckoutBranch(target)) {
    void vscode.window.showWarningMessage('Branch checkout is locked for linked worktrees. Select the main repository worktree to switch branches.')
    return
  }

  const branch = await vscode.window.showQuickPick(
    repo.branches.filter(branch => branch !== repo.branch),
    { title: `Checkout branch in ${repo.name}` },
  )
  if (!branch) return

  try {
    const output = await checkoutBranch(repo.path, branch)
    treeProvider.refresh()
    historyProvider.refresh()
    void vscode.window.showInformationMessage(output || `Checked out ${branch}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to checkout branch'
    void vscode.window.showErrorMessage(message)
  }
}

async function runNativeRepoAction(
  action: 'fetch' | 'pull' | 'push' | 'stageAll' | 'unstageAll',
  item: RepoItem | WorktreeItem | undefined,
  treeProvider: RepoTreeProvider,
  historyProvider: HistoryTreeProvider,
) {
  if (!item) return
  const target = targetFromItem(item)
  if (action === 'push' && !await confirmPush(target)) return
  try {
    const output = await runRepoAction(action, target)
    treeProvider.refresh()
    historyProvider.refresh()
    void vscode.window.showInformationMessage(output || `${action} completed`)
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unable to ${action}`
    void vscode.window.showErrorMessage(message)
  }
}

async function addFileToGitignore(selection: WorkbenchSelection, treeProvider: RepoTreeProvider) {
  try {
    await addPathToGitignore(selection)
    treeProvider.refresh()
    void vscode.window.showInformationMessage(`Added ${selection.filePath} to .gitignore`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update .gitignore'
    void vscode.window.showErrorMessage(message)
  }
}

function selectionFromTarget(target: FileItem | WorkbenchSelection) {
  return target instanceof FileItem ? target.selection : target
}

function targetFromItem(item: RepoItem | WorktreeItem): RepoTarget {
  return item.target
}

async function confirmPush(target: RepoTarget) {
  const confirmed = await vscode.window.showWarningMessage(
    `Push commits from ${targetLabel(target)} to its configured remote?`,
    { modal: true },
    'Push Commits',
  )
  return confirmed === 'Push Commits'
}

function targetLabel(target: RepoTarget) {
  return baseName(target.worktreePath || target.repoPath)
}

function targetFromTreeSelection(item: RepoItem | WorktreeItem | FileItem | undefined): { target: RepoTarget; label: string } | null {
  if (item instanceof RepoItem) {
    return {
      target: item.target,
      label: `${item.repo.name} / ${item.repo.branch}`,
    }
  }

  if (item instanceof WorktreeItem) {
    return {
      target: item.target,
      label: `${item.repo.name} / ${item.worktree.branch}`,
    }
  }

  if (item instanceof FileItem) {
    return {
      target: {
        repoPath: item.selection.repoPath,
        worktreePath: item.selection.worktreePath,
      },
      label: item.selection.worktreePath
        ? `${baseName(item.selection.worktreePath)} / ${item.file.path}`
        : `${baseName(item.selection.repoPath)} / ${item.file.path}`,
    }
  }

  return null
}

function targetFromSelectedFiles(selections: WorkbenchSelection[]) {
  if (selections.length === 0) {
    void vscode.window.showWarningMessage('Select a worktree or select changed files first.')
    return null
  }

  return ensureSingleWorktree(selections)
}

function ensureSingleWorktree(selections: WorkbenchSelection[]): RepoTarget | null {
  const repoPaths = new Set(selections.map(selection => selection.worktreePath || selection.repoPath))
  if (repoPaths.size !== 1) {
    void vscode.window.showWarningMessage('Commit/amend works on one worktree at a time. Clear selection and choose files from one worktree.')
    return null
  }

  const first = selections[0]
  return {
    repoPath: first.repoPath,
    worktreePath: first.worktreePath,
  }
}

function labelForAction(action: 'stage' | 'unstage' | 'reject') {
  if (action === 'stage') return 'Staged'
  if (action === 'unstage') return 'Unstaged'
  return 'Discarded'
}

function isString(value: string | undefined): value is string {
  return typeof value === 'string'
}

function baseName(value: string) {
  return value.split('/').filter(Boolean).pop() ?? value
}

type AgentContext = {
  label: string
  blocks: AgentContextBlock[]
}

type AgentContextBlock = {
  filePath: string
  languageId: string
  text: string
  range: string
}

const maxAgentContextChars = 12_000
const lastTerminalKey = 'gitWorktreeDiff.lastAgentTerminal'
const execFileAsync = promisify(execFile)

function buildEditorAgentContext(wholeFile: boolean): AgentContext | undefined {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    void vscode.window.showWarningMessage('Open a file or diff editor before sending code to an agent.')
    return undefined
  }

  const document = editor.document
  const hasSelection = !editor.selection.isEmpty
  if (!wholeFile && !hasSelection) {
    void vscode.window.showWarningMessage('Select code first, or use Send File to Agent.')
    return undefined
  }

  const filePath = document.uri.scheme === 'file' ? document.uri.fsPath : document.uri.path
  const text = wholeFile ? document.getText() : document.getText(editor.selection)
  const range = wholeFile
    ? 'whole file'
    : `lines ${editor.selection.start.line + 1}-${editor.selection.end.line + 1}`

  return {
    label: `${path.basename(filePath)} / ${range}`,
    blocks: [{
      filePath,
      languageId: document.languageId,
      text,
      range,
    }],
  }
}

async function buildChangedFilesAgentContext(selections: WorkbenchSelection[]): Promise<AgentContext | undefined> {
  const files = selections.filter(selection => selection.filePath)
  if (files.length === 0) {
    void vscode.window.showWarningMessage('Select one or more changed files first.')
    return undefined
  }

  const blocks: AgentContextBlock[] = []
  for (const selection of files) {
    if (!selection.filePath) continue
    const filePath = path.join(selection.worktreePath || selection.repoPath, selection.filePath)
    let text = ''
    try {
      text = Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.file(filePath))).toString('utf8')
    } catch {
      text = '[Unable to read file]'
    }
    blocks.push({
      filePath,
      languageId: languageFromPath(selection.filePath),
      text,
      range: `${selection.fileStatus ?? 'changed'} file`,
    })
  }

  return {
    label: files.length === 1
      ? `${path.basename(files[0].worktreePath || files[0].repoPath)} / ${files[0].filePath}`
      : `${files.length} selected files`,
    blocks,
  }
}

async function sendAgentContext(
  context: vscode.ExtensionContext,
  agentContext: AgentContext | undefined,
  question: string,
  terminalId: string,
): Promise<boolean> {
  if (!agentContext) {
    void vscode.window.showWarningMessage('Choose files or select code before sending to an agent.')
    return false
  }

  if (!question.trim()) {
    void vscode.window.showWarningMessage('Type a message for the agent first.')
    return false
  }

  const terminal = await findTerminalById(terminalId)
  if (!terminal) {
    void vscode.window.showWarningMessage('That terminal is not available. Refresh terminals or open Codex/Claude/Gemini in a VS Code terminal.')
    return false
  }

  await context.globalState.update(lastTerminalKey, await getTerminalId(terminal, vscode.window.terminals.indexOf(terminal)))
  terminal.show()
  terminal.sendText(buildAgentPrompt(agentContext, question), true)
  return true
}


function buildAgentPrompt(agentContext: AgentContext, question: string) {
  let remaining = maxAgentContextChars
  const blocks = agentContext.blocks.map(block => {
    const code = truncate(block.text, remaining)
    remaining -= code.length
    return [
      `File: ${vscode.workspace.asRelativePath(block.filePath, false) || block.filePath}`,
      `Range: ${block.range}`,
      `\`\`\`${block.languageId}`,
      code,
      '```',
    ].join('\n')
  })

  return [
    'Please help with this code context.',
    '',
    'Question:',
    question.trim(),
    '',
    blocks.join('\n\n---\n\n'),
  ].join('\n')
}

async function getTerminalOptions(context: vscode.ExtensionContext): Promise<TerminalOption[]> {
  const lastTerminalId = context.globalState.get<string>(lastTerminalKey)
  const summaries = []
  for (const [index, terminal] of vscode.window.terminals.entries()) {
    const name = terminal.name.trim()
    if (!name) continue
    const id = await getTerminalId(terminal, index)
    const active = terminal === vscode.window.activeTerminal || id === lastTerminalId || name === lastTerminalId
    summaries.push({
      id,
      name,
      commandLine: await getTerminalCommandLine(terminal),
      active,
    })
  }
  return buildTerminalOptions(summaries)
}

async function findTerminalById(id: string) {
  for (const [index, terminal] of vscode.window.terminals.entries()) {
    if (await getTerminalId(terminal, index) === id) return terminal
  }
  return undefined
}

async function getTerminalId(terminal: vscode.Terminal, index: number) {
  try {
    const pid = await terminal.processId
    if (pid) return `pid:${pid}`
  } catch {
    // Fall back to index below.
  }
  return `idx:${index}:${terminal.name.trim()}`
}

async function getTerminalCommandLine(terminal: vscode.Terminal) {
  try {
    const pid = await terminal.processId
    if (!pid) return ''
    const { stdout } = await execFileAsync('ps', ['-axo', 'pid=,ppid=,command='], {
      timeout: 1000,
      maxBuffer: 1024 * 1024,
    })
    return getProcessTreeCommands(String(stdout), pid).join('\n')
  } catch {
    return ''
  }
}

function getBranchOptions(treeProvider: RepoTreeProvider, activeTarget: RepoTarget | undefined) {
  const target = activeTarget || targetFromSelectedFilesWithoutWarning(treeProvider.getSelectedFiles())
  return treeProvider.getBranchesForTarget(target).map(branch => ({ name: branch }))
}

function getCheckoutBranchOptions(treeProvider: RepoTreeProvider, activeTarget: RepoTarget | undefined) {
  const target = activeTarget || targetFromSelectedFilesWithoutWarning(treeProvider.getSelectedFiles())
  return treeProvider.getCheckoutBranchesForTarget(target).map(branch => ({ name: branch }))
}

function getCheckoutCurrentBranch(treeProvider: RepoTreeProvider, activeTarget: RepoTarget | undefined) {
  const target = activeTarget || targetFromSelectedFilesWithoutWarning(treeProvider.getSelectedFiles())
  return treeProvider.getCheckoutCurrentBranch(target)
}

function canCheckoutBranch(treeProvider: RepoTreeProvider, activeTarget: RepoTarget | undefined) {
  const target = activeTarget || targetFromSelectedFilesWithoutWarning(treeProvider.getSelectedFiles())
  return treeProvider.canCheckoutBranch(target)
}

function hasCheckoutTarget(treeProvider: RepoTreeProvider, activeTarget: RepoTarget | undefined) {
  return Boolean(activeTarget || targetFromSelectedFilesWithoutWarning(treeProvider.getSelectedFiles()))
}

function targetFromSelectedFilesWithoutWarning(selections: WorkbenchSelection[]): RepoTarget | undefined {
  const repoPaths = new Set(selections.map(selection => selection.worktreePath || selection.repoPath))
  if (repoPaths.size !== 1) return undefined
  const first = selections[0]
  if (!first) return undefined
  return {
    repoPath: first.repoPath,
    worktreePath: first.worktreePath,
  }
}

function truncate(value: string, maxLength: number) {
  if (maxLength <= 0) return '[context truncated]'
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}\n\n[truncated after ${maxLength.toLocaleString()} characters]`
}

function languageFromPath(filePath: string) {
  const ext = path.extname(filePath).slice(1)
  if (ext === 'tsx' || ext === 'ts') return 'typescript'
  if (ext === 'jsx' || ext === 'js') return 'javascript'
  return ext || 'text'
}
