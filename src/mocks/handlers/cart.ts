import { http } from 'msw'
import { z } from 'zod'
import type { Cart, CartItem, Quote, QuoteLine } from '@/lib/api/contracts'
import { addEth, mulEthByInt, percentOfEth, subEth } from '@/lib/money'
import { getDb, nowIso, persist, randomId, summarize, type MockDb } from '../db'
import { FIXTURE_COUPONS, NETWORK_FEE_ETH } from '../fixtures/users'
import { API, apiError, applyLatency, authenticate, guestId, json, zodFields } from './utils'

/* ------------------------------------------------------------------ */
/* Cart ownership: authenticated user or guest (X-Guest-Id header)     */
/* ------------------------------------------------------------------ */
export function resolveCartKey(request: Request): { key: string; ownerType: Cart['ownerType']; userId: string | null } | Response {
  const auth = authenticate(request)
  if (auth.ok) return { key: `user:${auth.ctx.user.id}`, ownerType: 'user', userId: auth.ctx.user.id }
  const header = request.headers.get('authorization')
  // A stale/expired token must surface as 401 so the UI can recover the session.
  if (header) return auth.response
  const guest = guestId(request)
  if (!guest) return apiError(401, 'UNAUTHORIZED', 'Identificação do visitante ausente.')
  return { key: `guest:${guest}`, ownerType: 'guest', userId: null }
}

export function getOrCreateCart(db: MockDb, key: string, ownerType: Cart['ownerType']): Cart {
  return (db.carts[key] ??= { id: key, ownerType, items: [], coupon: null, updatedAt: nowIso() })
}

function withFreshSnapshots(db: MockDb, cart: Cart): Cart {
  for (const item of cart.items) {
    const nft = db.nfts.find((n) => n.id === item.nftId)
    if (nft) item.nft = summarize(nft)
  }
  return cart
}

