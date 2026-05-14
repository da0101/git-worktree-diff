import { AlertCircle, FolderGit2, GitBranch, GitFork, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import type { RepoSummary } from '@/types/git'

interface RepositoryPanelProps {
  repos: RepoSummary[]
  selectedRepo: RepoSummary | null
  selectedWorktreePath: string
  repoPathInput: string
  loadingRepos: boolean
  loadingDiff: boolean
  apiError: string
  onRepoPathInputChange: (value: string) => void
  onAddRepo: () => void
  onRefresh: () => void
  onRemoveRepo: (repoPath: string) => void
  onSelectRepo: (repoPath: string) => void
  onSelectWorktree: (worktreePath: string) => void
  onCheckoutBranch: (repoPath: string, branch: string) => void
}

export function RepositoryPanel({
  repos,
  selectedRepo,
  selectedWorktreePath,
  repoPathInput,
  loadingRepos,
  loadingDiff,
  apiError,
  onRepoPathInputChange,
  onAddRepo,
  onRefresh,
  onRemoveRepo,
  onSelectRepo,
  onSelectWorktree,
  onCheckoutBranch,
}: RepositoryPanelProps) {
  const activeWorktreePath = selectedWorktreePath || selectedRepo?.path || ''
  const isMainWorktree = !selectedWorktreePath || selectedWorktreePath === selectedRepo?.path
  const hasLinkedWorktrees = (selectedRepo?.worktrees.length ?? 0) > 1

  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-3">
        <div className="panel-title">
          <FolderGit2 size={15} />
          Repository
        </div>
        <div className="toolbar-actions">
          <button
            className="icon-button small"
            onClick={onAddRepo}
            disabled={loadingRepos}
            aria-label={repoPathInput.trim() ? 'Track repository path' : 'Choose repository folder'}
            title={repoPathInput.trim() ? 'Track repository path' : 'Choose repository folder'}
          >
            <Plus size={14} />
          </button>
          <button
            className="icon-button small"
            onClick={onRefresh}
            aria-label="Refresh repositories"
            title="Refresh repositories"
          >
            <RefreshCw size={14} className={loadingRepos || loadingDiff ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {apiError && (
        <div className="error-box mt-3">
          <AlertCircle size={14} />
          <span>{apiError}</span>
        </div>
      )}

      <div className="control-stack mt-3">
        {/* Repo selector */}
        <label className="field-label" htmlFor="repo-select">Project</label>
        <div className="select-row">
          <Select
            id="repo-select"
            value={selectedRepo?.path ?? ''}
            options={repos.length === 0
              ? [{ value: '', label: 'No repositories tracked' }]
              : repos.map(repo => ({ value: repo.path, label: repo.name }))}
            onChange={onSelectRepo}
            disabled={loadingRepos || repos.length === 0}
          />
          <button
            className="icon-button small"
            onClick={() => selectedRepo && onRemoveRepo(selectedRepo.path)}
            disabled={!selectedRepo || loadingRepos}
            aria-label="Remove selected repository"
            title="Remove selected repository"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {selectedRepo && (
          <p className="repo-path">{selectedRepo.path}</p>
        )}

        {/* Worktrees — shown when repo has linked worktrees */}
        {selectedRepo && hasLinkedWorktrees && (
          <>
            <label className="field-label mt-1">
              <GitFork size={10} className="inline mr-1" />
              Worktrees
            </label>
            <div className="flex flex-col gap-1">
              {selectedRepo.worktrees.map(wt => {
                const isMain = wt.path === selectedRepo.path
                const isActive = wt.path === activeWorktreePath
                return (
                  <button
                    key={wt.path}
                    onClick={() => onSelectWorktree(wt.path)}
                    disabled={loadingDiff}
                    className={[
                      'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors',
                      isActive
                        ? 'border-[var(--blue)] bg-[color-mix(in_srgb,var(--blue)_10%,transparent)] text-[var(--text)]'
                        : 'border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-dim)] hover:border-[var(--border-strong)] hover:text-[var(--text)]',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-2 min-w-0 truncate">
                      <GitBranch size={11} className="shrink-0" />
                      <span className="truncate">{wt.branch}</span>
                    </span>
                    {isMain && (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-[var(--surface-muted)] text-[var(--text-soft)]">
                        main
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Branch switcher — only for the main worktree */}
        {selectedRepo && isMainWorktree && (
          <>
            <label className="field-label mt-1" htmlFor="branch-select">Branch</label>
            <Select
              id="branch-select"
              value={selectedRepo.branch}
              options={selectedRepo.branches.map(b => ({ value: b, label: b }))}
              onChange={branch => onCheckoutBranch(selectedRepo.path, branch)}
              disabled={selectedRepo.branches.length === 0 || loadingDiff}
            />
          </>
        )}

        {/* Static branch label when viewing a linked worktree */}
        {selectedRepo && !isMainWorktree && (
          <p className="flex items-center gap-2 text-[10px] text-[var(--text-dim)] mt-1">
            <GitBranch size={11} />
            Viewing worktree — branch is fixed
          </p>
        )}

        {/* Add by path */}
        <label className="field-label mt-2" htmlFor="repo-path-input">Add by path</label>
        <div className="repo-form">
          <input
            id="repo-path-input"
            value={repoPathInput}
            onChange={event => onRepoPathInputChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') onAddRepo()
            }}
            placeholder="/Users/name/Documents/GitHub/project"
          />
          <button
            onClick={onAddRepo}
            disabled={loadingRepos}
            aria-label={repoPathInput.trim() ? 'Track repository path' : 'Choose repository folder'}
            title={repoPathInput.trim() ? 'Track repository path' : 'Choose repository folder'}
          >
            <Plus size={14} />
          </button>
        </div>

        {!loadingRepos && repos.length === 0 && (
          <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-5 text-center text-xs text-[var(--text-dim)]">
            Click + to choose a local Git repository.
          </p>
        )}

        {loadingRepos && repos.length === 0 && (
          <p className="flex items-center justify-center gap-2 rounded-md border border-dashed border-[var(--border)] px-3 py-5 text-xs text-[var(--text-dim)]">
            <Loader2 size={14} className="animate-spin" />
            Loading repositories
          </p>
        )}
      </div>
    </section>
  )
}
