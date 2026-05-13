import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, GitBranch, GitCompareArrows, Moon, Sun } from 'lucide-react'
import { DiffPane } from '@/components/workbench/DiffPane'
import { FilesPanel } from '@/components/workbench/FilesPanel'
import { GitActionsPanel } from '@/components/workbench/GitActionsPanel'
import { RepositoryPanel } from '@/components/workbench/RepositoryPanel'
import { api } from '@/lib/api'
import { parseFileDiffs } from '@/lib/diffFiles'
import type { DiffMode, GitActionResult, RepoSummary, Theme } from '@/types/git'

export default function App() {
  const [theme, setTheme] = useLocalStorageState<Theme>('git-viewer-theme', 'dark', value => value === 'dark' || value === 'light')
  const [diffMode, setDiffMode] = useLocalStorageState<DiffMode>('git-viewer-diff-mode', 'unified', value => value === 'unified' || value === 'split')
  const [selectedRepoPath, setSelectedRepoPath] = useLocalStorageState('git-viewer-selected-repo', '')
  const [repoPathInput, setRepoPathInput] = useLocalStorageState('git-viewer-repo-path-input', '')
  const [commitMessage, setCommitMessage] = useLocalStorageState('git-viewer-commit-message', '')
  const [rebaseBranch, setRebaseBranch] = useLocalStorageState('git-viewer-rebase-branch', '')

  const [rawDiff, setRawDiff] = useState('')
  const [query, setQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState('')
  const [repos, setRepos] = useState<RepoSummary[]>([])
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set())
  const [gitOutput, setGitOutput] = useState('')
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [loadingDiff, setLoadingDiff] = useState(false)
  const [operationLoading, setOperationLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const selectedRepo = useMemo(() => (
    repos.find(repo => repo.path === selectedRepoPath) ?? repos[0] ?? null
  ), [repos, selectedRepoPath])

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true)
    setApiError('')
    try {
      const nextRepos = await api<RepoSummary[]>('/api/repos')
      setRepos(nextRepos)
      setSelectedRepoPath(current => pickSelectedRepoPath(current, nextRepos))
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to load repositories')
    } finally {
      setLoadingRepos(false)
    }
  }, [setSelectedRepoPath])

  const loadRepoDiff = useCallback(async (repoPath: string) => {
    if (!repoPath) {
      setRawDiff('')
      return
    }

    setLoadingDiff(true)
    setApiError('')
    try {
      const params = new URLSearchParams({ path: repoPath })
      const result = await api<{ path: string; diff: string }>(`/api/repos/diff?${params}`)
      setRawDiff(result.diff)
      setSelectedPath('')
      setSelectedFilePaths(new Set())
    } catch (error) {
      setRawDiff('')
      setApiError(error instanceof Error ? error.message : 'Unable to load repository diff')
    } finally {
      setLoadingDiff(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadRepos()
    })
  }, [loadRepos])

  useEffect(() => {
    if (selectedRepo?.path) {
      queueMicrotask(() => {
        void loadRepoDiff(selectedRepo.path)
      })
    }
  }, [loadRepoDiff, selectedRepo?.path])

  const addRepo = async () => {
    const path = repoPathInput.trim()
    setLoadingRepos(true)
    setApiError('')
    try {
      const nextRepos = path
        ? await api<RepoSummary[]>('/api/repos', { method: 'POST', body: JSON.stringify({ path }) })
        : await api<RepoSummary[]>('/api/repos/pick', { method: 'POST' })
      setRepos(nextRepos)
      const added = nextRepos.find(repo => repo.path === path) ?? nextRepos[nextRepos.length - 1]
      setSelectedRepoPath(added?.path ?? '')
      setRepoPathInput('')
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to track repository')
    } finally {
      setLoadingRepos(false)
    }
  }

  const removeRepo = async (repoPath: string) => {
    setLoadingRepos(true)
    setApiError('')
    try {
      const params = new URLSearchParams({ path: repoPath })
      const nextRepos = await api<RepoSummary[]>(`/api/repos?${params}`, { method: 'DELETE' })
      setRepos(nextRepos)
      setSelectedRepoPath(nextRepos[0]?.path ?? '')
      if (nextRepos.length === 0) setRawDiff('')
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to remove repository')
    } finally {
      setLoadingRepos(false)
    }
  }

  const checkoutBranch = async (repoPath: string, branch: string) => {
    setLoadingDiff(true)
    setApiError('')
    try {
      const nextRepos = await api<RepoSummary[]>('/api/repos/checkout', {
        method: 'POST',
        body: JSON.stringify({ path: repoPath, branch }),
      })
      setRepos(nextRepos)
      setSelectedRepoPath(repoPath)
      await loadRepoDiff(repoPath)
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to switch branch')
    } finally {
      setLoadingDiff(false)
    }
  }

  const refreshSelectedRepo = async () => {
    if (!selectedRepo?.path) return
    await loadRepos()
    await loadRepoDiff(selectedRepo.path)
  }

  const runGitAction = async (action: string, options: { files?: string[]; message?: string; branch?: string } = {}) => {
    if (!selectedRepo) return

    setOperationLoading(true)
    setApiError('')
    setGitOutput('')
    try {
      const result = await api<GitActionResult>(`/api/git/${action}`, {
        method: 'POST',
        body: JSON.stringify({
          path: selectedRepo.path,
          files: options.files ?? Array.from(selectedFilePaths),
          message: options.message ?? commitMessage,
          branch: options.branch,
        }),
      })
      setRepos(result.repos)
      setGitOutput(result.output || `${action} completed`)
      await loadRepoDiff(selectedRepo.path)
    } catch (error) {
      setApiError(error instanceof Error ? error.message : `Unable to ${action}`)
    } finally {
      setOperationLoading(false)
    }
  }

  const rejectSelectedFiles = async () => {
    const filesToReject = Array.from(selectedFilePaths)
    if (filesToReject.length === 0) return
    const confirmed = window.confirm(`Reject local changes in ${filesToReject.length} selected file(s)? This discards those file changes.`)
    if (!confirmed) return
    await runGitAction('reject', { files: filesToReject })
  }

  const files = useMemo(() => parseFileDiffs(rawDiff), [rawDiff])
  const filteredFiles = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return files
    return files.filter(file => file.path.toLowerCase().includes(needle))
  }, [files, query])
  const selectedFile = useMemo(() => (
    filteredFiles.find(file => file.path === selectedPath) ?? filteredFiles[0] ?? null
  ), [filteredFiles, selectedPath])
  const selectedFiles = useMemo(() => Array.from(selectedFilePaths), [selectedFilePaths])
  const allFilePaths = useMemo(() => files.map(file => file.path), [files])
  const totals = useMemo(() => files.reduce(
    (acc, file) => ({
      additions: acc.additions + file.parsed.additions,
      deletions: acc.deletions + file.parsed.deletions,
    }),
    { additions: 0, deletions: 0 },
  ), [files])
  const rebaseTarget = useMemo(() => pickRebaseTarget(selectedRepo, rebaseBranch), [rebaseBranch, selectedRepo])

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    document.documentElement.style.colorScheme = next
  }

  return (
    <main className="app-frame bg-[var(--bg)] text-[var(--text)]">
      <header className="app-header border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="flex items-center gap-4 px-5 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-strong)]">
              <GitCompareArrows size={18} className="text-[var(--blue)]" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight">Git Worktree Diff</h1>
              <p className="truncate text-xs text-[var(--text-dim)]">Local Git repository viewer</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs text-[var(--text-dim)] md:flex">
            <GitBranch size={14} />
            <span>{selectedRepo?.name ?? 'No repo'}</span>
            <ChevronRight size={13} />
            <span className="font-medium text-[var(--text)]">{selectedRepo?.branch ?? 'not tracked'}</span>
          </div>

          <button
            className="icon-button"
            onClick={handleThemeToggle}
            aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
            title={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      <div className="workbench-shell">
        <aside className="tool-rail tool-rail-left">
          <RepositoryPanel
            repos={repos}
            selectedRepo={selectedRepo}
            repoPathInput={repoPathInput}
            loadingRepos={loadingRepos}
            loadingDiff={loadingDiff}
            apiError={apiError}
            onRepoPathInputChange={setRepoPathInput}
            onAddRepo={() => void addRepo()}
            onRefresh={() => void refreshSelectedRepo()}
            onRemoveRepo={repoPath => void removeRepo(repoPath)}
            onSelectRepo={setSelectedRepoPath}
            onCheckoutBranch={(repoPath, branch) => void checkoutBranch(repoPath, branch)}
          />

          <FilesPanel
            selectedRepo={selectedRepo}
            files={files}
            filteredFiles={filteredFiles}
            selectedFile={selectedFile}
            selectedFilePaths={selectedFilePaths}
            query={query}
            totals={totals}
            onQueryChange={setQuery}
            onSelectFile={setSelectedPath}
            onToggleFile={path => setSelectedFilePaths(previous => toggleFilePath(previous, path))}
          />
        </aside>

        <div className="diff-stage">
          <DiffPane
            selectedRepo={selectedRepo}
            selectedFile={selectedFile}
            diffMode={diffMode}
            loadingDiff={loadingDiff}
            emptyTitle={selectedRepo ? 'Working tree clean' : 'No repository selected'}
            emptyMessage={selectedRepo
              ? 'There are no unstaged or staged file changes to review in this repository.'
              : 'Click the plus button in Repository to choose a local Git folder.'}
            onDiffModeChange={setDiffMode}
          />
        </div>

        <aside className="tool-rail tool-rail-right">
          <GitActionsPanel
            selectedRepo={selectedRepo}
            files={files}
            selectedFiles={selectedFiles}
            commitMessage={commitMessage}
            rebaseTarget={rebaseTarget}
            rebaseBranch={rebaseBranch}
            operationLoading={operationLoading}
            gitOutput={gitOutput}
            onSelectAll={() => setSelectedFilePaths(new Set(allFilePaths))}
            onClearSelection={() => setSelectedFilePaths(new Set())}
            onRejectSelected={() => void rejectSelectedFiles()}
            onCommitMessageChange={setCommitMessage}
            onRebaseBranchChange={setRebaseBranch}
            onGitAction={(action, options) => void runGitAction(action, options)}
          />
        </aside>
      </div>
    </main>
  )
}

