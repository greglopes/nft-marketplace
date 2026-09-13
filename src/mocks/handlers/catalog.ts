import { http } from 'msw'
import { CATEGORIES, NETWORKS, catalogQuerySchema, type CatalogResponse, type Nft } from '@/lib/api/contracts'
import { compareEth } from '@/lib/money'
import { getDb, summarize } from '../db'
import { FIXTURE_BASE_DATE } from '../fixtures/nfts'
import { getScenario } from '../scenarios'
import { API, apiError, applyLatency, json, normalize } from './utils'

const PAGE_SIZE = 9
const NEW_WINDOW_DAYS = 14

function parseQuery(url: URL) {
  const sp = url.searchParams
  const list = (k: string) => (sp.getAll(k).flatMap((v) => v.split(',')).filter(Boolean))
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined)
  return catalogQuerySchema.safeParse({
    q: sp.get('q') ?? undefined,
    category: list('category').length ? list('category') : undefined,
    network: list('network').length ? list('network') : undefined,
    minPrice: sp.get('minPrice') ?? undefined,
    maxPrice: sp.get('maxPrice') ?? undefined,
    sort: sp.get('sort') ?? undefined,
    tab: sp.get('tab') ?? undefined,
    page: num('page'),
    pageSize: num('pageSize'),
  })
}

export function facetsFor(nfts: Nft[]) {
  const count = (pred: (n: Nft) => boolean) => nfts.filter(pred).length
  const prices = nfts.map((n) => n.price).sort(compareEth)
  return {
    categories: CATEGORIES.map((c) => ({ slug: c.slug, label: c.label, count: count((n) => n.category === c.slug) })),
    networks: NETWORKS.map((c) => ({ slug: c.slug, label: c.label, count: count((n) => n.network === c.slug) })),
    priceRange: { min: prices[0] ?? '0', max: prices[prices.length - 1] ?? '0' },
  }
}

export const catalogHandlers = [
  http.get(`${API}/nfts`, async ({ request }) => {
    await applyLatency()
    const scenario = getScenario()
    if (scenario.catalogStatus) return apiError(scenario.catalogStatus, 'TRANSIENT_FAILURE', 'Falha temporária ao carregar o catálogo.')
    const parsed = parseQuery(new URL(request.url))
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Parâmetros de busca inválidos.')
    const q = parsed.data
    const db = getDb()
    let items = scenario.emptyCatalog ? [] : [...db.nfts]

    if (q.q) {
      const needle = normalize(q.q)
      items = items.filter((n) => [n.name, n.collection, n.creator, ...n.attributes].some((t) => normalize(t).includes(needle)))
    }
    if (q.category?.length) items = items.filter((n) => q.category!.includes(n.category))
    if (q.network?.length) items = items.filter((n) => q.network!.includes(n.network))
    if (q.minPrice) items = items.filter((n) => compareEth(n.price, q.minPrice!) >= 0)
    if (q.maxPrice) items = items.filter((n) => compareEth(n.price, q.maxPrice!) <= 0)

    const base = new Date(FIXTURE_BASE_DATE).getTime()
    if (q.tab === 'new') items = items.filter((n) => base - new Date(n.listedAt).getTime() <= NEW_WINDOW_DAYS * 86_400_000)
    if (q.tab === 'trending') items = items.filter((n) => n.trendingScore >= 60)

    const sort = q.sort ?? (q.tab === 'trending' ? 'trending' : 'recent')
    items.sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return compareEth(a.price, b.price)
        case 'price-desc':
          return compareEth(b.price, a.price)
        case 'trending':
          return b.trendingScore - a.trendingScore
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime()
      }
    })

    const pageSize = q.pageSize ?? PAGE_SIZE
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
    const page = Math.min(q.page ?? 1, totalPages)
    const start = (page - 1) * pageSize
    const body: CatalogResponse = {
      items: items.slice(start, start + pageSize).map(summarize),
      page,
      pageSize,
      total: items.length,
      totalPages,
      facets: facetsFor(db.nfts),
      catalogVersion: db.catalogVersion,
    }
    return json(body)
  }),

  http.get(`${API}/nfts/:id`, async ({ params }) => {
    await applyLatency()
    const db = getDb()
    const nft = db.nfts.find((n) => n.id === params.id)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    return json(nft)
  }),

  http.get(`${API}/nfts/:id/related`, async ({ params }) => {
    await applyLatency()
    const db = getDb()
    const nft = db.nfts.find((n) => n.id === params.id)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    const related = db.nfts.filter((n) => n.id !== nft.id && (n.collection === nft.collection || n.category === nft.category)).slice(0, 8)
    return json({ items: related.map(summarize) })
  }),
]
