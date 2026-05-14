import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  id?: string
}

export function Select({ value, options, onChange, disabled, placeholder, id }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} id={id} className="relative w-full min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 border border-[var(--border)] rounded-lg bg-[var(--surface-strong)] text-[var(--text)] px-3 py-2 text-[12px] outline-none hover:border-[var(--border-strong)] disabled:opacity-45 disabled:cursor-default transition-colors"
        style={{ minWidth: 0 }}
      >
        <span className="truncate text-left min-w-0">
          {selected?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-[var(--text-soft)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 border border-[var(--border)] rounded-lg bg-[var(--surface-strong)] overflow-hidden"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={[
                'w-full text-left px-3 py-2 text-[12px] transition-colors truncate block',
                opt.value === value
                  ? 'bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-[var(--blue)] font-medium'
                  : 'text-[var(--text)] hover:bg-[var(--surface-muted)]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