function useLocalStorageState<T>(key: string, fallback: T, isValid?: (value: string) => boolean) {
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(key)
    if (stored && (!isValid || isValid(stored))) return stored as T
    return fallback
  })

  useEffect(() => {
    window.localStorage.setItem(key, String(value))
  }, [key, value])

  return [value, setValue] as const
}

function pickSelectedRepoPath(current: string, repos: RepoSummary[]) {
  if (current && repos.some(repo => repo.path === current)) return current
  const stored = window.localStorage.getItem('git-viewer-selected-repo')
  if (stored && repos.some(repo => repo.path === stored)) return stored
  return repos[0]?.path ?? ''
}

function pickRebaseTarget(selectedRepo: RepoSummary | null, rebaseBranch: string) {
  if (!selectedRepo) return ''
  if (rebaseBranch && selectedRepo.branches.includes(rebaseBranch) && rebaseBranch !== selectedRepo.branch) {
    return rebaseBranch
  }
  return selectedRepo.branches.find(branch => ['develop', 'development', 'master', 'main'].includes(branch) && branch !== selectedRepo.branch)
    ?? selectedRepo.branches.find(branch => branch !== selectedRepo.branch)
    ?? ''
}

function toggleFilePath(previous: Set<string>, path: string) {
  const next = new Set(previous)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  return next
}
