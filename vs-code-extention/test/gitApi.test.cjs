const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const {
  buildAmendArgs,
  buildCommitArgs,
  parseChangedFiles,
  parseCommitHistory,
  parseNumstat,
  parseStatus,
  parseStatusBranch,
  parseStatusChangedFiles,
  parseWorkingTreeChangedFiles,
  parseWorktrees,
  runFileAction,
} = require('../out/gitApi.js')

test('buildCommitArgs limits commits to selected files', () => {
  const args = buildCommitArgs(['src/a.ts', 'src/b.ts'], 'Fix calendar', 'Extra context')

  assert.deepEqual(args, [
    'commit',
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

test('runFileAction discards untracked files by deleting the repo-relative file', async () => {
  const repoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'git-worktree-diff-untracked-'))
  execFileSync('git', ['init'], { cwd: repoPath, stdio: 'ignore' })
  const filePath = 'test-inspector-report.md'
  const absoluteFilePath = path.join(repoPath, filePath)
  fs.writeFileSync(absoluteFilePath, 'temporary report\n')

  await runFileAction('reject', { repoPath, filePath, fileStatus: 'untracked' })

  assert.equal(fs.existsSync(absoluteFilePath), false)
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

test('parseWorkingTreeChangedFiles includes staged-only files', () => {
  const files = parseWorkingTreeChangedFiles(
    '',
    '',
    'A\tsrc/staged.ts\nD\tsrc/removed.ts',
    '4\t0\tsrc/staged.ts\n0\t3\tsrc/removed.ts',
  )

  assert.deepEqual(files, [
    {
      path: 'src/staged.ts',
      status: 'added',
      stagedStatus: 'added',
      additions: 4,
      deletions: 0,
    },
    {
      path: 'src/removed.ts',
      status: 'deleted',
      stagedStatus: 'deleted',
      additions: 0,
      deletions: 3,
    },
  ])
})

test('parseWorkingTreeChangedFiles merges staged and unstaged states for one path', () => {
  const files = parseWorkingTreeChangedFiles(
    'M\tsrc/file.ts',
    '2\t1\tsrc/file.ts',
    'M\tsrc/file.ts',
    '5\t0\tsrc/file.ts',
  )

  assert.deepEqual(files, [{
    path: 'src/file.ts',
    status: 'modified',
    stagedStatus: 'modified',
    unstagedStatus: 'modified',
    additions: 7,
    deletions: 1,
  }])
})

test('parseStatusChangedFiles follows porcelain v2 XY status and includes untracked files', () => {
  const status = [
    '# branch.head main',
    '1 M. N... 100644 100644 100644 abc123 abc123 src/staged.ts',
    '1 .M N... 100644 100644 100644 abc123 abc123 src/unstaged.ts',
    '? src/new file.ts',
    '',
  ].join('\0')
  const files = parseStatusChangedFiles(
    status,
    '5\t1\tsrc/staged.ts\n2\t3\tsrc/unstaged.ts',
  )

  assert.deepEqual(files, [
    {
      path: 'src/staged.ts',
      status: 'modified',
      stagedStatus: 'modified',
      unstagedStatus: undefined,
      oldPath: undefined,
      rawStatus: 'M.',
      additions: 5,
      deletions: 1,
    },
    {
      path: 'src/unstaged.ts',
      status: 'modified',
      stagedStatus: undefined,
      unstagedStatus: 'modified',
      oldPath: undefined,
      rawStatus: '.M',
      additions: 2,
      deletions: 3,
    },
    {
      path: 'src/new file.ts',
      status: 'untracked',
      stagedStatus: undefined,
      unstagedStatus: 'untracked',
      oldPath: undefined,
      rawStatus: '??',
      additions: 0,
      deletions: 0,
    },
  ])
})

test('parseStatusChangedFiles handles renamed entries and skips staged add then deleted', () => {
  const status = [
    '2 R. N... 100644 100644 100644 abc123 abc123 R100 src/new.ts',
    'src/old.ts',
    '1 AD N... 000000 100644 000000 abc123 abc123 src/transient.ts',
    '',
  ].join('\0')

  const files = parseStatusChangedFiles(status, '1\t1\tsrc/old.ts\tsrc/new.ts')

  assert.deepEqual(files, [{
    path: 'src/new.ts',
    status: 'modified',
    stagedStatus: 'modified',
    unstagedStatus: undefined,
    oldPath: 'src/old.ts',
    rawStatus: 'R.',
    additions: 1,
    deletions: 1,
  }])
})

test('parseStatusBranch returns upstream ahead and behind counts', () => {
  const status = [
    '# branch.oid abc123',
    '# branch.head feature/sync',
    '# branch.upstream origin/feature/sync',
    '# branch.ab +3 -2',
    '1 M. N... 100644 100644 100644 abc123 abc123 src/file.ts',
    '',
  ].join('\0')

  assert.deepEqual(parseStatusBranch(status), {
    branch: 'feature/sync',
    upstream: 'origin/feature/sync',
    ahead: 3,
    behind: 2,
  })
})

test('parseStatusBranch defaults detached branch with no upstream to zero sync counts', () => {
  const status = [
    '# branch.head (detached)',
    '',
  ].join('\0')

  assert.deepEqual(parseStatusBranch(status), {
    branch: '(detached)',
    ahead: 0,
    behind: 0,
  })
})

test('parseCommitHistory parses git log records with unit and record separators', () => {
  const commits = parseCommitHistory([
    'abc123456789\x1fabc1234\x1fDana Developer\x1fdana@example.com\x1f2026-05-15T10:00:00-04:00\x1fAdd history panel',
    '\x1e',
    'def987654321\x1fdef9876\x1fAlex Author\x1falex@example.com\x1f2026-05-14T09:30:00-04:00\x1fFix terminal selector',
    '\x1e',
  ].join(''))

  assert.deepEqual(commits, [
    {
      sha: 'abc123456789',
      shortSha: 'abc1234',
      authorName: 'Dana Developer',
      authorEmail: 'dana@example.com',
      authoredAt: '2026-05-15T10:00:00-04:00',
      subject: 'Add history panel',
    },
    {
      sha: 'def987654321',
      shortSha: 'def9876',
      authorName: 'Alex Author',
      authorEmail: 'alex@example.com',
      authoredAt: '2026-05-14T09:30:00-04:00',
      subject: 'Fix terminal selector',
    },
  ])
})

test('parseCommitHistory ignores incomplete records', () => {
  const commits = parseCommitHistory('missing-subject\x1fshort\x1e\x1f\x1f\x1f\x1f\x1f')

  assert.deepEqual(commits, [])
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

test('parseWorktrees ignores prunable missing worktrees', () => {
  const worktrees = parseWorktrees([
    'worktree /repo',
    'HEAD abc123',
    'branch refs/heads/main',
    '',
    'worktree /repo-missing',
    'HEAD def456',
    'branch refs/heads/feature/missing',
    'prunable gitdir file points to non-existent location',
  ].join('\n'))

  assert.deepEqual(worktrees, [
    { path: '/repo', branch: 'main' },
  ])
})
