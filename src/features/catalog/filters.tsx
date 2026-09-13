import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { SkeletonBlock } from '@/components/common/skeleton-block'
import type { CatalogResponse } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'
import { joinList, splitList, type CatalogSearch } from './search-params'

interface Props {
  search: CatalogSearch
  facets?: CatalogResponse['facets']
  className?: string
}

const rowClass = 'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent'

function FacetList({ title, name, options, selected, onToggle }: { title: string; name: string; options: Array<{ slug: string; label: string; count: number }>; selected: string[]; onToggle: (slug: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      <ul className="space-y-0.5">
        {options.map((o) => {
          const checked = selected.includes(o.slug)
          const id = `${name}-${o.slug}`
          return (
            <li key={o.slug}>
              <label htmlFor={id} className={cn(rowClass, 'cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring', checked ? 'bg-accent text-primary' : 'text-warm')}>
                <span className="flex items-center gap-2">
                  <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={() => onToggle(o.slug)} />
                  {o.label}
                </span>
                <span className="text-muted-foreground">({o.count})</span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

export function CatalogFilters({ search, facets, className }: Props) {
  const navigate = useNavigate({ from: '/' })
  const min = Number(facets?.priceRange.min ?? '0')
  const max = Number(facets?.priceRange.max ?? '13')
  const [range, setRange] = useState<[number, number]>([Number(search.minPrice ?? min), Number(search.maxPrice ?? max)])
  useEffect(() => {
    setRange([Number(search.minPrice ?? min), Number(search.maxPrice ?? max)])
  }, [search.minPrice, search.maxPrice, min, max])

  // Any filter change resets pagination.
  const update = (patch: Partial<CatalogSearch>) => void navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), hash: 'catalogo', resetScroll: false })
  const toggleIn = (key: 'category' | 'network', slug: string) => {
    const current = splitList(search[key])
    const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]
    update({ [key]: joinList(next) })
  }
  const hasFilters = !!(search.category || search.network || search.minPrice || search.maxPrice || search.q)

  if (!facets) {
    return (
      <div className={cn('space-y-4 rounded-lg bg-surface p-4', className)} aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-5 w-full" />
        ))}
      </div>
    )
  }

  return (
    <aside className={cn('space-y-6 rounded-lg bg-surface p-4', className)} aria-label="Filtros do catálogo">
      <FacetList title="Coleções" name="category" options={facets.categories} selected={splitList(search.category)} onToggle={(s) => toggleIn('category', s)} />
      <div>
        <h3 className="mb-2 text-sm font-semibold">Faixa de preço</h3>
        <Slider
          min={min}
          max={max}
          step={0.01}
          value={range}
          onValueChange={(v) => setRange([v[0], v[1]] as [number, number])}
          aria-label="Faixa de preço em ETH"
          className="my-4 [&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:border-primary [&_[data-slot=slider-thumb]]:bg-primary [&_[data-slot=slider-track]]:bg-surface-2"
        />
        <p className="text-xs text-warm" aria-live="polite">
          Preço: {range[0].toFixed(2).replace('.', ',')} - {range[1].toFixed(2).replace('.', ',')} ETH
        </p>
        <Button size="sm" className="mt-2" onClick={() => update({ minPrice: range[0] > min ? range[0].toFixed(2) : undefined, maxPrice: range[1] < max ? range[1].toFixed(2) : undefined })}>
          Aplicar
        </Button>
      </div>
      <FacetList title="Rede" name="network" options={facets.networks} selected={splitList(search.network)} onToggle={(s) => toggleIn('network', s)} />
      {hasFilters ? (
        <Button variant="outline" size="sm" className="w-full" onClick={() => update({ category: undefined, network: undefined, minPrice: undefined, maxPrice: undefined, q: undefined })}>
          Limpar filtros
        </Button>
      ) : null}
    </aside>
  )
}
