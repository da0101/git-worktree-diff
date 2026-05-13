interface DiffBadgeProps {
  additions: number
  deletions: number
}

export function DiffBadge({ additions, deletions }: DiffBadgeProps) {
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold shrink-0">
      <span className="text-[var(--green)]">+{additions}</span>
      <span className="text-[var(--text-dim)]">/</span>
      <span className="text-[var(--red)]">-{deletions}</span>
    </span>
  )
}
