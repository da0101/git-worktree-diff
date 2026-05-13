import { Download, GitCommitHorizontal, Upload, X } from 'lucide-react'
import type { FileDiff, RepoSummary } from '@/types/git'

interface GitActionsPanelProps {
  selectedRepo: RepoSummary | null
  files: FileDiff[]
  selectedFiles: string[]
  commitMessage: string
  rebaseTarget: string
  rebaseBranch: string
  operationLoading: boolean
  gitOutput: string
  onSelectAll: () => void
  onClearSelection: () => void
  onRejectSelected: () => void
  onCommitMessageChange: (value: string) => void
  onRebaseBranchChange: (value: string) => void
  onGitAction: (action: string, options?: { branch?: string }) => void
}

export function GitActionsPanel({
  selectedRepo,
  files,
  selectedFiles,
  commitMessage,
  rebaseTarget,
  rebaseBranch,
  operationLoading,
  gitOutput,
  onSelectAll,
  onClearSelection,
  onRejectSelected,
  onCommitMessageChange,
  onRebaseBranchChange,
  onGitAction,
}: GitActionsPanelProps) {
  return (
    <section className="panel">
      <div className="panel-title">
        <GitCommitHorizontal size={15} />
        Git Actions
      </div>

      <div className="action-summary mt-3">
        <span>{selectedFiles.length} selected</span>
        <span>{files.length} changed</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button className="compact-button" onClick={onSelectAll} disabled={files.length === 0}>
          Select all
        </button>
        <button className="compact-button" onClick={onClearSelection} disabled={selectedFiles.length === 0}>
          Clear
        </button>
        <button className="compact-button danger" onClick={onRejectSelected} disabled={selectedFiles.length === 0 || operationLoading}>
          <X size={13} />
          Reject
        </button>
      </div>

      <label className="field-label mt-3" htmlFor="commit-message">Commit message</label>
      <textarea
        id="commit-message"
        className="commit-input"
        value={commitMessage}
        onChange={event => onCommitMessageChange(event.target.value)}
        placeholder="Describe the selected changes"
        rows={3}
      />

      <label className="field-label mt-3" htmlFor="rebase-select">Rebase onto</label>
      <select
        id="rebase-select"
        value={rebaseTarget}
        onChange={event => onRebaseBranchChange(event.target.value)}
        disabled={!selectedRepo || selectedRepo.branches.length < 2 || operationLoading}
      >
        {selectedRepo?.branches
          .filter(branch => branch !== selectedRepo.branch)
          .map(branch => (
            <option key={branch} value={branch}>{branch}</option>
          ))}
        {!selectedRepo && <option value="">No branch selected</option>}
        {selectedRepo && !rebaseBranch && !rebaseTarget && <option value="">No target branch</option>}
      </select>

      <div className="action-grid mt-3">
        <button
          className="primary-action"
          onClick={() => onGitAction('commit')}
          disabled={!selectedRepo || selectedFiles.length === 0 || !commitMessage.trim() || operationLoading}
        >
          <GitCommitHorizontal size={14} />
          Commit
        </button>
        <button className="compact-button" onClick={() => onGitAction('amend')} disabled={!selectedRepo || operationLoading}>
          Amend
        </button>
        <button className="compact-button" onClick={() => onGitAction('fetch')} disabled={!selectedRepo || operationLoading}>
          <Download size={13} />
          Fetch
        </button>
        <button className="compact-button" onClick={() => onGitAction('pull')} disabled={!selectedRepo || operationLoading}>
          <Download size={13} />
          Pull
        </button>
        <button className="compact-button" onClick={() => onGitAction('push')} disabled={!selectedRepo || operationLoading}>
          <Upload size={13} />
          Push
        </button>
        <button
          className="compact-button"
          onClick={() => onGitAction('rebase', { branch: rebaseTarget })}
          disabled={!selectedRepo || !rebaseTarget || operationLoading}
        >
          Rebase
        </button>
      </div>

      {gitOutput && (
        <pre className="git-output mt-3">{gitOutput}</pre>
      )}
    </section>
  )
}
