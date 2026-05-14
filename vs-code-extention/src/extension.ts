import * as vscode from 'vscode'
import { ActionPanelProvider } from './actionPanel'
import path from 'node:path'
import { GitWorktreeDiffDecorationProvider } from './fileDecorations'
import { addPathToGitignore, addRepo, amendCommit, checkoutBranch, commitFiles, removeRepo, runFileAction, runRepoAction } from './gitApi'
import { GitContentProvider, gitContentScheme, openNativeDiff } from './gitContentProvider'
import { FileItem, RepoItem, RepoTreeProvider, WorktreeItem } from './repoTree'
import type { RepoTarget, WorkbenchSelection } from './types'

export function activate(context: vscode.ExtensionContext) {
  const treeProvider = new RepoTreeProvider()
  const decorationProvider = new GitWorktreeDiffDecorationProvider()
  let activeTarget: RepoTarget | undefined
  let explicitAgentContext: AgentContext | undefined
  const treeView = vscode.window.createTreeView('gitWorktreeDiff.sidebar', {
    treeDataProvider: treeProvider,
    manageCheckboxStateManually: true,
  })
  const actionPanel = new ActionPanelProvider(
    context.extensionUri,
    treeProvider,
    () => getTerminalOptions(context),
    () => getBranchOptions(treeProvider, activeTarget),
    async message => {
      if (message.type === 'selectAll') await treeProvider.selectAll(activeTarget)
      if (message.type === 'clearSelection') treeProvider.clearSelection()
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
        await sendAgentContext(context, agentContext, message.message, message.terminalName)
      }
      if (message.type === 'refreshTerminals') actionPanel.refresh()
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
  })

  context.subscriptions.push(
    treeView,
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
      await checkoutRepoBranch(item, treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.fetch', async (item: RepoItem | WorktreeItem) => {
      await runNativeRepoAction('fetch', item, treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.pull', async (item: RepoItem | WorktreeItem) => {
      await runNativeRepoAction('pull', item, treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.push', async (item: RepoItem | WorktreeItem) => {
      await runNativeRepoAction('push', item, treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.stageAll', async (item: RepoItem | WorktreeItem) => {
      await runNativeRepoAction('stageAll', item, treeProvider)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.unstageAll', async (item: RepoItem | WorktreeItem) => {
      await runNativeRepoAction('unstageAll', item, treeProvider)
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
      explicitAgentContext = buildEditorAgentContext(false)
      if (explicitAgentContext) actionPanel.composeAgent(explicitAgentContext.label)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.sendFileToAgent', async () => {
      explicitAgentContext = buildEditorAgentContext(true)
      if (explicitAgentContext) actionPanel.composeAgent(explicitAgentContext.label)
    }),
    vscode.commands.registerCommand('gitWorktreeDiff.sendTreeFileToAgent', async (target: FileItem | WorkbenchSelection) => {
      explicitAgentContext = await buildChangedFilesAgentContext([selectionFromTarget(target)])
      if (explicitAgentContext) actionPanel.composeAgent(explicitAgentContext.label)
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

async function checkoutRepoBranch(item: RepoItem | WorktreeItem | undefined, treeProvider: RepoTreeProvider) {
  if (!item) return
  const repo = item instanceof RepoItem ? item.repo : item.repo
  const repoPath = item instanceof WorktreeItem ? item.worktree.path : repo.path
  const branch = await vscode.window.showQuickPick(
    repo.branches.filter(branch => branch !== repo.branch),
    { title: `Checkout branch in ${repo.name}` },
  )
  if (!branch) return

  try {
    const output = await checkoutBranch(repoPath, branch)
    treeProvider.refresh()
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
) {
  if (!item) return
  try {
    const output = await runRepoAction(action, targetFromItem(item))
    treeProvider.refresh()
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
  terminalName: string,
) {
  if (!agentContext) {
    void vscode.window.showWarningMessage('Choose files or select code before sending to an agent.')
    return
  }

  if (!question.trim()) {
    void vscode.window.showWarningMessage('Type a message for the agent first.')
    return
  }

  const terminal = vscode.window.terminals.find(terminal => terminal.name === terminalName)
  if (!terminal) {
    void vscode.window.showWarningMessage('That terminal is not available. Refresh terminals or open Codex/Claude/Gemini in a VS Code terminal.')
    return
  }

  await context.globalState.update(lastTerminalKey, terminal.name)
  terminal.show()
  terminal.sendText(buildAgentPrompt(agentContext, question), true)
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

function getTerminalOptions(context: vscode.ExtensionContext) {
  const lastTerminalName = context.globalState.get<string>(lastTerminalKey)
  return vscode.window.terminals.map(terminal => ({
    name: terminal.name,
    active: terminal === vscode.window.activeTerminal || terminal.name === lastTerminalName,
  }))
}

function getBranchOptions(treeProvider: RepoTreeProvider, activeTarget: RepoTarget | undefined) {
  const target = activeTarget || targetFromSelectedFilesWithoutWarning(treeProvider.getSelectedFiles())
  return treeProvider.getBranchesForTarget(target).map(branch => ({ name: branch }))
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
