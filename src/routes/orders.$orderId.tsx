import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2, MailOpen, X } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { NotFound } from '@/components/common/not-found'
import { SkeletonBlock } from '@/components/common/skeleton-block'
import { ErrorState } from '@/components/common/states'
import { pendingOrder } from '@/features/checkout/checkout-storage'
import { walletTypeLabel } from '@/features/checkout/wallet-connect'
import { ApiError } from '@/lib/api/client'
import type { Order } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money'
import { requireAuth } from '@/lib/protected-route'
import { orderQueryOptions } from '@/lib/queries'
import { useRealtimeStatus } from '@/lib/realtime'
import { useSession } from '@/lib/session'

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: 'Confirmação de pedido — Kurio' }] }),
  component: OrderPage,
})

function OrderPage() {
  const { orderId } = Route.useParams()
  const session = useSession()
  const userId = session.user?.id ?? 'anonymous'
  const order = useQuery({ ...orderQueryOptions(userId, orderId), enabled: !!session.user })
  const realtime = useRealtimeStatus()

  useEffect(() => {
    if (order.data && order.data.status !== 'pending') {
      const pending = pendingOrder.load(userId)
      if (pending?.orderId === order.data.id) pendingOrder.clear()
    }
  }, [order.data, userId])

  if (order.isError && [403, 404].includes(ApiError.from(order.error).status)) {
    return <NotFound title="Pedido não encontrado" description="Este pedido não existe ou pertence a outro colecionador." />
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10">
      <div className="mx-auto w-full max-w-lg rounded-lg border-b-4 border-primary bg-surface" data-testid="order-card" data-status={order.data?.status ?? 'loading'} aria-busy={order.isPending}>
        <div className="flex justify-end p-2">
          <Link to="/" aria-label="Fechar e voltar ao início" className="text-primary hover:text-foreground">
            <X className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {order.isPending ? (
          <div className="space-y-3 px-6 pb-8" aria-hidden="true">
            <SkeletonBlock className="mx-auto h-12 w-12 rounded-full" />
            <SkeletonBlock className="mx-auto h-4 w-2/3" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-32 w-full" />
          </div>
        ) : order.isError ? (
          <ErrorState error={order.error} onRetry={() => void order.refetch()} className="m-6" />
        ) : (
          <Receipt order={order.data} reconnecting={realtime.status === 'reconnecting'} />
        )}
      </div>
    </div>
  )
}

function Receipt({ order, reconnecting }: { order: Order; reconnecting: boolean }) {
  const date = new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  return (
    <div className="px-6 pb-8">
      <div className="flex flex-col items-center text-center" aria-live="polite">
        {order.status === 'pending' ? (
          <>
            <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
            <h1 className="mt-3 text-sm font-semibold">Aguardando confirmação na rede</h1>
            <p className="mt-1 text-xs text-warm">Seu pedido foi registrado. Você pode fechar esta página: o estado é recuperado ao voltar.</p>
            {reconnecting ? (
              <p className="mt-2 text-[11px] text-destructive" role="status">
                Conexão em tempo real perdida — reconciliando com o servidor…
              </p>
            ) : null}
          </>
        ) : order.status === 'confirmed' ? (
          <>
            <MailOpen className="size-10 text-primary" aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Thank you</p>
            <h1 className="mt-2 text-sm font-semibold">Seus NFTs agora estão na sua carteira</h1>
          </>
        ) : (
          <>
            <X className="size-10 rounded-full bg-destructive/20 p-2 text-destructive" aria-hidden="true" />
            <h1 className="mt-3 text-sm font-semibold text-destructive">Pagamento recusado</h1>
            <p className="mt-1 text-xs text-warm">{order.declineReason ?? 'A rede recusou a transação.'} Seus itens continuam no carrinho.</p>
          </>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-border py-3 text-[11px] sm:grid-cols-4">
        <div>
          <dt className="text-warm">ID da transação</dt>
          <dd className="font-semibold" data-testid="tx-ref">{order.txRef}</dd>
        </div>
        <div>
          <dt className="text-warm">Data</dt>
          <dd className="font-semibold">{date}</dd>
        </div>
        <div>
          <dt className="text-warm">Total</dt>
          <dd className="font-semibold">{formatEth(order.total)}</dd>
        </div>
        <div>
          <dt className="text-warm">Carteira</dt>
          <dd className="font-semibold">{walletTypeLabel(order.wallet.type)}</dd>
        </div>
      </dl>

      <h2 className="mt-4 text-xs font-semibold">Detalhes da transação</h2>
      <table className="mt-2 w-full text-xs">
        <thead>
          <tr className="text-left text-[11px] text-warm">
            <th scope="col" className="py-1 font-semibold">NFTs</th>
            <th scope="col" className="py-1 font-semibold">Edições</th>
            <th scope="col" className="py-1 text-right font-semibold">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l) => (
            <tr key={l.cartItemId} className="align-middle">
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <img src={l.image.replace('-900.webp', '-400.webp')} alt="" width={40} height={40} className="size-10 rounded object-cover" loading="lazy" />
                  <div>
                    <p className="font-semibold">{l.name}</p>
                    <p className="text-[11px] text-warm">ID do token: {l.tokenId}</p>
                  </div>
                </div>
              </td>
              <td className="py-2 text-warm">(x {l.quantity})</td>
              <td className="py-2 text-right font-semibold text-primary">{formatEth(l.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
        {order.discount !== '0' ? (
          <div className="flex justify-end gap-6">
            <dt className="text-warm">Desconto {order.couponCode ? `(${order.couponCode})` : ''}</dt>
            <dd>(-) {formatEth(order.discount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-end gap-6">
          <dt className="text-warm">Taxa de rede</dt>
          <dd>{formatEth(order.networkFee)}</dd>
        </div>
        <div className="flex justify-end gap-6 font-semibold">
          <dt>Total</dt>
          <dd className="text-primary" data-testid="order-total">{formatEth(order.total)}</dd>
        </div>
      </dl>

      {order.status === 'confirmed' ? (
        <>
          <p className="mt-4 text-center text-[11px] text-warm">Transação confirmada na {order.network === 'ethereum' ? 'Ethereum' : order.network === 'polygon' ? 'Polygon' : 'Solana'}. A propriedade foi transferida para sua carteira conectada e registrada na rede.</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <Button asChild size="sm">
              <a href={order.explorerUrl} target="_blank" rel="noopener noreferrer">
                Ver no Etherscan <span className="sr-only">(link simulado, abre em nova aba)</span>
              </a>
            </Button>
            <span className="text-[10px] text-muted-foreground">Referência e link de exploração simulados.</span>
          </div>
        </>
      ) : order.status === 'declined' ? (
        <div className="mt-4 flex justify-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/checkout">Tentar novamente</Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
