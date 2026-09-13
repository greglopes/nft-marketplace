import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { outOfScope } from '@/components/common/out-of-scope'
import { cn } from '@/lib/utils'

const HERO_SLIDES = [
  { image: '/art/ape-emerald-900.webp', label: 'Bem-vindo à Kurio', title: 'Seja dono do futuro da arte digital', text: 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.' },
  { image: '/art/ape-sage-900.webp', label: 'Coleção Kurio Apes', title: 'Edições limitadas verificadas na rede', text: 'Cada obra carrega procedência imutável e metadados no IPFS.' },
  { image: '/art/ape-golden-900.webp', label: 'Novos lançamentos', title: 'Arte generativa em edição aberta', text: 'Acompanhe as cunhagens da semana e apoie novos artistas.' },
]

const FADE_MS = 280
const AUTOPLAY_MS = 8000

export function Hero() {
  const [shown, setShown] = useState(0)
  const [fading, setFading] = useState(false)
  const timer = useRef<number | null>(null)
  const slide = HERO_SLIDES[shown]

  const go = useCallback(
    (next: number) => {
      if (next === shown || fading) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setShown(next)
        return
      }
      setFading(true)
      window.setTimeout(() => {
        setShown(next)
        setFading(false)
      }, FADE_MS)
    },
    [shown, fading],
  )

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    timer.current = window.setTimeout(() => go((shown + 1) % HERO_SLIDES.length), AUTOPLAY_MS)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [shown, go])

  const textFx = cn('transition-[opacity,transform] duration-300 ease-out', fading ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100')

  return (
    <section aria-labelledby="hero-title" aria-roledescription="carrossel" className="mx-auto grid max-w-[1200px] items-center gap-6 px-4 py-6 md:grid-cols-[1fr_440px] md:py-10">
      <div className="order-2 md:order-1" aria-live="polite" aria-atomic="true">
        <div className={textFx}>
          <p className="text-xs text-warm">{slide.label}</p>
          <h1 id="hero-title" className="mt-3 text-3xl font-semibold uppercase leading-tight tracking-wide md:text-5xl md:leading-[1.15]">
            {slide.title}
          </h1>
          <p className="mt-4 max-w-lg text-xs leading-relaxed text-warm md:text-sm">{slide.text}</p>
        </div>
        <Button asChild className="mt-6 uppercase tracking-wider">
          <Link to="/" hash="catalogo">
            Explorar
          </Link>
        </Button>
      </div>
      <div className="relative order-1 aspect-square w-full overflow-hidden rounded-2xl bg-surface-2 md:order-2">
        {HERO_SLIDES.map((s, i) => (
          <img
            key={s.image}
            src={s.image}
            alt=""
            width={440}
            height={440}
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding="async"
            aria-hidden={i !== shown}
            className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-in-out', i === shown ? 'opacity-100' : 'opacity-0')}
          />
        ))}
      </div>
      {/* Slide indicators centred across the whole carousel width */}
      <div className="order-3 flex justify-center md:col-span-2" role="tablist" aria-label="Slides do destaque">
        {HERO_SLIDES.map((s, i) => (
          <button key={s.title} role="tab" type="button" aria-selected={i === shown} aria-label={`Slide ${i + 1}`} onClick={() => go(i)} className="inline-flex size-6 cursor-pointer items-center justify-center">
            <span aria-hidden="true" className={cn('size-2 rounded-full transition-colors duration-300', i === shown ? 'bg-primary' : 'bg-primary/40')} />
          </button>
        ))}
      </div>
    </section>
  )
}

export function FeaturedNft() {
  return (
    <aside className="hidden rounded-lg bg-surface p-4 md:block" aria-labelledby="featured-title">
      <p className="text-xs uppercase tracking-widest text-primary">NFT em destaque</p>
      <h3 id="featured-title" className="mt-1 text-sm font-semibold uppercase">
        Oferta limitada
      </h3>
      <Link to="/nft/$nftId" params={{ nftId: 'nft-02' }} className="mt-3 block overflow-hidden rounded-lg">
        <img src="/art/ape-sage-400.webp" alt="Sage Nomad #009, NFT em destaque" width={260} height={260} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
      </Link>
    </aside>
  )
}

const PROMOS = [
  { image: '/art/ape-emerald-400.webp', title: 'Lançamentos gênesis de edição limitada', text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.', tab: 'new' as const },
  { image: '/art/ape-ivory-400.webp', title: 'Arte digital selecionada e muito mais', text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.', tab: 'trending' as const },
]

export function PromoBanners() {
  return (
    <section className="mx-auto grid max-w-[1200px] gap-4 px-4 md:grid-cols-2" aria-label="Destaques">
      {PROMOS.map((p) => (
        <article key={p.title} className="grid grid-cols-[140px_1fr] items-center gap-4 rounded-lg bg-surface md:grid-cols-[200px_1fr]">
          <img src={p.image} alt="" width={200} height={200} loading="lazy" decoding="async" className="h-full w-full rounded-l-lg object-cover" />
          <div className="py-4 pr-4 text-right">
            <h3 className="text-sm font-semibold">{p.title}</h3>
            <p className="mt-2 text-xs text-warm">{p.text}</p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/" search={{ tab: p.tab }} hash="catalogo">
                Explorar <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

const POSTS = [
  { image: '/art/ape-ivory-400.webp', date: '12 de setembro', read: 'Leitura de 6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { image: '/art/ape-emerald-400.webp', date: '13 de setembro', read: 'Leitura de 2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { image: '/art/ape-sage-400.webp', date: '15 de setembro', read: 'Leitura de 3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { image: '/art/ape-golden-400.webp', date: '15 de setembro', read: 'Leitura de 2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

export function BlogSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-4" aria-labelledby="blog-title">
      <h2 id="blog-title" className="text-center text-xl font-semibold">
        Diário da Cunhagem
      </h2>
      <p className="mt-1 text-center text-xs text-warm">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((p) => (
          <article key={p.title} className="overflow-hidden rounded-lg bg-surface">
            <img src={p.image} alt="" width={280} height={200} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
            <div className="p-3">
              <p className="text-[10px] text-warm">
                {p.date} <span aria-hidden="true">|</span> {p.read}
              </p>
              <h3 className="mt-1 text-sm font-semibold">{p.title}</h3>
              <p className="mt-1 text-xs text-warm">{p.text}</p>
              <button type="button" onClick={() => outOfScope(p.title)} className="mt-2 text-xs text-primary hover:underline">
                Ler mais →
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
