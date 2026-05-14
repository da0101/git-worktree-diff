import { useRef, useState, useEffect } from 'react'
import { Check, ChevronDown, FolderGit2, Plus, Search, Trash2 } from 'lucide-react'
import type { RepoSummary } from '@/types/git'

interface RepoPickerProps {
  repos: RepoSummary[]
  selectedRepo: RepoSummary | null
  repoPathInput: string
  loadingRepos: boolean
  onSelect: (path: string) => void
  onRemove: (path: string) => void
  onAdd: () => void
  onPathInputChange: (value: string) => void
}

export function RepoPicker({
  repos,
  selectedRepo,
  repoPathInput,
  loadingRepos,
  onSelect,
  onRemove,
  onAdd,
  onPathInputChange,
}: RepoPickerProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = repos.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface-strong)] hover:bg-[var(--surface-muted)] transition-colors text-[12px] max-w-[200px]"
      >
        <FolderGit2 size={13} className="text-[var(--text-dim)] shrink-0" />
        <span className="font-medium text-[var(--text)] truncate">
          {selectedRepo?.name ?? 'No repository'}
        </span>
        <ChevronDown size={11} className={`text-[var(--text-soft)] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        >
          {/* Search */}
          <div className="p-2 border-b border-[var(--border)]">
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[12px]">
              <Search size={12} className="text-[var(--text-soft)] shrink-0" />
              <input
                autoFocus
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter repositories…"
                className="flex-1 bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--text-soft)]"
              />
            </label>
          </div>

          {/* Repo list */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-[11px] text-[var(--text-dim)]">No repositories found</p>
            )}
            {filtered.map(repo => (
              <div
                key={repo.path}
                className="group flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-muted)] cursor-pointer"
                onClick={() => { onSelect(repo.path); setOpen(false); setFilter('') }}
              >
                <Check
                  size={12}
                  className={`shrink-0 ${repo.path === selectedRepo?.path ? 'text-[var(--blue)]' : 'text-transparent'}`}
                />
                <FolderGit2 size={13} className="text-[var(--text-dim)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--text)] truncate">{repo.name}</p>
                  <p className="text-[10px] text-[var(--text-soft)] truncate">{repo.path}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onRemove(repo.path) }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--border)] text-[var(--text-dim)] hover:text-[var(--red)] transition-all"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Add repo */}
          <div className="p-2 border-t border-[var(--border)]">
            <div className="flex gap-1.5">
              <input
                value={repoPathInput}
                onChange={e => onPathInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { onAdd(); setOpen(false) } }}
                placeholder="/path/to/repo  or click + to browse"
                className="flex-1 min-w-0 px-2 py-1.5 text-[11px] rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none focus:border-[var(--blue)] placeholder:text-[var(--text-soft)]"
              />
              <button
                onClick={() => { onAdd(); setOpen(false) }}
                disabled={loadingRepos}
                className="px-2 py-1.5 rounded-md bg-[var(--blue)] text-white text-[11px] font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1 shrink-0"
              >
                <Plus size={11} />
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
