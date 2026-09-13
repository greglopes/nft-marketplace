import type { Cart, Nft, Order, Wallet, WalletSlot } from '@/lib/api/contracts'
import { buildNftFixtures } from './fixtures/nfts'
import {
  FIXTURE_CART_ITEMS,
  FIXTURE_FAVORITES,
  FIXTURE_USERS,
  FIXTURE_WALLETS,
  type DbUser,
} from './fixtures/users'

export interface DbSession {
  token: string
  userId: string
  expiresAt: string
  createdAt: string
}

export interface DbOrder extends Order {
  userId: string
}

export interface IdempotencyRecord {
  userId: string
  fingerprint: string
  orderId: string
}

export interface MockDb {
  schema: 1
  fixtureVersion: number
  nfts: Nft[]
  users: DbUser[]
  sessions: DbSession[]
  favorites: Record<string, string[]>
  carts: Record<string, Cart>
  orders: DbOrder[]
  wallets: Record<string, Record<WalletSlot, Wallet | null>>
  idempotency: Record<string, IdempotencyRecord>
  catalogVersion: number
  seq: number
}

export const DB_STORAGE_KEY = 'kurio.mock.db.v1'
/** Bump when fixtures change shape/content: persisted state is reseeded automatically. */
export const FIXTURE_VERSION = 2

let db: MockDb | null = null

/* ------------------------------------------------------------------ */
/* Password hashing (never store plain text, even in a mock)           */
/* ------------------------------------------------------------------ */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function randomId(prefix: string): string {
  const rnd = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  return `${prefix}_${rnd}`
}

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */
async function seed(): Promise<MockDb> {
  const users: DbUser[] = []
  for (const u of FIXTURE_USERS) {
    const { password, ...rest } = u
    const salt = `salt-${u.id}`
    users.push({ ...rest, salt, passwordHash: await hashPassword(password, salt) })
  }
  const nfts = buildNftFixtures()
  const carts: Record<string, Cart> = {}
  for (const [userId, items] of Object.entries(FIXTURE_CART_ITEMS)) {
    const key = `user:${userId}`
    carts[key] = {
      id: key,
      ownerType: 'user',
      coupon: null,
      updatedAt: new Date().toISOString(),
      items: items.map((it, i) => {
        const nft = nfts.find((n) => n.id === it.nftId)!
        return { id: `ci_${userId}_${i}`, nftId: it.nftId, editionId: it.editionId, quantity: it.quantity, nft: summarize(nft), addedAt: new Date().toISOString() }
      }),
    }
  }
  return {
    schema: 1,
    fixtureVersion: FIXTURE_VERSION,
    nfts,
    users,
    sessions: [],
    favorites: structuredClone(FIXTURE_FAVORITES),
    carts,
    orders: [],
    wallets: structuredClone(FIXTURE_WALLETS),
    idempotency: {},
    catalogVersion: 1,
    seq: 1,
  }
}

export function summarize(nft: Nft) {
  const { id, tokenId, name, collection, category, network, price, previousPrice, rarity, images, editions, listedAt, trendingScore, version } = nft
  return { id, tokenId, name, collection, category, network, price, previousPrice, rarity, images, editions, listedAt, trendingScore, version }
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */
function load(): MockDb | null {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MockDb
    if (parsed.schema !== 1 || parsed.fixtureVersion !== FIXTURE_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function persist() {
  if (!db) return
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* quota or private mode: state stays in memory */
  }
}

export async function initDb(opts: { reset?: boolean } = {}): Promise<MockDb> {
  if (!opts.reset) {
    const existing = load()
    if (existing) {
      db = existing
      return db
    }
  }
  db = await seed()
  persist()
  return db
}

export async function resetDb(): Promise<MockDb> {
  return initDb({ reset: true })
}

export function getDb(): MockDb {
  if (!db) throw new Error('Mock DB not initialised')
  return db
}

export function nextSeq(): number {
  const d = getDb()
  d.seq += 1
  persist()
  return d.seq
}

export function nowIso(): string {
  return new Date().toISOString()
}
