import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CatalogSearch } from './search-params'

const cell = 'inline-flex size-7 items-center justify-center rounded text-xs transition-colors'

export function Pagination({ page, totalPages, search }: { page: number; totalPages: number; search: CatalogSearch }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
  return (
    <nav aria-label="Paginação" className="flex items-center justify-end gap-1">
      {page > 1 ? (
        <Link to="/" search={{ ...search, page: page > 2 ? page - 1 : undefined }} hash="catalogo" resetScroll={false} aria-label="Página anterior" className={cn(cell, 'bg-surface-2 text-foreground')}>
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
      {pages.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && pages[i - 1] !== p - 1 ? <span className="px-1 text-xs text-muted-foreground">…</span> : null}
          <Link to="/" search={{ ...search, page: p === 1 ? undefined : p }} hash="catalogo" resetScroll={false} aria-label={`Página ${p}`} aria-current={p === page ? 'page' : undefined} className={cn(cell, p === page ? 'bg-primary font-bold text-primary-foreground' : 'bg-surface-2 text-foreground hover:bg-accent')}>
            {p}
          </Link>
        </span>
      ))}
      <Link to="/" search={{ ...search, page: page + 1 }} hash="catalogo" resetScroll={false} aria-label="Próxima página" disabled={page >= totalPages} className={cn(cell, 'bg-surface-2 text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-40')}>
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </nav>
  )
}
