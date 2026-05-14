import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { MouseEvent, ReactElement } from 'react'
import { ChevronDown, ChevronRight, ChevronsUpDown, FileCode, MessageSquare, Maximize2, X } from 'lucide-react'
import { parseDiff, type ParsedDiff, type DiffLine } from '@/utils/parseDiff'
import { DiffBadge } from './DiffBadge'
import type { ReviewComment } from '@/types/review'

type DiffMode = 'unified' | 'split'

interface DiffViewProps {
  /** Raw unified diff string or pre-parsed diff */
  diff: string | ParsedDiff
  /** Override the filename shown in the header */
  file?: string
  defaultExpanded?: boolean
  mode?: DiffMode
  className?: string
  /** Review features (all optional — backward compatible) */
  selectedLines?: { startIndex: number; endIndex: number } | null
  comments?: ReviewComment[]
  lineAuthors?: Record<number, string>
  onLineClick?: (lineIndex: number, shiftKey: boolean) => void
  onLineDragStart?: (lineIndex: number) => void
  onLineDragMove?: (lineIndex: number) => void
  onAddComment?: (startIndex: number, endIndex: number) => void
  getPersonaColor?: (name: string) => string
}

interface SplitRow {
  kind: 'hunk' | 'pair' | 'context'
  left?: string
  right?: string
  content?: string
}

// --- GitHub-style collapsed sections ---

const CONTEXT_LINES = 3
const COLLAPSE_MIN = 6

type DiffSection =
  | { kind: 'visible'; lines: DiffLine[] }
  | { kind: 'collapsed'; lines: DiffLine[]; id: string }

function buildCollapsibleSections(lines: DiffLine[]): DiffSection[] {
  const working = lines.filter(l => l.type !== 'file')
  if (working.length === 0) return []

  const keepVisible = new Set<number>()
  for (let i = 0; i < working.length; i++) {
    const t = working[i].type
    if (t === 'add' || t === 'del' || t === 'hunk') {
      keepVisible.add(i)
      for (let c = 1; c <= CONTEXT_LINES; c++) {
        if (i - c >= 0) keepVisible.add(i - c)
        if (i + c < working.length) keepVisible.add(i + c)
      }
    }
  }

  if (keepVisible.size === working.length) {
    return [{ kind: 'visible', lines: working }]
  }

  const raw: DiffSection[] = []
  let i = 0
  let cnt = 0

  while (i < working.length) {
    if (keepVisible.has(i)) {
      const start = i
      while (i < working.length && keepVisible.has(i)) i++
      raw.push({ kind: 'visible', lines: working.slice(start, i) })
    } else {
      const start = i
      while (i < working.length && !keepVisible.has(i)) i++
      const hidden = working.slice(start, i)
      if (hidden.length >= COLLAPSE_MIN) {
        raw.push({ kind: 'collapsed', lines: hidden, id: `c${cnt++}` })
      } else {
        const prev = raw[raw.length - 1]
        if (prev?.kind === 'visible') {
          prev.lines.push(...hidden)
        } else {
          raw.push({ kind: 'visible', lines: hidden })
        }
      }
    }
  }

  // Merge adjacent visible sections
  const merged: DiffSection[] = []
  for (const s of raw) {
    const prev = merged[merged.length - 1]
    if (s.kind === 'visible' && prev?.kind === 'visible') {
      prev.lines.push(...s.lines)
    } else {
      merged.push(s)
    }
  }
  return merged
}

// --- Split view builder ---

function buildSplitRows(parsed: ParsedDiff): SplitRow[] {
  const rows: SplitRow[] = []
  const pendingDeletes: string[] = []
  const pendingAdds: string[] = []

  const flushPairs = () => {
    const length = Math.max(pendingDeletes.length, pendingAdds.length)
    for (let index = 0; index < length; index += 1) {
      rows.push({ kind: 'pair', left: pendingDeletes[index] ?? '', right: pendingAdds[index] ?? '' })
    }
    pendingDeletes.length = 0
    pendingAdds.length = 0
  }

  for (const line of parsed.lines) {
    if (line.type === 'file') continue
    if (line.type === 'add') { pendingAdds.push(line.content); continue }
    if (line.type === 'del') { pendingDeletes.push(line.content); continue }
    if (pendingDeletes.length || pendingAdds.length) flushPairs()
    rows.push(line.type === 'hunk'
      ? { kind: 'hunk', content: line.content }
      : { kind: 'context', content: line.content })
  }

  if (pendingDeletes.length || pendingAdds.length) flushPairs()
  return rows
}

// --- Line renderer ---

const DIFF_FONT = '"SF Mono", "Fira Code", "JetBrains Mono", ui-monospace, monospace'

