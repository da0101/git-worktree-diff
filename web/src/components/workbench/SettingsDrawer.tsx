import { X } from 'lucide-react'
import { RepositoryPanel } from './RepositoryPanel'
import type { RepoSummary } from '@/types/git'

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
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

export function SettingsDrawer({ open, onClose, ...panelProps }: SettingsDrawerProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 flex flex-col w-[340px] bg-[var(--bg)] border-l border-[var(--border)] transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ boxShadow: '-8px 0 32px rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <span className="text-[13px] font-semibold text-[var(--text)]">Repository</span>
          <button
            className="icon-button small"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <RepositoryPanel {...panelProps} />
        </div>
      </div>
    </>
  )
}
