import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InlineError } from '@/components/common/states'
import { SkeletonBlock } from '@/components/common/skeleton-block'
import { ApiError } from '@/lib/api/client'
import type { Cart, Quote } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money'
import { noticesStore, useNotices } from '@/lib/notices'
import { useApplyCoupon, useRemoveCoupon } from '@/lib/queries'

export function CouponForm({ cart }: { cart: Cart }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const error = apply.error ? ApiError.from(apply.error) : null
  const message = error?.fields?.code ?? error?.message
  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between rounded border border-primary/50 bg-primary/10 px-3 py-2 text-xs" data-testid="coupon-applied">
        <span>
          Cupom <strong>{cart.coupon}</strong> aplicado
        </span>
        <button type="button" aria-label="Remover cupom" onClick={() => remove.mutate()} disabled={remove.isPending} className="text-foreground/70 hover:text-destructive">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    )
  }
  return (
    <form
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault()
        if (code.trim()) apply.mutate(code.trim(), { onSuccess: () => setCode('') })
      }}
    >
      <label htmlFor="coupon" className="text-xs font-semibold">
        Código promocional
      </label>
      <div className="flex gap-2">
        <Input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Digite o código promocional…" className="h-8 text-xs" aria-invalid={!!message} aria-describedby={message ? 'coupon-error' : undefined} />
        <Button type="submit" size="sm" disabled={apply.isPending || !code.trim()}>
          Aplicar
        </Button>
      </div>
      {message ? <InlineError id="coupon-error">{message}</InlineError> : null}
    </form>
  )
}

export function RealtimeNotices() {
  const notices = useNotices()
  return (
    <div aria-live="polite" aria-atomic="false" className="space-y-2">
      {notices.map((n) => (
        <div key={n.id} role="status" data-testid="realtime-notice" className="flex items-start justify-between gap-2 rounded border border-primary/50 bg-primary/10 px-3 py-2 text-xs">
          <span>{n.message}</span>
          <button type="button" aria-label="Dispensar aviso" onClick={() => noticesStore.dismiss(n.id)} className="text-foreground/70 hover:text-foreground">
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function QuoteTotals({ quote, isFetching }: { quote: Quote | undefined; isFetching?: boolean }) {
  if (!quote) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-4 w-full" />
        ))}
      </div>
    )
  }
  return (
    <dl className={`space-y-1.5 text-xs transition-opacity ${isFetching ? 'opacity-60' : ''}`} data-testid="quote-totals" aria-busy={isFetching}>
      <div className="flex justify-between">
        <dt className="text-warm">Subtotal</dt>
        <dd data-testid="quote-subtotal">{formatEth(quote.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-warm">Desconto {quote.coupon ? `(${quote.coupon.code})` : 'do lançamento'}</dt>
        <dd data-testid="quote-discount">(-) {formatEth(quote.discount)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-warm">Taxa de rede</dt>
        <dd>
          {formatEth(quote.networkFee)}
          <span className="block text-right text-[10px] text-primary">Taxa estimada</span>
        </dd>
      </div>
      <div className="flex justify-between border-t border-border pt-2 font-semibold">
        <dt>Total</dt>
        <dd className="text-primary" data-testid="quote-total">
          {formatEth(quote.total)}
        </dd>
      </div>
    </dl>
  )
}