/* ------------------------------------------------------------------ */
/* Quote                                                               */
/* ------------------------------------------------------------------ */
function hash(text: string) {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function findCoupon(code: string) {
  return FIXTURE_COUPONS.find((c) => c.code.toLowerCase() === code.trim().toLowerCase()) ?? null
}

export function couponStatus(code: string): 'applied' | 'invalid' | 'expired' {
  const c = findCoupon(code)
  if (!c) return 'invalid'
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return 'expired'
  return 'applied'
}

export function computeQuote(db: MockDb, cart: Cart): Quote {
  const lines: QuoteLine[] = cart.items.map((item) => {
    const nft = db.nfts.find((n) => n.id === item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    const unitPrice = nft?.price ?? item.nft.price
    const available = edition?.available ?? 0
    const limit = edition ? Math.min(edition.available, edition.maxPerOrder) : 0
    let status: QuoteLine['status'] = 'ok'
    if (available === 0) status = 'unavailable'
    else if (item.quantity > limit) status = 'limited'
    else if (item.nft.price !== unitPrice) status = 'price_changed'
    return {
      cartItemId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      name: nft?.name ?? item.nft.name,
      tokenId: nft?.tokenId ?? item.nft.tokenId,
      image: (nft ?? item.nft).images[0],
      editionLabel: edition?.label ?? '—',
      quantity: item.quantity,
      unitPrice,
      lineTotal: mulEthByInt(unitPrice, item.quantity),
      available,
      status,
      previousUnitPrice: item.nft.price !== unitPrice ? item.nft.price : null,
    }
  })
  const subtotal = lines.filter((l) => l.status !== 'unavailable').reduce((acc, l) => addEth(acc, l.lineTotal), '0')
  const coupon = cart.coupon && couponStatus(cart.coupon) === 'applied' ? findCoupon(cart.coupon) : null
  const discount = coupon ? percentOfEth(subtotal, coupon.discountPct) : '0'
  const networkFee = lines.length ? NETWORK_FEE_ETH : '0'
  const total = addEth(subEth(subtotal, discount), networkFee)
  const valid = lines.length > 0 && lines.every((l) => l.status === 'ok')
  const fingerprint = JSON.stringify({
    lines: lines.map((l) => [l.nftId, l.editionId, l.quantity, l.unitPrice, l.status]).sort(),
    coupon: coupon?.code ?? null,
    networkFee,
  })
  return {
    quoteId: `q_${hash(fingerprint)}`,
    lines,
    subtotal,
    discount,
    networkFee,
    total,
    coupon: coupon ? { code: coupon.code, discountPct: coupon.discountPct, status: 'applied' } : null,
    catalogVersion: db.catalogVersion,
    issuedAt: nowIso(),
    valid,
  }
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */
const addItemSchema = z.object({ nftId: z.string(), editionId: z.string(), quantity: z.number().int().min(1) })
const patchItemSchema = z.object({ quantity: z.number().int().min(1) })
const couponSchema = z.object({ code: z.string().min(1, 'Informe o código') })

export const cartHandlers = [
  http.get(`${API}/cart`, async ({ request }) => {
    await applyLatency()
    const owner = resolveCartKey(request)
    if (owner instanceof Response) return owner
    const db = getDb()
    const cart = withFreshSnapshots(db, getOrCreateCart(db, owner.key, owner.ownerType))
    return json(cart)
  }),

  http.post(`${API}/cart/items`, async ({ request }) => {
    await applyLatency()
    const owner = resolveCartKey(request)
    if (owner instanceof Response) return owner
    const parsed = addItemSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Dados inválidos.', { fields: zodFields(parsed.error) })
    const db = getDb()
    const nft = db.nfts.find((n) => n.id === parsed.data.nftId)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    const edition = nft.editions.find((e) => e.id === parsed.data.editionId)
    if (!edition) return apiError(404, 'NOT_FOUND', 'Edição não encontrada.')
    if (edition.available === 0) return apiError(409, 'EDITION_UNAVAILABLE', 'Esta edição está esgotada.')
    const cart = getOrCreateCart(db, owner.key, owner.ownerType)
    const limit = Math.min(edition.available, edition.maxPerOrder)
    const existing = cart.items.find((i) => i.nftId === nft.id && i.editionId === edition.id)
    const wanted = (existing?.quantity ?? 0) + parsed.data.quantity
    if (wanted > limit) {
      return apiError(409, 'QUANTITY_LIMIT', `Limite de ${limit} unidade(s) para esta edição.`, { details: { limit } })
    }
    if (existing) existing.quantity = wanted
    else {
      const item: CartItem = { id: randomId('ci'), nftId: nft.id, editionId: edition.id, quantity: parsed.data.quantity, nft: summarize(nft), addedAt: nowIso() }
      cart.items.push(item)
    }
    cart.updatedAt = nowIso()
    persist()
    return json(withFreshSnapshots(db, cart), 201)
  }),

  http.patch(`${API}/cart/items/:itemId`, async ({ request, params }) => {
    await applyLatency()
    const owner = resolveCartKey(request)
    if (owner instanceof Response) return owner
    const parsed = patchItemSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Quantidade inválida.', { fields: zodFields(parsed.error) })
    const db = getDb()
    const cart = getOrCreateCart(db, owner.key, owner.ownerType)
    const item = cart.items.find((i) => i.id === params.itemId)
    if (!item) return apiError(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
    const nft = db.nfts.find((n) => n.id === item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    const limit = edition ? Math.min(edition.available, edition.maxPerOrder) : 0
    if (parsed.data.quantity > limit) {
      return apiError(409, 'QUANTITY_LIMIT', `Limite de ${limit} unidade(s) para esta edição.`, { details: { limit } })
    }
    item.quantity = parsed.data.quantity
    cart.updatedAt = nowIso()
    persist()
    return json(withFreshSnapshots(db, cart))
  }),

  http.delete(`${API}/cart/items/:itemId`, async ({ request, params }) => {
    await applyLatency()
    const owner = resolveCartKey(request)
    if (owner instanceof Response) return owner
    const db = getDb()
    const cart = getOrCreateCart(db, owner.key, owner.ownerType)
    cart.items = cart.items.filter((i) => i.id !== params.itemId)
    if (cart.items.length === 0) cart.coupon = null
    cart.updatedAt = nowIso()
    persist()
    return json(withFreshSnapshots(db, cart))
  }),

  http.post(`${API}/cart/coupon`, async ({ request }) => {
    await applyLatency()
    const owner = resolveCartKey(request)
    if (owner instanceof Response) return owner
    const parsed = couponSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Informe o código.', { fields: zodFields(parsed.error) })
    const status = couponStatus(parsed.data.code)
    if (status === 'invalid') return apiError(422, 'COUPON_INVALID', 'Cupom inválido.', { fields: { code: 'Cupom inválido' } })
    if (status === 'expired') return apiError(422, 'COUPON_EXPIRED', 'Este cupom expirou.', { fields: { code: 'Cupom expirado' } })
    const db = getDb()
    const cart = getOrCreateCart(db, owner.key, owner.ownerType)
    cart.coupon = findCoupon(parsed.data.code)!.code
    cart.updatedAt = nowIso()
    persist()
    return json(withFreshSnapshots(db, cart))
  }),

  http.delete(`${API}/cart/coupon`, async ({ request }) => {
    await applyLatency()
    const owner = resolveCartKey(request)
    if (owner instanceof Response) return owner
    const db = getDb()
    const cart = getOrCreateCart(db, owner.key, owner.ownerType)
    cart.coupon = null
    cart.updatedAt = nowIso()
    persist()
    return json(withFreshSnapshots(db, cart))
  }),

  http.get(`${API}/cart/quote`, async ({ request }) => {
    await applyLatency()
    const owner = resolveCartKey(request)
    if (owner instanceof Response) return owner
    const db = getDb()
    const cart = getOrCreateCart(db, owner.key, owner.ownerType)
    return json(computeQuote(db, cart))
  }),
]
