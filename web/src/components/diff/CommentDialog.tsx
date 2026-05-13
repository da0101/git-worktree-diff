import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send } from 'lucide-react'

interface CommentDialogProps {
  filePath: string
  startLine: number
  endLine: number
  targetAgent: string
  agentColor?: string
  onSubmit: (comment: string) => void
  onCancel: () => void
}

export function CommentDialog({
  filePath,
  startLine,
  endLine,
  targetAgent,
  agentColor,
  onSubmit,
  onCancel,
}: CommentDialogProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  const fileName = filePath.split('/').pop() ?? filePath
  const lineLabel = startLine === endLine ? `line ${startLine}` : `lines ${startLine}–${endLine}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
        style={{ boxShadow: 'var(--panel-shadow)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare size={12} className="text-[var(--blue)] shrink-0" />
            <span className="text-[11px] font-semibold text-[var(--text)] truncate">{fileName}</span>
            <span className="text-[10px] text-[var(--text-soft)] shrink-0">{lineLabel}</span>
          </div>
          <button onClick={onCancel} className="cursor-pointer p-1 rounded hover:bg-[var(--border)] transition-colors">
            <X size={12} className="text-[var(--text-dim)]" />
          </button>
        </div>

        {/* Target agent */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wide text-[var(--text-soft)]">Reviewing with</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-medium" style={{ color: agentColor || 'var(--text)' }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: agentColor || '#C9D1D9' }} />
            {targetAgent}
          </span>
        </div>

        {/* Textarea */}
        <div className="px-4 py-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
              if (e.key === 'Escape') onCancel()
            }}
            placeholder="Write your comment..."
            rows={3}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[12px] text-[var(--text)] placeholder:text-[var(--text-soft)] outline-none focus:border-[var(--blue)]/60 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-muted)]">
          <span className="text-[9px] text-[var(--text-soft)]">Cmd+Enter to submit</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onCancel}
              className="cursor-pointer rounded-lg border border-[var(--border)] px-3 py-1 text-[10px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-[var(--blue)] px-3 py-1 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-default"
            >
              <Send size={9} /> Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
