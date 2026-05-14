import { useRef, useState, useEffect } from 'react'
import { Check, ChevronDown, GitBranch, GitFork } from 'lucide-react'
import type { RepoSummary } from '@/types/git'

interface BranchPickerProps {
  selectedRepo: RepoSummary | null
  selectedWorktreePath: string
  onSelectWorktree: (path: string) => void
  onCheckoutBranch: (repoPath: string, branch: string) => void
}

export function BranchPicker({
  selectedRepo,
  selectedWorktreePath,
  onSelectWorktree,
  onCheckoutBranch,
}: BranchPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!selectedRepo) return null

  const activeWorktreePath = selectedWorktreePath || selectedRepo.path
  const activeWorktree = selectedRepo.worktrees.find(wt => wt.path === activeWorktreePath)
  const activeBranch = activeWorktree?.branch ?? selectedRepo.branch
  const hasWorktrees = selectedRepo.worktrees.length > 1

  const isMainWorktree = activeWorktreePath === selectedRepo.path

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface-strong)] hover:bg-[var(--surface-muted)] transition-colors text-[12px] max-w-[220px]"
      >
        <GitBranch size={13} className="text-[var(--text-dim)] shrink-0" />
        <span className="font-medium text-[var(--text)] truncate">{activeBranch}</span>
        {!isMainWorktree && (
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-[var(--text-soft)] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded">
            worktree
          </span>
        )}
        <ChevronDown size={11} className={`text-[var(--text-soft)] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        >
          {/* Worktrees section */}
          {hasWorktrees && (
            <>
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-soft)] flex items-center gap-1.5">
                  <GitFork size={10} />
                  Worktrees
                </p>
              </div>
              {selectedRepo.worktrees.map(wt => {
                const isMain = wt.path === selectedRepo.path
                const isActive = wt.path === activeWorktreePath
                return (
                  <div
                    key={wt.path}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-muted)] cursor-pointer"
                    onClick={() => { onSelectWorktree(wt.path); setOpen(false) }}
                  >
                    <Check size={12} className={`shrink-0 ${isActive ? 'text-[var(--blue)]' : 'text-transparent'}`} />
                    <GitBranch size={12} className="text-[var(--text-dim)] shrink-0" />
                    <span className="flex-1 text-[12px] text-[var(--text)] truncate">{wt.branch}</span>
                    {isMain && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--text-soft)] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded">
                        main
                      </span>
                    )}
                  </div>
                )
              })}
              <div className="border-t border-[var(--border)] mx-2 my-1" />
            </>
          )}

          {/* Branches section — only shown on main worktree */}
          {isMainWorktree && selectedRepo.branches.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-soft)] flex items-center gap-1.5">
                  <GitBranch size={10} />
                  Branches
                </p>
              </div>
              <div className="max-h-52 overflow-y-auto pb-1">
                {selectedRepo.branches.map(branch => (
                  <div
                    key={branch}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-muted)] cursor-pointer"
                    onClick={() => { onCheckoutBranch(selectedRepo.path, branch); setOpen(false) }}
                  >
                    <Check
                      size={12}
                      className={`shrink-0 ${branch === selectedRepo.branch ? 'text-[var(--blue)]' : 'text-transparent'}`}
                    />
                    <GitBranch size={12} className="text-[var(--text-dim)] shrink-0" />
                    <span className="flex-1 text-[12px] text-[var(--text)] truncate">{branch}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {!isMainWorktree && (
            <p className="px-4 py-3 text-[11px] text-[var(--text-dim)] italic">
              Branch is fixed — switch to the main worktree to change branches.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
