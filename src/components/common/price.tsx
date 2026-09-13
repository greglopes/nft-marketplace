import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

export function Price({ value, previous, className, size = 'md' }: { value: string; previous?: string | null; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-2', className)}>
      <span className={cn('font-semibold text-primary', size === 'sm' && 'text-xs', size === 'md' && 'text-sm', size === 'lg' && 'text-xl')}>{formatEth(value)}</span>
      {previous ? (
        <span className={cn('text-muted-foreground line-through', size === 'lg' ? 'text-sm' : 'text-xs')}>
          <span className="sr-only">Preço anterior: </span>
          {formatEth(previous)}
        </span>
      ) : null}
    </span>
  )
}
