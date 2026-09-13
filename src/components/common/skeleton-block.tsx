import { cn } from '@/lib/utils'

/** Shimmer skeleton that reserves the final dimensions (no layout shift). */
export function SkeletonBlock({ className, ...props }: React.ComponentProps<'div'>) {
  return <div aria-hidden="true" data-testid="skeleton" className={cn('skeleton-shimmer rounded-md', className)} {...props} />
}
