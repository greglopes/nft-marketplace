import { Link } from '@tanstack/react-router'
import { Fragment } from 'react'

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: '/' | '/cart' | '/checkout' }> }) {
  return (
    <nav aria-label="Navegação estrutural" className="text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 ? <li aria-hidden="true">/</li> : null}
            <li>
              {item.to ? (
                <Link to={item.to} className="hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-foreground">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
