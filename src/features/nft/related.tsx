import { useQuery } from '@tanstack/react-query'
import { NftCard, NftCardSkeleton } from '@/features/catalog/nft-card'
import { relatedQueryOptions } from '@/lib/queries'

export function RelatedNfts({ nftId, title = 'Mais desta coleção' }: { nftId: string; title?: string }) {
  const related = useQuery(relatedQueryOptions(nftId))
  return (
    <section className="mt-10" aria-labelledby="related-title">
      <h2 id="related-title" className="border-b border-border pb-2 text-sm font-semibold text-primary">
        {title}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {related.isPending
          ? Array.from({ length: 5 }).map((_, i) => <NftCardSkeleton key={i} />)
          : related.data?.items.slice(0, 5).map((n) => <NftCard key={n.id} nft={n} />)}
      </div>
    </section>
  )
}
