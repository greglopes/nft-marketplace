import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Breadcrumb } from '@/components/common/breadcrumb'
import { NotFound } from '@/components/common/not-found'
import { SkeletonBlock } from '@/components/common/skeleton-block'
import { ErrorState } from '@/components/common/states'
import { NftCardSkeleton } from '@/features/catalog/nft-card'
import { DetailTabs } from '@/features/nft/detail-tabs'
import { Gallery, GallerySkeleton } from '@/features/nft/gallery'
import { PurchasePanel, PurchasePanelSkeleton } from '@/features/nft/purchase-panel'
import { RelatedNfts } from '@/features/nft/related'
import { ApiError } from '@/lib/api/client'
import { nftQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/nft/$nftId')({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftQueryOptions(params.nftId))
  },
  head: ({ params }) => ({ meta: [{ title: `NFT ${params.nftId} — Kurio` }] }),
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const nft = useQuery(nftQueryOptions(nftId))

  if (nft.isError && ApiError.from(nft.error).status === 404) {
    return <NotFound title="NFT não encontrado" description="Este NFT não existe ou foi removido do catálogo." />
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-4 md:py-6">
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: nft.data?.name ?? 'NFT' }]} />
      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-busy={nft.isPending}>
        {nft.isPending ? (
          <>
            <GallerySkeleton />
            <PurchasePanelSkeleton />
          </>
        ) : nft.isError ? (
          <ErrorState error={nft.error} onRetry={() => void nft.refetch()} className="md:col-span-2" />
        ) : (
          <>
            <Gallery images={nft.data.images} name={nft.data.name} />
            <PurchasePanel nft={nft.data} />
          </>
        )}
      </div>
      {nft.data ? (
        <>
          <DetailTabs nft={nft.data} />
          <RelatedNfts nftId={nft.data.id} />
        </>
      ) : nft.isPending ? (
        // Reserve the space of the tabs and the related grid to avoid layout shift.
        <div aria-hidden="true">
          <SkeletonBlock className="mt-8 h-9 w-full" />
          <div className="mt-4 space-y-2">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-11/12" />
            <SkeletonBlock className="h-4 w-2/3" />
          </div>
          <SkeletonBlock className="mt-10 h-6 w-48" />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <NftCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
