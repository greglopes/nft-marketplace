import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  min?: number
  max: number
  onChange: (next: number) => void
  label: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function QuantityStepper({ value, min = 1, max, onChange, label, disabled, size = 'md' }: Props) {
  const btn = cn(
    'inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40',
    size === 'sm' ? 'size-5' : 'size-6',
  )
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} aria-label="Diminuir quantidade" disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="size-3" aria-hidden="true" />
      </button>
      <output aria-live="polite" className={cn('min-w-5 text-center tabular-nums', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {value}
      </output>
      <button type="button" className={btn} aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="size-3" aria-hidden="true" />
      </button>
    </div>
  )
}
