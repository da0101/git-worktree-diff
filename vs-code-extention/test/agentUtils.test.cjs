const assert = require('node:assert/strict')
const test = require('node:test')

const {
  buildTerminalOptions,
  chooseAgentSelectionsForTreeCommand,
  detectAgentTerminal,
  getProcessTreeCommands,
  sameSelection,
} = require('../out/agentUtils.js')

test('detectAgentTerminal identifies Codex from node process command text', () => {
  const label = detectAgentTerminal('/usr/local/bin/node /usr/local/bin/codex')

  assert.equal(label, 'Codex')
})

test('detectAgentTerminal identifies Claude and Gemini terminals', () => {
  assert.deepEqual([
    detectAgentTerminal('/bin/zsh -lc claude'),
    detectAgentTerminal('/bin/zsh -lc gemini'),
  ], ['Claude', 'Gemini'])
})

test('detectAgentTerminal returns null for non-agent terminals', () => {
  const label = detectAgentTerminal('/bin/zsh')

  assert.equal(label, null)
})

test('getProcessTreeCommands returns root and nested child commands', () => {
  const commands = getProcessTreeCommands([
    '  100     1 /bin/zsh',
    '  101   100 node /opt/homebrew/bin/codex',
    '  102   101 /usr/bin/script-helper',
    '  200     1 unrelated',
  ].join('\n'), 100)

  assert.deepEqual(commands, [
    '/bin/zsh',
    'node /opt/homebrew/bin/codex',
    '/usr/bin/script-helper',
  ])
})

test('getProcessTreeCommands ignores malformed ps lines', () => {
  const commands = getProcessTreeCommands([
    'not a ps row',
    '  100     1 /bin/zsh',
    '',
    '  101   100 codex',
  ].join('\n'), 100)

  assert.deepEqual(commands, ['/bin/zsh', 'codex'])
})

test('buildTerminalOptions labels Codex terminals even when VS Code names them node', () => {
  const options = buildTerminalOptions([{
    id: 'pid:101',
    name: 'node',
    commandLine: 'node /opt/homebrew/bin/codex',
    active: true,
  }])

  assert.deepEqual(options, [{
    id: 'pid:101',
    name: 'node',
    label: 'Codex',
    active: true,
  }])
})

test('buildTerminalOptions preserves duplicate Codex terminal instances with numbered labels', () => {
  const options = buildTerminalOptions([
    { id: 'pid:101', name: 'node', commandLine: 'node /bin/codex', active: true },
    { id: 'pid:102', name: 'node', commandLine: 'node /bin/codex', active: false },
  ])

  assert.deepEqual(options.map(option => ({
    id: option.id,
    label: option.label,
    active: option.active,
  })), [
    { id: 'pid:101', label: 'Codex', active: true },
    { id: 'pid:102', label: 'Codex 2', active: false },
  ])
})

test('buildTerminalOptions falls back to terminal name for unknown terminals', () => {
  const options = buildTerminalOptions([{
    id: 'pid:201',
    name: 'zsh',
    commandLine: '/bin/zsh',
    active: false,
  }])

  assert.equal(options[0].label, 'zsh')
})

test('sameSelection includes repo path, worktree path, and file path in identity', () => {
  const matches = sameSelection(
    { repoPath: '/repo', worktreePath: '/repo-feature', filePath: 'src/a.ts' },
    { repoPath: '/repo', worktreePath: '/repo-feature', filePath: 'src/a.ts' },
  )

  assert.equal(matches, true)
})

test('sameSelection treats the same file in different worktrees as different', () => {
  const matches = sameSelection(
    { repoPath: '/repo', worktreePath: '/repo-feature-a', filePath: 'src/a.ts' },
    { repoPath: '/repo', worktreePath: '/repo-feature-b', filePath: 'src/a.ts' },
  )

  assert.equal(matches, false)
})

test('chooseAgentSelectionsForTreeCommand sends all checked files when clicked file is checked', () => {
  const clicked = { repoPath: '/repo', filePath: 'src/a.ts' }
  const selected = [
    clicked,
    { repoPath: '/repo', filePath: 'src/b.ts' },
  ]

  const selections = chooseAgentSelectionsForTreeCommand(clicked, selected)

  assert.deepEqual(selections, selected)
})

test('chooseAgentSelectionsForTreeCommand sends only clicked file when it is not checked', () => {
  const clicked = { repoPath: '/repo', filePath: 'src/a.ts' }
  const selected = [
    { repoPath: '/repo', filePath: 'src/b.ts' },
  ]

  const selections = chooseAgentSelectionsForTreeCommand(clicked, selected)

  assert.deepEqual(selections, [clicked])
})