interface DiffLineRowProps {
  line: DiffLine
  lineIndex?: number
  isSelected?: boolean
  author?: string
  authorColor?: string
  onClick?: (lineIndex: number, shiftKey: boolean) => void
  onGutterMouseDown?: (lineIndex: number) => void
  onGutterMouseEnter?: (lineIndex: number) => void
}

function DiffLineRow({ line, lineIndex, isSelected, author, authorColor, onClick, onGutterMouseDown, onGutterMouseEnter }: DiffLineRowProps) {
  if (line.type === 'hunk') {
    return (
      <div className="flex py-[2px] bg-[var(--blue)]/8 border-y border-[var(--border)]/30 select-none">
        {/* Gutter placeholder matching old+new columns */}
        <span className="w-9 shrink-0 border-r border-[var(--border)]/30" />
        <span className="w-9 shrink-0 border-r border-[var(--border)]/30" />
        <span className="w-5 shrink-0" />
        <span className="text-[var(--blue)] text-[10px] px-1">{line.content}</span>
      </div>
    )
  }

  const isAdd = line.type === 'add'
  const isDel = line.type === 'del'

  const selBg = isSelected ? 'bg-[var(--blue)]/[0.18]' : ''
  const rowBg = selBg || (isAdd
    ? 'bg-[var(--green)]/[0.12] hover:bg-[var(--green)]/[0.18]'
    : isDel
    ? 'bg-[var(--red)]/[0.12] hover:bg-[var(--red)]/[0.18]'
    : 'hover:bg-white/[0.02]')

  const markerColor = isAdd
    ? 'text-[var(--green)]'
    : isDel
    ? 'text-[var(--red)]'
    : 'text-[var(--text-soft)]'

  const marker = isAdd ? '+' : isDel ? '-' : ' '

  const handleClick = onClick && lineIndex !== undefined
    ? (e: MouseEvent) => onClick(lineIndex, e.shiftKey)
    : undefined

  const handleMouseDown = onGutterMouseDown && lineIndex !== undefined
    ? (e: MouseEvent) => { e.preventDefault(); onGutterMouseDown(lineIndex) }
    : undefined

  const handleMouseEnter = onGutterMouseEnter && lineIndex !== undefined
    ? () => onGutterMouseEnter(lineIndex)
    : undefined

  return (
    <div className={`flex items-start leading-5 ${rowBg}`}>
      <span
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        className={`select-none text-right text-[var(--text-soft)] w-9 shrink-0 px-1.5 border-r border-[var(--border)]/30 text-[10px] leading-5 ${handleClick ? 'cursor-pointer hover:bg-[var(--blue)]/10' : ''}`}
      >
        {isDel || line.type === 'ctx' ? line.oldLineNum ?? '' : ''}
      </span>
      <span
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        className={`select-none text-right text-[var(--text-soft)] w-9 shrink-0 px-1.5 border-r border-[var(--border)]/30 text-[10px] leading-5 ${handleClick ? 'cursor-pointer hover:bg-[var(--blue)]/10' : ''}`}
      >
        {isAdd || line.type === 'ctx' ? line.newLineNum ?? '' : ''}
      </span>
      {author && isAdd ? (
        <span className="flex items-center gap-0.5 w-[70px] shrink-0 px-1 text-[9px] text-[var(--text-dim)] truncate border-r border-[var(--border)]/30">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: authorColor || '#C9D1D9' }} />
          <span className="truncate">{author}</span>
        </span>
      ) : author !== undefined ? (
        <span className="w-[70px] shrink-0 border-r border-[var(--border)]/30" />
      ) : null}
      <span className={`${markerColor} select-none w-5 shrink-0 text-center text-[11px]`}>{marker}</span>
      <span className="text-[var(--text)] whitespace-pre flex-1 pr-3 text-[11px]">{line.content}</span>
    </div>
  )
}

// --- Main component ---

