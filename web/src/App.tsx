import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GitCompareArrows, Moon, Sun } from 'lucide-react'
import { CommitPanel } from '@/components/workbench/CommitPanel'
import { DiffPane } from '@/components/workbench/DiffPane'
import { FilesPanel } from '@/components/workbench/FilesPanel'
import { RepoPicker } from '@/components/nav/RepoPicker'
import { BranchPicker } from '@/components/nav/BranchPicker'
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

  const [sidebarWidth, setSidebarWidth] = useLocalStorageState('git-viewer-sidebar-width', 280)
  const isDragging = useRef(false)
  const dragHandleRef = useRef<HTMLDivElement>(null)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = Number(sidebarWidth)
    isDragging.current = true
    dragHandleRef.current?.classList.add('dragging')

    const onMove = (e: MouseEvent) => {
      const next = Math.max(180, Math.min(520, startWidth + e.clientX - startX))
      setSidebarWidth(next)
    }
    const onUp = () => {
      isDragging.current = false
      dragHandleRef.current?.classList.remove('dragging')
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth, setSidebarWidth])

  const [rawDiff, setRawDiff] = useState('')
  const [query, setQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState('')
  const [selectedWorktreePath, setSelectedWorktreePath] = useLocalStorageState('git-viewer-selected-worktree', '')
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

  // Silent background poll — updates only when content actually changes, no spinner
  const pollDiff = useCallback(async (repoPath: string) => {
    if (!repoPath) return
    try {
      const params = new URLSearchParams({ path: repoPath })
      const result = await api<{ path: string; diff: string }>(`/api/repos/diff?${params}`)
      setRawDiff(prev => prev === result.diff ? prev : result.diff)
    } catch { /* silent */ }
  }, [])

  const pollRepos = useCallback(async () => {
    try {
      const nextRepos = await api<RepoSummary[]>('/api/repos')
      setRepos(prev => {
        const prevJson = JSON.stringify(prev.map(r => ({ p: r.path, c: r.changedFiles, a: r.additions, d: r.deletions })))
        const nextJson = JSON.stringify(nextRepos.map(r => ({ p: r.path, c: r.changedFiles, a: r.additions, d: r.deletions })))
        return prevJson === nextJson ? prev : nextRepos
      })
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadRepos()
    })
  }, [loadRepos])

  // Reset worktree selection when the repo changes
  useEffect(() => {
    setSelectedWorktreePath('')
  }, [selectedRepoPath])

  const diffPath = selectedWorktreePath || selectedRepo?.path || ''

  useEffect(() => {
    if (diffPath) {
      queueMicrotask(() => {
        void loadRepoDiff(diffPath)
      })
    }
  }, [loadRepoDiff, diffPath])

  // Real-time polling — diff every 2.5s, repo metadata every 5s
  useEffect(() => {
    if (!diffPath) return
    const diffTimer = setInterval(() => { void pollDiff(diffPath) }, 2500)
    const repoTimer = setInterval(() => { void pollRepos() }, 5000)
    return () => { clearInterval(diffTimer); clearInterval(repoTimer) }
  }, [diffPath, pollDiff, pollRepos])

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
        <div className="flex items-center gap-2 px-4 py-2">
          {/* Logo */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-strong)]">
            <GitCompareArrows size={16} className="text-[var(--blue)]" />
          </div>

          <div className="w-px h-5 bg-[var(--border)] mx-1 shrink-0" />

          {/* Repo picker */}
          <RepoPicker
            repos={repos}
            selectedRepo={selectedRepo}
            repoPathInput={repoPathInput}
            loadingRepos={loadingRepos}
            onSelect={setSelectedRepoPath}
            onRemove={repoPath => void removeRepo(repoPath)}
            onAdd={() => void addRepo()}
            onPathInputChange={setRepoPathInput}
          />

          {/* Branch / worktree picker */}
          {selectedRepo && (
            <>
              <div className="w-px h-5 bg-[var(--border)] shrink-0" />
              <BranchPicker
                selectedRepo={selectedRepo}
                selectedWorktreePath={selectedWorktreePath}
                loadingDiff={loadingDiff}
                onSelectWorktree={setSelectedWorktreePath}
                onCheckoutBranch={(repoPath, branch) => void checkoutBranch(repoPath, branch)}
              />
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            {apiError && (
              <span className="text-[11px] text-[var(--red)] truncate max-w-xs">{apiError}</span>
            )}
            <button
              className="icon-button"
              onClick={handleThemeToggle}
              aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
              title={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <div className="workbench-shell">
        {/* Left sidebar: files + commit */}
        <aside className="left-sidebar" style={{ width: sidebarWidth }}>
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
          <CommitPanel
            selectedRepo={selectedRepo}
            files={files}
            selectedFiles={selectedFiles}
            commitMessage={commitMessage}
            operationLoading={operationLoading}
            gitOutput={gitOutput}
            onSelectAll={() => setSelectedFilePaths(new Set(allFilePaths))}
            onClearSelection={() => setSelectedFilePaths(new Set())}
            onRejectSelected={() => void rejectSelectedFiles()}
            onCommitMessageChange={setCommitMessage}
            onCommit={() => void runGitAction('commit')}
          />
        </aside>

        {/* Resize handle */}
        <div
          ref={dragHandleRef}
          className="resize-handle"
          onMouseDown={startResize}
        />

        {/* Diff — takes all remaining space */}
        <div className="diff-stage" style={{ flex: 1 }}>
          <DiffPane
            selectedRepo={selectedRepo}
            selectedFile={selectedFile}
            diffMode={diffMode}
            loadingDiff={loadingDiff}
            emptyTitle={selectedRepo ? 'Working tree clean' : 'No repository selected'}
            emptyMessage={selectedRepo
              ? 'There are no unstaged or staged file changes to review in this repository.'
              : 'Add a repository using the picker in the top bar.'}
            onDiffModeChange={setDiffMode}
          />
        </div>
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
