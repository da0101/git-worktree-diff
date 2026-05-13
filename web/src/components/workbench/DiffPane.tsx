import { FileCode2, FolderGit2, Loader2 } from 'lucide-react'
import { DiffView } from '@/components/diff'
import type { DiffMode, FileDiff, RepoSummary } from '@/types/git'

interface DiffPaneProps {
  selectedRepo: RepoSummary | null
  selectedFile: FileDiff | null
  diffMode: DiffMode
  loadingDiff: boolean
  emptyTitle: string
  emptyMessage: string
  onDiffModeChange: (mode: DiffMode) => void
}

export function DiffPane({
  selectedRepo,
  selectedFile,
  diffMode,
  loadingDiff,
  emptyTitle,
  emptyMessage,
  onDiffModeChange,
}: DiffPaneProps) {
  return (
    <section className="diff-pane min-w-0 space-y-3">
      <div className="panel flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="panel-title">
            <FileCode2 size={15} />
            {selectedFile?.path ?? 'No diff loaded'}
          </div>
          <p className="mt-1 text-xs text-[var(--text-dim)]">
            {selectedRepo
              ? `Showing working-tree diff for ${selectedRepo.path}.`
              : 'Track a repository to inspect real working-tree changes.'}
          </p>
        </div>

        {selectedFile && (
          <div className="segmented" aria-label="Diff view mode">
            <button
              className={diffMode === 'unified' ? 'active' : ''}
              onClick={() => onDiffModeChange('unified')}
            >
              Unified
            </button>
            <button
              className={diffMode === 'split' ? 'active' : ''}
              onClick={() => onDiffModeChange('split')}
            >
              Split
            </button>
          </div>
        )}
      </div>

      {selectedFile ? (
        <DiffView
          key={`${selectedFile.path}-${diffMode}`}
          diff={selectedFile.parsed}
          file={selectedFile.path}
          mode={diffMode}
          defaultExpanded
          className="diff-panel"
        />
      ) : (
        <div className="empty-state">
          {loadingDiff ? <Loader2 size={28} className="animate-spin" /> : <FolderGit2 size={28} />}
          <h2>{loadingDiff ? 'Loading repository diff' : emptyTitle}</h2>
          <p>{loadingDiff ? 'Reading working-tree changes from the local backend.' : emptyMessage}</p>
        </div>
      )}
    </section>
  )
}
