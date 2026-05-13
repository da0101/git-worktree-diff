export type DiffLineType = 'add' | 'del' | 'ctx' | 'hunk' | 'file'

export interface DiffLine {
  type: DiffLineType
  content: string
  oldLineNum?: number
  newLineNum?: number
}

export interface ParsedDiff {
  file: string
  additions: number
  deletions: number
  lines: DiffLine[]
}

/** Parse a unified diff string into structured data. Returns null if no +/- lines found. */
export function parseDiff(raw: string): ParsedDiff | null {
  const rawLines = raw.split('\n')
  const diffLines: DiffLine[] = []
  let file = ''
  let additions = 0
  let deletions = 0
  let oldLine = 0
  let newLine = 0

  for (const line of rawLines) {
    if (line.startsWith('+++ ')) {
      // Extract filename, stripping a/ b/ prefixes from git diff
      const match = line.match(/^\+\+\+ [ab]?\/?(.+)$/)
      if (match) file = match[1]
      diffLines.push({ type: 'file', content: line })
    } else if (line.startsWith('--- ')) {
      diffLines.push({ type: 'file', content: line })
    } else if (line.startsWith('@@')) {
      const hunkMatch = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (hunkMatch) {
        oldLine = parseInt(hunkMatch[1], 10)
        newLine = parseInt(hunkMatch[2], 10)
      }
      diffLines.push({ type: 'hunk', content: line })
    } else if (line.startsWith('+')) {
      additions++
      diffLines.push({ type: 'add', content: line.slice(1), newLineNum: newLine++ })
    } else if (line.startsWith('-')) {
      deletions++
      diffLines.push({ type: 'del', content: line.slice(1), oldLineNum: oldLine++ })
    } else {
      // Context line — strip leading space if present
      diffLines.push({ type: 'ctx', content: line.startsWith(' ') ? line.slice(1) : line, oldLineNum: oldLine++, newLineNum: newLine++ })
    }
  }

  if (additions === 0 && deletions === 0) return null
  return { file: file || 'unknown', additions, deletions, lines: diffLines }
}

/**
 * Heuristic: does this text look like a unified diff?
 * Requires both added and deleted lines (not counting the +++ / --- headers).
 */
export function looksLikeDiff(text: string): boolean {
  if (!text) return false
  const lines = text.split('\n')
  let addCount = 0
  let delCount = 0
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) addCount++
    if (line.startsWith('-') && !line.startsWith('---')) delCount++
    if (addCount > 0 && delCount > 0) return true
  }
  return false
}
