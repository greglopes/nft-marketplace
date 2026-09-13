import type { Nft, CategorySlug, NetworkSlug } from '@/lib/api/contracts'

/** Fixed "now" for deterministic fixtures (listing dates, trending). */
export const FIXTURE_BASE_DATE = '2026-09-01T12:00:00.000Z'

type Seed = {
  name: string
  price: string
  previousPrice?: string
  category: CategorySlug
  network: NetworkSlug
  rarity?: Nft['rarity']
  editions?: Partial<Record<'1/1' | '1/10' | '1/50' | 'ABERTA', number>>
  daysAgo?: number
  trending?: number
}

const FIRST_NINE: Seed[] = [
  { name: 'Emerald Ape #042', price: '1.19', category: 'arte-digital', network: 'ethereum', rarity: 'raro', daysAgo: 1, trending: 96 },
  { name: 'Sage Nomad #009', price: '1.69', category: 'colecionaveis', network: 'ethereum', daysAgo: 2, trending: 88 },
  { name: 'Neon Vessel #552', price: '1.99', previousPrice: '2.29', category: 'arte-3d', network: 'polygon', rarity: 'raro', daysAgo: 3, trending: 91 },
  { name: 'Cosmic Bloom #118', price: '1.29', category: 'generativa', network: 'ethereum', daysAgo: 4, trending: 72 },
  { name: 'Violet Nomad #314', price: '1.39', category: 'colecionaveis', network: 'polygon', editions: { '1/1': 1, '1/10': 3, '1/50': 12, ABERTA: 999 }, daysAgo: 5, trending: 64 },
  { name: 'Ivory Baron #088', price: '1.79', category: 'fotografia', network: 'ethereum', rarity: 'lendario', editions: { '1/1': 0, '1/10': 0, '1/50': 2, ABERTA: 999 }, daysAgo: 6, trending: 83 },
  { name: 'Golden Beat #207', price: '0.99', category: 'musica', network: 'solana', daysAgo: 7, trending: 58 },
  { name: 'Golden Frequency #071', price: '0.59', category: 'musica', network: 'solana', daysAgo: 8, trending: 41 },
  { name: 'Golden Signal #160', price: '0.39', category: 'musica', network: 'polygon', daysAgo: 9, trending: 77 },
]

const ADJECTIVES = ['Amber', 'Cobalt', 'Velvet', 'Lunar', 'Solar', 'Crimson', 'Onyx', 'Opal', 'Indigo', 'Saffron', 'Jade', 'Quartz', 'Static']
const NOUNS = ['Pilgrim', 'Oracle', 'Drifter', 'Echo', 'Cipher', 'Garden', 'Monarch', 'Relic', 'Voyager', 'Harbor', 'Prism', 'Totem', 'Circuit']
const CATS: CategorySlug[] = ['arte-digital', 'fotografia', 'musica', 'arte-3d', 'colecionaveis', 'generativa', 'jogos', 'assinaturas', 'utilidade']
const NETS: NetworkSlug[] = ['ethereum', 'polygon', 'solana']
const ATTRS = ['Óculos', 'Esmeralda', 'Raro', 'Chapéu', 'Fones', 'Neon', 'Vintage', 'Holográfico', 'Dourado', 'Lavanda']

function seedAt(i: number): Seed {
  const adj = ADJECTIVES[i % ADJECTIVES.length]
  const noun = NOUNS[(i * 7) % NOUNS.length]
  const num = String((i * 37) % 900 + 100)
  const priceCents = 2 + ((i * 53) % 1229) // 0.02 .. 12.30
  const price = (priceCents / 100).toFixed(2)
  const hasPrev = i % 5 === 0
  return {
    name: `${adj} ${noun} #${num}`,
    price,
    previousPrice: hasPrev ? ((priceCents + 30 + (i % 40)) / 100).toFixed(2) : undefined,
    category: CATS[i % CATS.length],
    network: NETS[i % NETS.length],
    rarity: i % 7 === 0 ? 'lendario' : i % 3 === 0 ? 'raro' : 'comum',
    daysAgo: 10 + ((i * 3) % 120),
    trending: (i * 29) % 100,
    editions: i % 11 === 0 ? { '1/1': 0, '1/10': 0, '1/50': 0, ABERTA: 999 } : undefined,
  }
}

export const NFT_COUNT = 48

/** The four portraits used by the Figma layout (exported from the file). */
export const PORTRAITS = ['ape-emerald', 'ape-sage', 'ape-ivory', 'ape-golden'] as const
const FIGMA_PORTRAIT_BY_INDEX: Record<number, (typeof PORTRAITS)[number]> = {
  0: 'ape-emerald', 1: 'ape-sage', 2: 'ape-ivory', 3: 'ape-sage', 4: 'ape-sage', 5: 'ape-ivory', 6: 'ape-golden', 7: 'ape-golden', 8: 'ape-golden',
}
export const artUrl = (portrait: (typeof PORTRAITS)[number], size: 400 | 900 = 900) => `/art/${portrait}-${size}.webp`

export function buildNftFixtures(): Nft[] {
  const base = new Date(FIXTURE_BASE_DATE).getTime()
  const seeds: Seed[] = [...FIRST_NINE]
  for (let i = FIRST_NINE.length; i < NFT_COUNT; i++) seeds.push(seedAt(i))

  return seeds.map((s, idx) => {
    const n = idx + 1
    const pad = String(n).padStart(2, '0')
    const tokenId = `#${s.name.split('#')[1] ?? pad}`
    const ed = s.editions ?? { '1/1': n % 4 === 0 ? 0 : 1, '1/10': (n * 3) % 10, '1/50': 5 + ((n * 7) % 40), ABERTA: 999 }
    return {
      id: `nft-${pad}`,
      tokenId,
      name: s.name,
      collection: idx < 9 ? 'Kurio Apes' : ['Kurio Editions', 'Neon Archive', 'Sound Vault'][idx % 3],
      creator: ['Nova Sato', 'Léo Prado', 'Mina Ferraz', 'Iuri Castelo'][idx % 4],
      category: s.category,
      network: s.network,
      price: s.price,
      previousPrice: s.previousPrice ?? null,
      rarity: s.rarity ?? 'comum',
      description: `${s.name} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na ${s.network === 'ethereum' ? 'Ethereum' : s.network === 'polygon' ? 'Polygon' : 'Solana'}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      attributes: [ATTRS[idx % ATTRS.length], ATTRS[(idx + 3) % ATTRS.length], s.rarity === 'raro' ? 'Raro' : s.rarity === 'lendario' ? 'Lendário' : 'Comum'],
      rating: 4 + ((idx * 13) % 10) / 10,
      reviewsCount: 5 + ((idx * 17) % 40),
      images: Array.from({ length: 4 }, () => artUrl(FIGMA_PORTRAIT_BY_INDEX[idx] ?? PORTRAITS[idx % PORTRAITS.length])),
      editions: [
        { id: 'e1', label: '1/1', available: ed['1/1'] ?? 0, maxPerOrder: 1 },
        { id: 'e10', label: '1/10', available: ed['1/10'] ?? 0, maxPerOrder: 3 },
        { id: 'e50', label: '1/50', available: ed['1/50'] ?? 0, maxPerOrder: 10 },
        { id: 'open', label: 'ABERTA', available: ed.ABERTA ?? 999, maxPerOrder: 20 },
      ],
      contract: `0x7A42${pad}…19E8`,
      royaltyPct: 5,
      listedAt: new Date(base - (s.daysAgo ?? 30) * 86_400_000).toISOString(),
      trendingScore: s.trending ?? 50,
      version: 1,
    }
  })
}
