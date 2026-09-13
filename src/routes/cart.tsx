import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/common/breadcrumb'
import { EmptyState, ErrorState } from '@/components/common/states'
import { CartItems, CartItemsSkeleton } from '@/features/cart/cart-items'
import { CouponForm, QuoteTotals, RealtimeNotices } from '@/features/cart/cart-summary'
import { RelatedNfts } from '@/features/nft/related'
import { useAuthModal } from '@/features/auth/auth-search'
import { useCart, useQuote } from '@/lib/queries'
import { useSession } from '@/lib/session'

export const Route = createFileRoute('/cart')({
  head: () => ({ meta: [{ title: 'Carrinho — Kurio' }] }),
  component: CartPage,
})

function CartPage() {
  const cart = useCart()
  const hasItems = (cart.data?.items.length ?? 0) > 0
  const quote = useQuote(hasItems)
  const session = useSession()
  const navigate = useNavigate()
  const authModal = useAuthModal()
  const canCheckout = hasItems && quote.data?.valid

  const onCheckout = () => {
    if (!session.user) {
      void authModal.open('login', '/checkout')
      return
    }
    void navigate({ to: '/checkout' })
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-4 md:py-6">
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Carrinho' }]} />
      <h1 className="mt-3 text-xl font-semibold">Carrinho de NFTs</h1>
      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label="Itens" aria-busy={cart.isPending}>
          {cart.isPending ? (
            <CartItemsSkeleton />
          ) : cart.isError ? (
            <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />
          ) : !hasItems ? (
            <EmptyState
              title="Seu carrinho está vazio"
              description="Explore o catálogo e adicione NFTs para continuar."
              action={
                <Button asChild size="sm">
                  <Link to="/" hash="catalogo">
                    Explorar catálogo
                  </Link>
                </Button>
              }
            />
          ) : (
            <CartItems cart={cart.data} quote={quote.data} />
          )}
        </section>
        <aside className="space-y-4 rounded-lg bg-surface p-4" aria-label="Resumo da carteira">
          <h2 className="text-sm font-semibold">Resumo da carteira</h2>
          <RealtimeNotices />
          {cart.data && hasItems ? <CouponForm cart={cart.data} /> : null}
          {hasItems ? (
            <>
              {quote.isError ? <ErrorState error={quote.error} onRetry={() => void quote.refetch()} title="Cotação indisponível" /> : <QuoteTotals quote={quote.data} isFetching={quote.isFetching} />}
              <Button className="w-full" onClick={onCheckout} disabled={!canCheckout} data-testid="checkout-button">
                Conectar e finalizar
              </Button>
              {quote.data && !quote.data.valid ? (
                <p className="text-center text-[11px] text-destructive" role="status">
                  Revise os itens indisponíveis antes de finalizar.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-warm">Adicione itens para ver a cotação.</p>
          )}
          <Link to="/" hash="catalogo" className="block text-center text-xs text-warm hover:text-primary">
            Continuar explorando
          </Link>
        </aside>
      </div>
      <RelatedNfts nftId={cart.data?.items[0]?.nftId ?? 'nft-01'} title="Colecionadores também viram" />
    </div>
  )
}
