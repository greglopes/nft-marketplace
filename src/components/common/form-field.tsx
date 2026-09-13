import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { InlineError } from './states'

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined; 'aria-required': boolean | undefined }) => React.ReactNode
}

/** Associates label, hint and error message with the control (a11y). */
export function FormField({ id, label, required, error, hint, className, children }: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} className={cn('text-xs text-foreground', required && "after:ml-0.5 after:text-primary after:content-['*']")}>
        {label}
      </Label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? <InlineError id={errorId}>{error}</InlineError> : null}
    </div>
  )
}
