import { useState } from 'react'
import { SkeletonBlock } from '@/components/common/skeleton-block'
import { artSrcSet } from '@/lib/art'
import { cn } from '@/lib/utils'

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  return (
    <div className="flex gap-3">
      <ul className="flex w-16 flex-col gap-2" aria-label="Miniaturas">
        {images.map((src, i) => (
          <li key={src}>
            <button type="button" aria-label={`Ver imagem ${i + 1} de ${name}`} aria-pressed={i === active} onClick={() => setActive(i)} className={cn('block aspect-square w-full overflow-hidden rounded-md border-2', i === active ? 'border-primary' : 'border-transparent')}>
              <img src={artSrcSet(src).src} alt="" width={64} height={64} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-xl bg-surface-2">
        <img src={images[active]} alt={`Arte de ${name}, imagem ${active + 1}`} width={560} height={560} fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
      </div>
    </div>
  )
}

export function GallerySkeleton() {
  return (
    <div className="flex gap-3" aria-hidden="true">
      <div className="flex w-16 flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="aspect-square w-full" />
        ))}
      </div>
      <SkeletonBlock className="aspect-square min-w-0 flex-1 rounded-xl" />
    </div>
  )
}
