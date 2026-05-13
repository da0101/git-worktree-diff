import { AlertCircle, FolderGit2, GitBranch, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import type { RepoSummary } from '@/types/git'

interface RepositoryPanelProps {
  repos: RepoSummary[]
  selectedRepo: RepoSummary | null
  repoPathInput: string
  loadingRepos: boolean
  loadingDiff: boolean
  apiError: string
  onRepoPathInputChange: (value: string) => void
  onAddRepo: () => void
  onRefresh: () => void
  onRemoveRepo: (repoPath: string) => void
  onSelectRepo: (repoPath: string) => void
  onCheckoutBranch: (repoPath: string, branch: string) => void
}

export function RepositoryPanel({
  repos,
  selectedRepo,
  repoPathInput,
  loadingRepos,
  loadingDiff,
  apiError,
  onRepoPathInputChange,
  onAddRepo,
  onRefresh,
  onRemoveRepo,
  onSelectRepo,
  onCheckoutBranch,
}: RepositoryPanelProps) {
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
        <label className="field-label" htmlFor="repo-select">Tracked repo</label>
        <div className="select-row">
          <select
            id="repo-select"
            value={selectedRepo?.path ?? ''}
            onChange={event => onSelectRepo(event.target.value)}
            disabled={loadingRepos || repos.length === 0}
          >
            {repos.length === 0 ? (
              <option value="">No repositories tracked</option>
            ) : (
              repos.map(repo => (
                <option key={repo.path} value={repo.path}>{repo.name}</option>
              ))
            )}
          </select>
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

        <label className="field-label" htmlFor="branch-select">Branch</label>
        <select
          id="branch-select"
          value={selectedRepo?.branch ?? ''}
          onChange={event => {
            if (selectedRepo) onCheckoutBranch(selectedRepo.path, event.target.value)
          }}
          disabled={!selectedRepo || selectedRepo.branches.length === 0 || loadingDiff}
        >
          {selectedRepo ? (
            selectedRepo.branches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))
          ) : (
            <option value="">No branch selected</option>
          )}
        </select>

        <label className="field-label" htmlFor="repo-path-input">Add by path</label>
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

        {selectedRepo && (
          <p className="flex items-center gap-2 text-[10px] text-[var(--text-dim)]">
            <GitBranch size={11} />
            {selectedRepo.branch}
          </p>
        )}
      </div>
    </section>
  )
}
