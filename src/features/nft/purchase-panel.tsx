import { useNavigate } from '@tanstack/react-router'
import { Heart, Mail, Share2, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/common/price'
import { QuantityStepper } from '@/components/common/quantity-stepper'
import { SkeletonBlock } from '@/components/common/skeleton-block'
import { defaultEdition } from '@/features/catalog/nft-card'
import type { Nft } from '@/lib/api/contracts'
import { useAuthModal } from '@/features/auth/auth-search'
import { useAddToCart, useFavorites, useToggleFavorite } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

export function PurchasePanel({ nft }: { nft: Nft }) {
  const session = useSession()
  const navigate = useNavigate()
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const authModal = useAuthModal()
  const [editionId, setEditionId] = useState(() => defaultEdition(nft)?.id ?? nft.editions[0].id)
  const [quantity, setQuantity] = useState(1)
  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]
  const limit = Math.min(edition.available, edition.maxPerOrder)
  const isFavorite = favorites.data?.items.includes(nft.id) ?? false

  // Keep quantity within the limit if availability changes in realtime.
  useEffect(() => {
    if (limit > 0 && quantity > limit) setQuantity(limit)
  }, [limit, quantity])

  const onBuy = () => {
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      { onSuccess: () => void navigate({ to: '/cart' }) },
    )
  }

  const onFavorite = () => {
    if (!session.user) {
      toast.info('Entre para salvar favoritos.')
      void authModal.open('login')
      return
    }
    toggleFavorite.mutate({ nftId: nft.id, next: !isFavorite })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold" data-testid="nft-title">{nft.name}</h1>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Price value={nft.price} previous={nft.previousPrice} size="lg" />
        <p className="text-xs text-warm">
          <span aria-hidden="true" className="text-primary">
            {'★'.repeat(Math.round(nft.rating))}
            {'☆'.repeat(5 - Math.round(nft.rating))}
          </span>{' '}
          <span className="sr-only">Avaliação {nft.rating.toFixed(1)} de 5,</span> {nft.reviewsCount} avaliações de colecionadores
        </p>
      </div>
      <div>
        <h2 className="text-xs font-semibold">Sobre este NFT:</h2>
        <p className="mt-1 text-xs leading-relaxed text-warm">{nft.description}</p>
      </div>
      <fieldset>
        <legend className="text-xs font-semibold">Edição:</legend>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Edição">
          {nft.editions.map((e) => {
            const unavailable = e.available === 0
            const selected = e.id === edition.id
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={unavailable}
                data-testid={`edition-${e.id}`}
                onClick={() => !unavailable && setEditionId(e.id)}
                className={cn('rounded-full border px-3 py-1 text-[11px] transition-colors', selected ? 'border-primary text-primary' : 'border-border text-foreground/80', unavailable && 'cursor-not-allowed line-through opacity-50')}
              >
                {e.label}
                {unavailable ? <span className="sr-only"> (indisponível)</span> : null}
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground" aria-live="polite">
          {edition.available === 0 ? 'Edição indisponível.' : `${edition.available} disponíveis · limite de ${edition.maxPerOrder} por pedido`}
        </p>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <QuantityStepper value={quantity} max={Math.max(1, limit)} onChange={setQuantity} label="Quantidade" disabled={limit === 0} />
        <div className="flex gap-2">
          <Button onClick={onBuy} disabled={limit === 0 || addToCart.isPending} className="uppercase" data-testid="buy-button">
            {addToCart.isPending ? 'Adicionando…' : 'Comprar'}
          </Button>
          <Button variant="outline" onClick={onFavorite} aria-pressed={isFavorite} data-testid="favorite-button" className={cn('border-primary', isFavorite && 'text-primary')}>
            <Heart className={cn(isFavorite && 'fill-current')} aria-hidden="true" /> {isFavorite ? 'Favoritado' : 'Favoritar'}
          </Button>
        </div>
      </div>
      <dl className="space-y-1 text-xs text-warm">
        <div className="flex gap-2">
          <dt>ID do token:</dt>
          <dd>{nft.tokenId}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Coleção:</dt>
          <dd>{nft.collection}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Atributos:</dt>
          <dd>{nft.attributes.join(', ')}</dd>
        </div>
      </dl>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold">Compartilhar este NFT:</span>
        {[
          { label: 'LinkedIn', Icon: Link2 },
          { label: 'E-mail', Icon: Mail },
          { label: 'Twitter', Icon: Share2 },
        ].map(({ label, Icon }) => (
          <button key={label} type="button" aria-label={`Compartilhar no ${label}`} className="inline-flex size-6 items-center justify-center text-foreground/80 hover:text-primary" onClick={() => toast.info(`Compartilhamento via ${label} está fora do escopo.`)}>
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}

export function PurchasePanelSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <SkeletonBlock className="h-8 w-2/3" />
      <SkeletonBlock className="h-6 w-1/3" />
      <SkeletonBlock className="h-16 w-full" />
      <SkeletonBlock className="h-8 w-1/2" />
      <SkeletonBlock className="h-10 w-full" />
      <SkeletonBlock className="h-14 w-2/3" />
    </div>
  )
}
