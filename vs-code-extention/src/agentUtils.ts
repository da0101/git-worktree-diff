import type { WorkbenchSelection } from './types'

export type TerminalSummary = {
  id: string
  name: string
  commandLine: string
  active: boolean
}

export type AgentTerminalOption = {
  id: string
  name: string
  label: string
  active: boolean
}

export function buildTerminalOptions(terminals: TerminalSummary[]): AgentTerminalOption[] {
  const labelCounts = new Map<string, number>()

  return terminals.map(terminal => {
    const baseLabel = detectAgentTerminal(`${terminal.name}\n${terminal.commandLine}`) ?? terminal.name
    const count = (labelCounts.get(baseLabel) ?? 0) + 1
    labelCounts.set(baseLabel, count)

    return {
      id: terminal.id,
      name: terminal.name,
      label: count > 1 ? `${baseLabel} ${count}` : baseLabel,
      active: terminal.active,
    }
  })
}

export function chooseAgentSelectionsForTreeCommand(
  clickedSelection: WorkbenchSelection,
  selectedFiles: WorkbenchSelection[],
) {
  return selectedFiles.some(selected => sameSelection(selected, clickedSelection))
    ? selectedFiles
    : [clickedSelection]
}

export function sameSelection(left: WorkbenchSelection, right: WorkbenchSelection) {
  return left.repoPath === right.repoPath
    && left.worktreePath === right.worktreePath
    && left.filePath === right.filePath
}

export function getProcessTreeCommands(raw: string, rootPid: number) {
  const rows = raw.split('\n').map(line => {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/)
    if (!match) return null
    return {
      pid: Number(match[1]),
      ppid: Number(match[2]),
      command: match[3],
    }
  }).filter((row): row is { pid: number; ppid: number; command: string } => Boolean(row))

  const byParent = new Map<number, Array<{ pid: number; command: string }>>()
  for (const row of rows) {
    const children = byParent.get(row.ppid) ?? []
    children.push({ pid: row.pid, command: row.command })
    byParent.set(row.ppid, children)
  }

  const rootCommand = rows.find(row => row.pid === rootPid)?.command
  const commands = rootCommand ? [rootCommand] : []
  const queue = [rootPid]
  while (queue.length > 0) {
    const parent = queue.shift()
    if (!parent) continue
    for (const child of byParent.get(parent) ?? []) {
      commands.push(child.command)
      queue.push(child.pid)
    }
  }
  return commands
}

export function detectAgentTerminal(value: string) {
  const normalized = value.toLowerCase()
  if (/\bcodex\b|openai codex|@openai\/codex/.test(normalized)) return 'Codex'
  if (/\bclaude\b|anthropic/.test(normalized)) return 'Claude'
  if (/\bgemini\b|google-gemini/.test(normalized)) return 'Gemini'
  return null
}
