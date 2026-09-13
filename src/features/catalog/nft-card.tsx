import { Link } from '@tanstack/react-router'
import { Heart, Search, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Price } from '@/components/common/price'
import { SkeletonBlock } from '@/components/common/skeleton-block'
import type { NftSummary } from '@/lib/api/contracts'
import { useAddToCart, useFavorites, useToggleFavorite } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { artSrcSet } from '@/lib/art'
import { cn } from '@/lib/utils'

export function defaultEdition(nft: Pick<NftSummary, 'editions'>) {
  return nft.editions.find((e) => e.label === '1/50' && e.available > 0) ?? nft.editions.find((e) => e.available > 0) ?? null
}

export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const session = useSession()
  const favorites = useFavorites()
  const toggle = useToggleFavorite()
  const addToCart = useAddToCart()
  const isFavorite = favorites.data?.items.includes(nft.id) ?? false
  const edition = defaultEdition(nft)
  const soldOut = !edition

  const onFavorite = () => {
    if (!session.user) {
      toast.info('Entre para salvar favoritos.')
      return
    }
    toggle.mutate({ nftId: nft.id, next: !isFavorite })
  }

  return (
    <article data-testid="nft-card" className="group relative flex flex-col gap-2" aria-label={nft.name}>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block h-full w-full focus-visible:outline-2" aria-label={`Ver detalhes de ${nft.name}`}>
          <img {...artSrcSet(nft.images[0])} sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 50vw" alt={`Arte de ${nft.name}`} width={400} height={400} loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        </Link>
        {nft.rarity !== 'comum' ? (
          <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">{nft.rarity === 'raro' ? 'Raro' : 'Lendário'}</span>
        ) : null}
        {soldOut ? <span className="absolute right-2 top-2 rounded bg-background/80 px-2 py-0.5 text-[10px] font-bold uppercase text-foreground">Esgotado</span> : null}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
          <button
            type="button"
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            disabled={soldOut || addToCart.isPending}
            onClick={() => edition && addToCart.mutate({ nftId: nft.id, editionId: edition.id, quantity: 1 })}
            className="inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            <ShoppingCart className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            aria-pressed={isFavorite}
            data-testid="favorite-toggle"
            onClick={onFavorite}
            className={cn('inline-flex size-7 items-center justify-center rounded-full bg-background/90 hover:bg-primary hover:text-primary-foreground', isFavorite ? 'text-primary' : 'text-foreground')}
          >
            <Heart className={cn('size-3.5', isFavorite && 'fill-current')} aria-hidden="true" />
          </button>
          <Link to="/nft/$nftId" params={{ nftId: nft.id }} aria-label={`Ver ${nft.name}`} className="inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground">
            <Search className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <h3 className="text-xs">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="hover:text-primary">
          {nft.name}
        </Link>
      </h3>
      <Price value={nft.price} previous={nft.previousPrice} />
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      <SkeletonBlock className="aspect-square w-full rounded-lg" />
      <SkeletonBlock className="h-4 w-3/4" />
      <SkeletonBlock className="h-4 w-1/3" />
    </div>
  )
}
