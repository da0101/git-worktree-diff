import { parseDiff } from '@/utils/parseDiff'
import type { FileDiff } from '@/types/git'

function splitUnifiedDiff(raw: string): string[] {
  const normalized = raw.trim()
  if (!normalized) return []

  const lines = normalized.split('\n')
  const chunks: string[] = []
  let current: string[] = []

  for (const line of lines) {
    if (line.startsWith('diff --git ') && current.length > 0) {
      chunks.push(current.join('\n'))
      current = [line]
      continue
    }
    current.push(line)
  }

  if (current.length > 0) chunks.push(current.join('\n'))
  return chunks
}

function detectStatus(raw: string): FileDiff['status'] {
  if (raw.includes('new file mode') || raw.includes('--- /dev/null')) return 'added'
  if (raw.includes('deleted file mode') || raw.includes('+++ /dev/null')) return 'deleted'
  return 'modified'
}

export function parseFileDiffs(raw: string): FileDiff[] {
  return splitUnifiedDiff(raw)
    .map((chunk, index) => {
      const parsed = parseDiff(chunk)
      if (!parsed) return null

      return {
        id: `${parsed.file}-${index}`,
        path: parsed.file,
        parsed,
        status: detectStatus(chunk),
      } satisfies FileDiff
    })
    .filter((file): file is FileDiff => Boolean(file))
}

export function statusLabel(status: FileDiff['status']) {
  if (status === 'added') return 'A'
  if (status === 'deleted') return 'D'
  return 'M'
}

export function statusClass(status: FileDiff['status']) {
  if (status === 'added') return 'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/10'
  if (status === 'deleted') return 'text-[var(--red)] border-[var(--red)]/30 bg-[var(--red)]/10'
  return 'text-[var(--blue)] border-[var(--blue)]/30 bg-[var(--blue)]/10'
}
