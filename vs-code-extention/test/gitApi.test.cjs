const assert = require('node:assert/strict')
const test = require('node:test')

const {
  buildAmendArgs,
  buildCommitArgs,
  parseChangedFiles,
  parseNumstat,
  parseStatus,
  parseWorktrees,
} = require('../out/gitApi.js')

test('buildCommitArgs limits commits to selected files', () => {
  const args = buildCommitArgs(['src/a.ts', 'src/b.ts'], 'Fix calendar', 'Extra context')

  assert.deepEqual(args, [
    'commit',
    '--only',
    '-m',
    'Fix calendar',
    '-m',
    'Extra context',
    '--',
    'src/a.ts',
    'src/b.ts',
  ])
})

test('buildAmendArgs can amend only selected files without changing the message', () => {
  const args = buildAmendArgs(undefined, undefined, ['src/a.ts'])

  assert.deepEqual(args, [
    'commit',
    '--amend',
    '--no-edit',
    '--only',
    '--',
    'src/a.ts',
  ])
})

test('parseChangedFiles returns additions and deletions for modified files', () => {
  const files = parseChangedFiles(
    'M\tsrc/App.tsx',
    '12\t3\tsrc/App.tsx',
  )

  assert.deepEqual(files, [{
    path: 'src/App.tsx',
    status: 'modified',
    additions: 12,
    deletions: 3,
  }])
})

test('parseChangedFiles uses the destination path for renamed files', () => {
  const files = parseChangedFiles(
    'R100\told-name.ts\tnew-name.ts',
    '1\t2\told-name.ts\tnew-name.ts',
  )

  assert.deepEqual(files, [{
    path: 'new-name.ts',
    status: 'modified',
    additions: 1,
    deletions: 2,
  }])
})

test('parseChangedFiles treats binary numstat markers as zero line totals', () => {
  const files = parseChangedFiles(
    'A\tassets/icon.png',
    '-\t-\tassets/icon.png',
  )

  assert.deepEqual(files, [{
    path: 'assets/icon.png',
    status: 'added',
    additions: 0,
    deletions: 0,
  }])
})

test('parseChangedFiles keeps files without numstat totals visible', () => {
  const files = parseChangedFiles('D\tREADME.md', '')

  assert.deepEqual(files, [{
    path: 'README.md',
    status: 'deleted',
    additions: 0,
    deletions: 0,
  }])
})

test('parseStatus maps added and deleted statuses explicitly', () => {
  assert.equal(parseStatus('A'), 'added')
  assert.equal(parseStatus('D'), 'deleted')
})

test('parseNumstat ignores empty lines and binary markers', () => {
  const totals = parseNumstat('5\t2\tsrc/a.ts\n-\t-\tassets/a.png\n\n1\t0\tsrc/b.ts')

  assert.deepEqual(totals, {
    additions: 6,
    deletions: 2,
  })
})

test('parseWorktrees parses branch names from porcelain output', () => {
  const worktrees = parseWorktrees([
    'worktree /repo',
    'HEAD abc123',
    'branch refs/heads/main',
    '',
    'worktree /repo-feature',
    'HEAD def456',
    'branch refs/heads/feature/native-sidebar',
  ].join('\n'))

  assert.deepEqual(worktrees, [
    { path: '/repo', branch: 'main' },
    { path: '/repo-feature', branch: 'feature/native-sidebar' },
  ])
})

test('parseWorktrees handles detached worktrees', () => {
  const worktrees = parseWorktrees([
    'worktree /repo-detached',
    'HEAD abc123',
    'detached',
  ].join('\n'))

  assert.deepEqual(worktrees, [
    { path: '/repo-detached', branch: '(detached)' },
  ])
})
