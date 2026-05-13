import { useState } from 'react'
import { Send, MessageSquare, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import type { ReviewComment } from '@/types/review'

interface InlineCommentThreadProps {
  comment: ReviewComment
  getPersonaColor?: (name: string) => string
  onReply?: (commentId: string, message: string) => void
  defaultExpanded?: boolean
}

function ThreadBubble({
  author,
  message,
  createdAt,
  color,
  isYou,
}: {
  author: string
  message: string
  createdAt: number
  color: string
  isYou: boolean
}) {
  const timeStr = new Date(createdAt * 1000).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-start gap-2 py-1.5">
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[8px] font-bold mt-0.5"
        style={
          isYou
            ? { background: 'var(--blue)', color: 'white', borderColor: 'var(--blue)' }
            : { background: color + '18', color, borderColor: color + '50' }
        }
      >
        {isYou ? 'Y' : author.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[10px]">
          <span className="font-semibold" style={{ color: isYou ? 'var(--blue)' : color }}>
            {isYou ? 'You' : author}
          </span>
          <span className="text-[var(--text-soft)]">{timeStr}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-[var(--text)] whitespace-pre-wrap break-words leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  )
}

export function InlineCommentThread({ comment, getPersonaColor, onReply, defaultExpanded = false }: InlineCommentThreadProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [replyText, setReplyText] = useState('')
  const agentColor = getPersonaColor?.(comment.targetAgent) ?? '#C9D1D9'

  const handleSubmitReply = () => {
    const text = replyText.trim()
    if (!text || !onReply) return
    onReply(comment.id, text)
    setReplyText('')
  }

  const isWaiting = comment.status === 'pending'
  const isFileLevel = comment.startLine === 0 && comment.endLine === 0
  const replyCount = (comment.agentReply ? 1 : 0) + comment.thread.length

  // Build summary for collapsed view
  const summaryLabel = isFileLevel
    ? 'File rejected'
    : `Lines ${comment.startLine}–${comment.endLine}`
  const statusLabel = isWaiting
    ? `${comment.targetAgent} is thinking...`
    : replyCount > 0
    ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
    : 'No replies yet'

  return (
    <div className={`rounded-lg border overflow-hidden transition-colors ${
      isFileLevel
        ? 'border-[var(--red)]/25 bg-[var(--red)]/[0.04]'
        : 'border-[var(--blue)]/25 bg-[var(--blue)]/[0.04]'
    }`}>
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
      >
        {expanded
          ? <ChevronDown size={10} className="text-[var(--text-dim)] shrink-0" />
          : <ChevronRight size={10} className="text-[var(--text-dim)] shrink-0" />
        }
        {isFileLevel
          ? <AlertTriangle size={10} className="text-[var(--red)] shrink-0" />
          : <MessageSquare size={10} className="text-[var(--blue)] shrink-0" />
        }
        <span className={`text-[10px] font-semibold ${isFileLevel ? 'text-[var(--red)]' : 'text-[var(--blue)]'}`}>
          {summaryLabel}
        </span>
        <span className="text-[9px] text-[var(--text-soft)] truncate flex-1">
          {comment.userComment.length > 60 ? comment.userComment.slice(0, 60) + '...' : comment.userComment}
        </span>
        <span className={`text-[9px] shrink-0 ${isWaiting ? 'text-[var(--text-soft)] animate-pulse' : 'text-[var(--text-dim)]'}`}>
          {statusLabel}
        </span>
      </button>

      {/* Expanded thread body */}
      {expanded && (
        <div className="border-t border-[var(--border)]/30 px-3 pb-2.5">
          {/* Initial user comment */}
          <ThreadBubble
            author="You"
            message={comment.userComment}
            createdAt={comment.createdAt}
            color="var(--blue)"
            isYou
          />

          {/* First agent reply */}
          {comment.agentReply && (
            <ThreadBubble
              author={comment.targetAgent}
              message={comment.agentReply}
              createdAt={comment.createdAt + 1}
              color={agentColor}
              isYou={false}
            />
          )}

          {/* Subsequent thread replies */}
          {comment.thread.map((reply, i) => (
            <ThreadBubble
              key={reply.id || i}
              author={reply.author}
              message={reply.message}
              createdAt={reply.createdAt}
              color={reply.author === 'You' ? 'var(--blue)' : agentColor}
              isYou={reply.author === 'You'}
            />
          ))}

          {/* Waiting indicator */}
          {isWaiting && (
            <div className="flex items-center gap-2 py-1.5 pl-7">
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[8px] font-bold"
                style={{ background: agentColor + '18', color: agentColor, borderColor: agentColor + '50' }}
              >
                {comment.targetAgent.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[10px] text-[var(--text-soft)] animate-pulse">
                {comment.targetAgent} is thinking...
              </span>
            </div>
          )}

          {/* Reply input */}
          {onReply && !isWaiting && (
            <div className="flex items-center gap-1.5 pt-1.5 mt-1 border-t border-[var(--border)]/20">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmitReply() }}
                placeholder="Reply..."
                className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--text)] placeholder:text-[var(--text-soft)] outline-none focus:border-[var(--blue)]/60"
              />
              <button
                onClick={handleSubmitReply}
                disabled={!replyText.trim()}
                className="cursor-pointer p-1 rounded-md text-[var(--blue)] hover:bg-[var(--blue)]/10 transition-colors disabled:opacity-30 disabled:cursor-default"
              >
                <Send size={10} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
