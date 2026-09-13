import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/common/states'
import { CatalogFilters } from '@/features/catalog/filters'
import { BlogSection, FeaturedNft, Hero, PromoBanners } from '@/features/catalog/home-sections'
import { NftCard, NftCardSkeleton } from '@/features/catalog/nft-card'
import { Pagination } from '@/features/catalog/pagination'
import { catalogSearchSchema, toCatalogQuery } from '@/features/catalog/search-params'
import { CatalogToolbar } from '@/features/catalog/toolbar'
import { catalogQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  search: { middlewares: [stripSearchParams({})] },
  loaderDeps: ({ search }) => ({ search }),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(catalogQueryOptions(toCatalogQuery(deps.search)))
  },
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = toCatalogQuery(search)
  const catalog = useQuery(catalogQueryOptions(query))
  const showSkeleton = catalog.isPending
  const isRefreshing = catalog.isFetching && !catalog.isPending

  return (
    <>
      <Hero />
      <section id="catalogo" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pt-6" aria-labelledby="catalogo-title">
        <h2 id="catalogo-title" className="sr-only">
          Catálogo de NFTs
        </h2>
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <div className="space-y-4">
            <CatalogFilters search={search} facets={catalog.data?.facets} />
            <FeaturedNft />
          </div>
          <div className="min-w-0">
            <CatalogToolbar search={search} />
            {search.q ? (
              <p className="mt-3 text-xs text-warm" aria-live="polite">
                Resultados para “{search.q}”{' '}
                <button type="button" className="text-primary underline" onClick={() => void navigate({ search: (prev) => ({ ...prev, q: undefined, page: undefined }) })}>
                  limpar
                </button>
              </p>
            ) : null}
            <div className="mt-4" aria-busy={showSkeleton || isRefreshing} data-testid="catalog-grid" data-state={showSkeleton ? 'loading' : isRefreshing ? 'refreshing' : 'ready'}>
              <p className="sr-only" aria-live="polite">
                {showSkeleton ? 'Carregando catálogo' : isRefreshing ? 'Atualizando resultados' : catalog.data ? `${catalog.data.total} resultados` : ''}
              </p>
              {showSkeleton ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <NftCardSkeleton key={i} />
                  ))}
                </div>
              ) : catalog.isError ? (
                <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} title="Não foi possível carregar o catálogo" />
              ) : catalog.data && catalog.data.items.length === 0 ? (
                <EmptyState
                  title="Nenhum NFT encontrado"
                  description="Ajuste a busca ou os filtros para ver mais resultados."
                  action={
                    <Button variant="outline" size="sm" onClick={() => void navigate({ search: {} })}>
                      Limpar filtros
                    </Button>
                  }
                />
              ) : (
                <div className={`grid grid-cols-2 gap-4 transition-opacity lg:grid-cols-3 ${isRefreshing ? 'opacity-60' : ''}`}>
                  {catalog.data!.items.map((nft, i) => (
                    <NftCard key={nft.id} nft={nft} priority={i < 3} />
                  ))}
                </div>
              )}
            </div>
            {catalog.data ? (
              <div className="mt-6">
                <Pagination page={catalog.data.page} totalPages={catalog.data.totalPages} search={search} />
              </div>
            ) : null}
          </div>
        </div>
      </section>
      <div className="mt-12 space-y-12">
        <PromoBanners />
        <BlogSection />
      </div>
    </>
  )
}
