import { useState } from 'react'
import { MessageSquare, ChevronDown, ChevronRight, FileCode, AlertTriangle } from 'lucide-react'
import { InlineCommentThread } from './InlineCommentThread'
import type { ReviewComment } from '@/types/review'

interface DiscussionPanelProps {
  comments: ReviewComment[]
  getPersonaColor?: (name: string) => string
  onReply?: (commentId: string, message: string) => void
  /** Show file paths — used in global (all-files) mode */
  showFilePaths?: boolean
  /** Navigate to a file when clicking its path */
  onNavigateToFile?: (filePath: string) => void
  /** Title override */
  title?: string
  /** Start collapsed */
  defaultCollapsed?: boolean
}

export function DiscussionPanel({
  comments,
  getPersonaColor,
  onReply,
  showFilePaths = false,
  onNavigateToFile,
  title,
  defaultCollapsed = false,
}: DiscussionPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  if (comments.length === 0) return null

  const pendingCount = comments.filter(c => c.status === 'pending').length
  const resolvedCount = comments.filter(c => c.status === 'replied').length
  const rejectedCount = comments.filter(c => c.startLine === 0 && c.endLine === 0).length

  // Group by file when showing file paths
  const groupedByFile = showFilePaths
    ? comments.reduce<Record<string, ReviewComment[]>>((acc, c) => {
        (acc[c.filePath] ??= []).push(c)
        return acc
      }, {})
    : null

  // Sort: rejections first, then by line number
  const sortComments = (list: ReviewComment[]) =>
    [...list].sort((a, b) => {
      const aFile = a.startLine === 0 && a.endLine === 0
      const bFile = b.startLine === 0 && b.endLine === 0
      if (aFile && !bFile) return -1
      if (!aFile && bFile) return 1
      return a.startLine - b.startLine
    })

  return (
    <div className="rounded-md border border-[var(--border)] overflow-hidden">
      {/* Panel header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 bg-[var(--surface-muted)] border-b border-[var(--border)]/60 hover:bg-[var(--surface-strong)] transition-colors"
      >
        {collapsed
          ? <ChevronRight size={10} className="text-[var(--text-dim)] shrink-0" />
          : <ChevronDown size={10} className="text-[var(--text-dim)] shrink-0" />
        }
        <MessageSquare size={11} className="text-[var(--text-dim)]" />
        <span className="text-[11px] font-semibold text-[var(--text)]">
          {title ?? 'Discussions'} ({comments.length})
        </span>
        {showFilePaths && groupedByFile && (
          <span className="text-[9px] text-[var(--text-dim)]">
            {Object.keys(groupedByFile).length} {Object.keys(groupedByFile).length === 1 ? 'file' : 'files'}
          </span>
        )}
        {rejectedCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[9px] text-[var(--red)]">
            <AlertTriangle size={8} /> {rejectedCount} rejected
          </span>
        )}
        {pendingCount > 0 && (
          <span className="text-[9px] text-[var(--text-soft)] animate-pulse ml-auto">
            {pendingCount} awaiting reply
          </span>
        )}
        {resolvedCount > 0 && pendingCount === 0 && (
          <span className="text-[9px] text-[var(--green)] ml-auto">
            {resolvedCount} replied
          </span>
        )}
      </button>

      {/* Thread list */}
      {!collapsed && (
        <div className="bg-[var(--bg)]">
          {groupedByFile ? (
            // Global mode: grouped by file
            Object.entries(groupedByFile).map(([filePath, fileComments]) => (
              <div key={filePath} className="border-b border-[var(--border)]/30 last:border-b-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-muted)]/50">
                  <FileCode size={9} className="text-[var(--text-dim)] shrink-0" />
                  {onNavigateToFile ? (
                    <button
                      onClick={() => onNavigateToFile(filePath)}
                      className="cursor-pointer text-[10px] font-medium text-[var(--blue)] hover:underline truncate"
                    >
                      {filePath}
                    </button>
                  ) : (
                    <span className="text-[10px] font-medium text-[var(--text)] truncate">{filePath}</span>
                  )}
                  <span className="text-[9px] text-[var(--text-dim)] shrink-0 ml-auto">
                    {fileComments.length} {fileComments.length === 1 ? 'thread' : 'threads'}
                  </span>
                </div>
                <div className="p-2 space-y-1.5">
                  {sortComments(fileComments).map(comment => (
                    <InlineCommentThread
                      key={comment.id}
                      comment={comment}
                      getPersonaColor={getPersonaColor}
                      onReply={onReply}
                      defaultExpanded={comment.status === 'pending'}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Per-file mode: flat list
            <div className="p-2 space-y-1.5">
              {sortComments(comments).map(comment => (
                <InlineCommentThread
                  key={comment.id}
                  comment={comment}
                  getPersonaColor={getPersonaColor}
                  onReply={onReply}
                  defaultExpanded={comment.status === 'pending'}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
