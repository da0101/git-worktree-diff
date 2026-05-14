import { Search } from 'lucide-react'
import { DiffBadge } from '@/components/diff'
import { statusClass, statusLabel } from '@/lib/diffFiles'
import type { FileDiff, RepoSummary } from '@/types/git'

interface FilesPanelProps {
  selectedRepo: RepoSummary | null
  files: FileDiff[]
  filteredFiles: FileDiff[]
  selectedFile: FileDiff | null
  selectedFilePaths: Set<string>
  query: string
  totals: { additions: number; deletions: number }
  onQueryChange: (value: string) => void
  onSelectFile: (path: string) => void
  onToggleFile: (path: string) => void
}

export function FilesPanel({
  selectedRepo,
  files,
  filteredFiles,
  selectedFile,
  selectedFilePaths,
  query,
  totals,
  onQueryChange,
  onSelectFile,
  onToggleFile,
}: FilesPanelProps) {
  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="field-label">Changes</span>
        {selectedRepo && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[var(--green)]">+{totals.additions}</span>
            <span className="text-[var(--red)]">-{totals.deletions}</span>
            <span className="text-[var(--text-soft)]">{files.length} files</span>
          </div>
        )}
      </div>

      {selectedRepo ? (
        <>
          <label className="search-box mb-2">
            <Search size={13} />
            <input
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="Filter files"
            />
          </label>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-px pr-0.5">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                className={`file-row ${selectedFile?.path === file.path ? 'file-row-active' : ''}`}
                onClick={() => onSelectFile(file.path)}
              >
                <input
                  type="checkbox"
                  checked={selectedFilePaths.has(file.path)}
                  onChange={e => { e.stopPropagation(); onToggleFile(file.path) }}
                  onClick={e => e.stopPropagation()}
                  aria-label={`Select ${file.path}`}
                />
                <span className={`status-pill ${statusClass(file.status)}`}>{statusLabel(file.status)}</span>
                <span className="file-path-label" title={file.path}>{file.path}</span>
                <DiffBadge additions={file.parsed.additions} deletions={file.parsed.deletions} />
              </div>
            ))}
            {filteredFiles.length === 0 && (
              <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--text-dim)]">
                {files.length === 0 ? 'No changed files.' : 'No files match this filter.'}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[var(--text-dim)] text-center px-4">
            Open a repository to see changed files.
          </p>
        </div>
      )}
    </div>
  )
}
