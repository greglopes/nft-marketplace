import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { Price } from '@/components/common/price'
import { QuantityStepper } from '@/components/common/quantity-stepper'
import { SkeletonBlock } from '@/components/common/skeleton-block'
import type { Cart, Quote } from '@/lib/api/contracts'
import { formatEth, mulEthByInt } from '@/lib/money'
import { useRemoveCartItem, useUpdateCartItem } from '@/lib/queries'

function lineStatus(quote: Quote | undefined, itemId: string) {
  return quote?.lines.find((l) => l.cartItemId === itemId)
}

export function CartItems({ cart, quote }: { cart: Cart; quote?: Quote }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" data-testid="cart-table">
        <caption className="sr-only">Itens do carrinho</caption>
        <thead>
          <tr className="border-b border-border text-left text-[11px] text-foreground/80">
            <th scope="col" className="py-2 font-semibold">NFTs</th>
            <th scope="col" className="hidden py-2 font-semibold sm:table-cell">Preço</th>
            <th scope="col" className="py-2 font-semibold">Edições</th>
            <th scope="col" className="py-2 font-semibold">Total</th>
            <th scope="col" className="py-2">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => {
            const edition = item.nft.editions.find((e) => e.id === item.editionId)
            const limit = edition ? Math.min(edition.available, edition.maxPerOrder) : 0
            const line = lineStatus(quote, item.id)
            const busy = (update.isPending && update.variables?.itemId === item.id) || (remove.isPending && remove.variables === item.id)
            return (
              <tr key={item.id} className="border-b border-border/60 align-middle" data-testid="cart-item" data-nft-id={item.nftId} aria-busy={busy}>
                <td className="py-3 pr-2">
                  <div className="flex items-center gap-3">
                    <img src={item.nft.images[0].replace('-900.webp', '-400.webp')} alt="" width={48} height={48} loading="lazy" className="size-12 shrink-0 rounded object-cover" />
                    <div className="min-w-0">
                      <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="font-semibold hover:text-primary">
                        {item.nft.name}
                      </Link>
                      <p className="text-[11px] text-warm">
                        ID do token: {item.nft.tokenId} · Edição {edition?.label ?? '—'}
                      </p>
                      {line && line.status !== 'ok' ? (
                        <p className="mt-1 text-[11px] text-destructive" role="status">
                          {line.status === 'unavailable' ? 'Edição esgotada — remova o item para continuar.' : line.status === 'limited' ? `Apenas ${line.available} disponíveis — ajuste a quantidade.` : `Preço atualizado para ${formatEth(line.unitPrice)}.`}
                        </p>
                      ) : null}
                      <span className="sm:hidden">
                        <Price value={item.nft.price} previous={item.nft.previousPrice} size="sm" />
                      </span>
                    </div>
                  </div>
                </td>
                <td className="hidden py-3 pr-2 sm:table-cell">
                  <Price value={item.nft.price} previous={item.nft.previousPrice} />
                </td>
                <td className="py-3 pr-2">
                  <QuantityStepper value={item.quantity} max={Math.max(1, limit)} label={`Quantidade de ${item.nft.name}`} disabled={busy || limit === 0} onChange={(q) => update.mutate({ itemId: item.id, quantity: q })} />
                </td>
                <td className="py-3 pr-2 font-semibold text-primary" data-testid="line-total">
                  {formatEth(mulEthByInt(item.nft.price, item.quantity))}
                </td>
                <td className="py-3 text-right">
                  <button type="button" aria-label={`Remover ${item.nft.name} do carrinho`} disabled={busy} onClick={() => remove.mutate(item.id)} className="rounded p-1 text-foreground/70 hover:text-destructive disabled:opacity-50">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function CartItemsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonBlock className="size-12 shrink-0" />
          <SkeletonBlock className="h-4 flex-1" />
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
