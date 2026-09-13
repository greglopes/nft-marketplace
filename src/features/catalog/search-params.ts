import { z } from 'zod'
import { catalogTab, sortValue, type CatalogQuery, type CategorySlug, type NetworkSlug } from '@/lib/api/contracts'

/** URL state for the catalog: survives refresh and history navigation. */
export const catalogSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  network: z.string().optional().catch(undefined),
  minPrice: z.string().optional().catch(undefined),
  maxPrice: z.string().optional().catch(undefined),
  sort: sortValue.optional().catch(undefined),
  tab: catalogTab.optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const splitList = (v?: string) => (v ? v.split(',').filter(Boolean) : [])
export const joinList = (v: string[]) => (v.length ? v.join(',') : undefined)

export function toCatalogQuery(search: CatalogSearch): CatalogQuery {
  return {
    q: search.q || undefined,
    category: splitList(search.category) as CategorySlug[],
    network: splitList(search.network) as NetworkSlug[],
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    sort: search.sort,
    tab: search.tab,
    page: search.page ?? 1,
    pageSize: 9,
  }
}
