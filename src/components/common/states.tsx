import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center', className)}>
      <p className="font-semibold">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'Não foi possível carregar', className }: { error: unknown; onRetry?: () => void; title?: string; className?: string }) {
  const e = ApiError.from(error)
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-10 text-center', className)}>
      <p className="font-semibold text-destructive">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{e.message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}

export function InlineError({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <span aria-hidden="true">⚠</span> {children}
    </p>
  )
}
