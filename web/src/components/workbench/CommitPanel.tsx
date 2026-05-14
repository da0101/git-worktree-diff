import { GitCommitHorizontal, Loader2, X } from 'lucide-react'
import type { FileDiff, RepoSummary } from '@/types/git'

interface CommitPanelProps {
  selectedRepo: RepoSummary | null
  files: FileDiff[]
  selectedFiles: string[]
  commitMessage: string
  operationLoading: boolean
  gitOutput: string
  onSelectAll: () => void
  onClearSelection: () => void
  onRejectSelected: () => void
  onCommitMessageChange: (value: string) => void
  onCommit: () => void
}

export function CommitPanel({
  selectedRepo,
  files,
  selectedFiles,
  commitMessage,
  operationLoading,
  gitOutput,
  onSelectAll,
  onClearSelection,
  onRejectSelected,
  onCommitMessageChange,
  onCommit,
}: CommitPanelProps) {
  const canCommit = !!selectedRepo && selectedFiles.length > 0 && commitMessage.trim().length > 0 && !operationLoading

  return (
    <section className="panel flex flex-col gap-3">
      {/* Stats row */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--text-dim)]">
          {selectedFiles.length > 0
            ? <><span className="font-semibold text-[var(--text)]">{selectedFiles.length}</span> selected</>
            : <span className="text-[var(--text-soft)]">No files selected</span>}
        </span>
        <span className="text-[var(--text-soft)]">{files.length} changed</span>
      </div>

      {/* Selection controls */}
      {files.length > 0 && (
        <div className="flex gap-1.5">
          <button
            className="compact-button flex-1"
            onClick={onSelectAll}
            disabled={selectedFiles.length === files.length}
          >
            Select all
          </button>
          <button
            className="compact-button flex-1"
            onClick={onClearSelection}
            disabled={selectedFiles.length === 0}
          >
            Clear
          </button>
          <button
            className="compact-button danger"
            onClick={onRejectSelected}
            disabled={selectedFiles.length === 0 || operationLoading}
            title="Discard selected changes"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Commit message */}
      <div>
        <label className="field-label mb-1.5 block" htmlFor="commit-message">
          Summary
        </label>
        <textarea
          id="commit-message"
          className="commit-input"
          value={commitMessage}
          onChange={e => onCommitMessageChange(e.target.value)}
          placeholder="Summary (required)"
          rows={2}
          style={{ minHeight: 52 }}
        />
      </div>

      {/* Commit button */}
      <button
        className="primary-action w-full"
        onClick={onCommit}
        disabled={!canCommit}
      >
        {operationLoading
          ? <Loader2 size={14} className="animate-spin" />
          : <GitCommitHorizontal size={14} />}
        Commit{selectedFiles.length > 0 ? ` ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}` : ''}
      </button>

      {gitOutput && (
        <pre className="git-output">{gitOutput}</pre>
      )}
    </section>
  )
}