export function DiffView({
  diff,
  file: fileProp,
  defaultExpanded = false,
  mode = 'unified',
  className = '',
  selectedLines,
  comments,
  lineAuthors,
  onLineClick,
  onLineDragStart,
  onLineDragMove,
  onAddComment,
  getPersonaColor,
}: DiffViewProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [fullDiffOpen, setFullDiffOpen] = useState(false)
  const isDragging = useRef(false)

  // Clear dragging on mouseup anywhere
  useEffect(() => {
    const handleMouseUp = () => { isDragging.current = false }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const handleGutterMouseDown = useCallback((lineIndex: number) => {
    isDragging.current = true
    onLineDragStart?.(lineIndex)
  }, [onLineDragStart])

  const handleGutterMouseEnter = useCallback((lineIndex: number) => {
    if (isDragging.current) {
      onLineDragMove?.(lineIndex)
    }
  }, [onLineDragMove])

  const parsed = useMemo(() => (
    typeof diff === 'string' ? parseDiff(diff) : diff
  ), [diff])

  const splitRows = useMemo(() => (
    parsed && mode === 'split' ? buildSplitRows(parsed) : []
  ), [mode, parsed])

  const sections = useMemo(() => (
    parsed && mode === 'unified' ? buildCollapsibleSections(parsed.lines) : []
  ), [mode, parsed])

  const hasCollapsedSections = sections.some(s => s.kind === 'collapsed')
  const totalLines = parsed?.lines.filter(l => l.type !== 'file').length ?? 0

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const ids = sections
      .filter((s): s is Extract<DiffSection, { kind: 'collapsed' }> => s.kind === 'collapsed')
      .map(s => s.id)
    setExpandedSections(new Set(ids))
  }, [sections])

  if (!parsed) return null

  const displayFile = fileProp || parsed.file

  return (
    <>
      <div className={`rounded-md border border-[var(--border)] overflow-hidden font-mono text-[11px] ${className}`} style={{ fontFamily: DIFF_FONT }}>
        {/* Header */}
        <div className="flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 bg-[var(--surface-muted)] border-b border-[var(--border)]/60">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex cursor-pointer items-center gap-1.5 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
          >
            {expanded
              ? <ChevronDown size={10} className="text-[var(--text-dim)] shrink-0" />
              : <ChevronRight size={10} className="text-[var(--text-dim)] shrink-0" />
            }
            <FileCode size={10} className="text-[var(--text-dim)] shrink-0" />
            <span className="flex-1 text-[var(--text)] truncate">{displayFile}</span>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <DiffBadge additions={parsed.additions} deletions={parsed.deletions} />
            {expanded && hasCollapsedSections && (
              <button
                onClick={expandAll}
                className="cursor-pointer text-[var(--text-dim)] hover:text-[var(--text)] px-1.5 py-0.5 rounded text-[9px] hover:bg-[var(--border)] transition-colors"
              >
                Expand all
              </button>
            )}
            <button
              onClick={() => setFullDiffOpen(true)}
              className="flex cursor-pointer items-center gap-0.5 text-[var(--text-dim)] hover:text-[var(--text)] px-1.5 py-0.5 rounded text-[9px] hover:bg-[var(--border)] transition-colors"
            >
              <Maximize2 size={8} />
              Full diff
            </button>
          </div>
        </div>

        {/* Diff body */}
        {expanded && (
          mode === 'split' ? (
            <div className="diff-scroll-body bg-[var(--bg)]">
              {splitRows.map((row, index) => {
                if (row.kind === 'hunk') {
                  return (
                    <div
                      key={`hunk-${index}`}
                      className="px-3 py-[2px] bg-[var(--blue)]/8 text-[var(--blue)] text-[10px] select-none border-b border-[var(--border)]/40"
                    >
                      {row.content}
                    </div>
                  )
                }
                if (row.kind === 'context') {
                  return (
                    <div key={`ctx-${index}`} className="grid grid-cols-2 border-b border-[var(--border)]/40">
                      <div className="border-r border-[var(--border)]/40 px-3 py-[2px] text-[var(--text-dim)] whitespace-pre-wrap break-all">{row.content}</div>
                      <div className="px-3 py-[2px] text-[var(--text-dim)] whitespace-pre-wrap break-all">{row.content}</div>
                    </div>
                  )
                }
                return (
                  <div key={`pair-${index}`} className="grid grid-cols-2 border-b border-[var(--border)]/40">
                    <div className="border-r border-[var(--border)]/40 bg-[var(--red)]/[0.12] px-3 py-[2px] text-[var(--text)] whitespace-pre-wrap break-all">{row.left}</div>
                    <div className="bg-[var(--green)]/[0.12] px-3 py-[2px] text-[var(--text)] whitespace-pre-wrap break-all">{row.right}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="diff-scroll-body bg-[var(--bg)]">
              {(() => {
                const hasAuthors = lineAuthors && Object.keys(lineAuthors).length > 0
                let globalIdx = 0
                return sections.flatMap((section, si) => {
                  if (section.kind === 'collapsed') {
                    if (expandedSections.has(section.id)) {
                      return section.lines.map((line, li) => {
                        const idx = globalIdx++
                        return <DiffLineRow key={`${si}-${li}`} line={line} lineIndex={idx} />
                      })
                    }
                    globalIdx += section.lines.length
                    return [
                      <button
                        key={section.id}
                        onClick={() => toggleSection(section.id)}
                        className="w-full cursor-pointer px-3 py-1.5 bg-[var(--surface-muted)] hover:bg-[var(--border)] text-[var(--text-dim)] text-[10px] border-y border-[var(--border)]/40 flex items-center gap-1.5 transition-colors"
                      >
                        <ChevronsUpDown size={9} className="shrink-0" />
                        <span>Expand {section.lines.length} hidden lines</span>
                      </button>,
                    ]
                  }
                  const elements: ReactElement[] = []
                  for (let li = 0; li < section.lines.length; li++) {
                    const line = section.lines[li]
                    const idx = globalIdx++
                    const isSel = selectedLines
                      ? idx >= Math.min(selectedLines.startIndex, selectedLines.endIndex)
                        && idx <= Math.max(selectedLines.startIndex, selectedLines.endIndex)
                      : false
                    const newLine = line.newLineNum
                    const author = hasAuthors && line.type === 'add' && newLine
                      ? lineAuthors[newLine] : undefined
                    const color = author && getPersonaColor ? getPersonaColor(author) : undefined
                    elements.push(
                      <DiffLineRow
                        key={`${si}-${li}`}
                        line={line}
                        lineIndex={idx}
                        isSelected={isSel}
                        author={hasAuthors ? (author || '') : undefined}
                        authorColor={color}
                        onClick={onLineClick}
                        onGutterMouseDown={onLineDragStart ? handleGutterMouseDown : undefined}
                        onGutterMouseEnter={onLineDragMove ? handleGutterMouseEnter : undefined}
                      />,
                    )

                    // Show "Comment" button after last selected line
                    if (isSel && selectedLines && idx === Math.max(selectedLines.startIndex, selectedLines.endIndex) && onAddComment) {
                      elements.push(
                        <div key={`comment-btn-${idx}`} className="flex justify-end px-3 py-1 bg-[var(--blue)]/5 border-y border-[var(--blue)]/20">
                          <button
                            onClick={() => onAddComment(
                              Math.min(selectedLines.startIndex, selectedLines.endIndex),
                              Math.max(selectedLines.startIndex, selectedLines.endIndex),
                            )}
                            className="cursor-pointer rounded-md bg-[var(--blue)] px-3 py-1 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity"
                          >
                            Comment
                          </button>
                        </div>,
                      )
                    }

                    // Show small comment indicator for lines with threads
                    if (comments) {
                      const lineComments = comments.filter(
                        c => c.startLine > 0 && c.endLine === (line.newLineNum ?? 0) && c.filePath === fileProp,
                      )
                      if (lineComments.length > 0) {
                        const total = lineComments.reduce((n, c) => n + 1 + (c.agentReply ? 1 : 0) + c.thread.length, 0)
                        elements.push(
                          <div key={`indicator-${idx}`} className="flex items-center gap-1.5 px-3 py-0.5 bg-[var(--blue)]/[0.04] border-y border-[var(--blue)]/10">
                            <MessageSquare size={9} className="text-[var(--blue)]" />
                            <span className="text-[9px] text-[var(--blue)]">
                              {lineComments.length} {lineComments.length === 1 ? 'thread' : 'threads'} · {total} {total === 1 ? 'message' : 'messages'}
                            </span>
                          </div>,
                        )
                      }
                    }
                  }
                  return elements
                })
              })()}
            </div>
          )
        )}
      </div>

      {/* Full diff modal */}
      {fullDiffOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setFullDiffOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[var(--bg)] border border-[var(--border)] rounded-[16px] overflow-hidden"
            style={{ boxShadow: 'var(--panel-shadow)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
              <div className="flex items-center gap-2 font-mono text-[11px] min-w-0">
                <FileCode size={12} className="text-[var(--text-dim)] shrink-0" />
                <span className="text-[var(--text)] truncate max-w-sm">{displayFile}</span>
                <DiffBadge additions={parsed.additions} deletions={parsed.deletions} />
                <span className="text-[var(--text-soft)] text-[10px] shrink-0">{totalLines} lines</span>
              </div>
              <button
                onClick={() => setFullDiffOpen(false)}
                className="cursor-pointer p-1.5 rounded hover:bg-[var(--border)] transition-colors shrink-0 ml-3"
              >
                <X size={14} className="text-[var(--text-dim)]" />
              </button>
            </div>
            <div className="overflow-auto flex-1 font-mono text-[11px] bg-[var(--bg)]" style={{ fontFamily: DIFF_FONT }}>
              {parsed.lines
                .filter(l => l.type !== 'file')
                .map((line, i) => <DiffLineRow key={i} line={line} />)}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
