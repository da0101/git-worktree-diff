import { PanelLeft, Search } from 'lucide-react'
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
    <section className="panel">
      <div className="panel-title">
        <PanelLeft size={15} />
        Files
      </div>
      {selectedRepo ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="metric">
              <span>{files.length}</span>
              <small>files</small>
            </div>
            <div className="metric text-[var(--green)]">
              <span>+{totals.additions}</span>
              <small>added</small>
            </div>
            <div className="metric text-[var(--red)]">
              <span>-{totals.deletions}</span>
              <small>deleted</small>
            </div>
          </div>

          <label className="search-box mt-3">
            <Search size={14} />
            <input
              value={query}
              onChange={event => onQueryChange(event.target.value)}
              placeholder="Filter files"
            />
          </label>

          <div className="mt-3 max-h-[42vh] space-y-1 overflow-auto pr-1 lg:max-h-[calc(100vh-310px)]">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                className={`file-row ${selectedFile?.path === file.path ? 'file-row-active' : ''}`}
                onClick={() => onSelectFile(file.path)}
              >
                <input
                  type="checkbox"
                  checked={selectedFilePaths.has(file.path)}
                  onChange={event => {
                    event.stopPropagation()
                    onToggleFile(file.path)
                  }}
                  onClick={event => event.stopPropagation()}
                  aria-label={`Select ${file.path}`}
                />
                <span className={`status-pill ${statusClass(file.status)}`}>{statusLabel(file.status)}</span>
                <span className="min-w-0 flex-1 truncate text-left">{file.path}</span>
                <DiffBadge additions={file.parsed.additions} deletions={file.parsed.deletions} />
              </div>
            ))}
            {filteredFiles.length === 0 && (
              <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--text-dim)]">
                {files.length === 0 ? 'No changed files in this repository.' : 'No files match this filter.'}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--text-dim)]">
          Choose a repository to see changed files.
        </div>
      )}
    </section>
  )
}
