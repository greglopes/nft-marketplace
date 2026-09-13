import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QuoteTotals } from '@/features/cart/cart-summary'
import { NETWORKS, type CollectorProfile, type Quote, type Wallet } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money'
import { shortAddress, walletTypeLabel } from './wallet-connect'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  collector: CollectorProfile
  wallet: Wallet
  network: string
  quote: Quote | undefined
  reviewedQuoteId: string | null
  onReviewed: (quoteId: string) => void
  onConfirm: () => void
  submitting: boolean
  error: string | null
  /** element that receives focus again when the dialog closes */
  returnFocusTo?: React.RefObject<HTMLElement | null>
}

export function ReviewDialog({ open, onOpenChange, collector, wallet, network, quote, reviewedQuoteId, onReviewed, onConfirm, submitting, error, returnFocusTo }: Props) {
  const outdated = !!quote && reviewedQuoteId !== quote.quoteId
  const canConfirm = !!quote && quote.valid && !outdated && !submitting
  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent
        className="max-h-[90dvh] max-w-lg overflow-y-auto"
        data-testid="review-dialog"
        onCloseAutoFocus={(e) => {
          if (returnFocusTo?.current) {
            e.preventDefault()
            returnFocusTo.current.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Revisar pedido</DialogTitle>
          <DialogDescription>Confira os dados antes de enviar. O pedido só é confirmado após a resposta da rede.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-warm">Colecionador</dt>
          <dd>
            {collector.displayName} (@{collector.username}) · {collector.email}
          </dd>
          <dt className="text-warm">ENS</dt>
          <dd>{collector.ensName}.eth</dd>
          <dt className="text-warm">Carteira</dt>
          <dd>
            {walletTypeLabel(wallet.type)} · {shortAddress(wallet.address)}
          </dd>
          <dt className="text-warm">Rede</dt>
          <dd>{NETWORKS.find((n) => n.slug === network)?.label ?? network}</dd>
        </dl>
        <ul className="divide-y divide-border rounded border border-border text-xs" aria-label="Itens do pedido">
          {quote?.lines.map((l) => (
            <li key={l.cartItemId} className="flex items-center justify-between gap-2 px-3 py-2">
              <span>
                {l.name} <span className="text-warm">(x {l.quantity})</span>
              </span>
              <span className="font-semibold text-primary">{formatEth(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <QuoteTotals quote={quote} />
        <div aria-live="assertive">
          {outdated ? (
            <div role="alert" className="rounded border border-primary/60 bg-primary/10 p-3 text-xs" data-testid="quote-outdated">
              <p className="font-semibold">A cotação foi atualizada.</p>
              <p className="text-warm">Preço, disponibilidade ou taxas mudaram. Revise os valores acima e confirme novamente.</p>
              <Button type="button" size="sm" className="mt-2" onClick={() => quote && onReviewed(quote.quoteId)} data-testid="acknowledge-quote">
                Revisei os novos valores
              </Button>
            </div>
          ) : null}
          {quote && !quote.valid ? (
            <p role="alert" className="text-xs text-destructive">
              Há itens indisponíveis no carrinho. Ajuste o carrinho antes de confirmar.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs text-destructive" data-testid="order-error">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Voltar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={!canConfirm} data-testid="confirm-order" aria-busy={submitting}>
            {submitting ? 'Enviando pedido…' : 'Confirmar compra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
