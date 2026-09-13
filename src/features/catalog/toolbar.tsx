import { useNavigate } from '@tanstack/react-router'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SORT_OPTIONS, type CatalogTab, type SortValue } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'
import type { CatalogSearch } from './search-params'

const TABS: Array<{ value: CatalogTab; label: string }> = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'new', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
]

export function CatalogToolbar({ search }: { search: CatalogSearch }) {
  const navigate = useNavigate({ from: '/' })
  const tab = search.tab ?? 'all'
  const update = (patch: Partial<CatalogSearch>) => void navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), hash: 'catalogo', resetScroll: false })
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" aria-label="Seções do catálogo" className="flex gap-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={tab === t.value}
            data-testid={`tab-${t.value}`}
            className={cn('whitespace-nowrap py-1 text-xs transition-colors', tab === t.value ? 'text-primary link-underline' : 'text-foreground/80 hover:text-foreground')}
            onClick={() => update({ tab: t.value === 'all' ? undefined : t.value })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <label htmlFor="sort" className="whitespace-nowrap">
          Ordenar por:
        </label>
        <Select value={search.sort ?? 'recent'} onValueChange={(v) => update({ sort: v === 'recent' ? undefined : (v as SortValue) })}>
          <SelectTrigger id="sort" size="sm" className="h-8 w-52 border-none bg-transparent text-xs" data-testid="sort-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
