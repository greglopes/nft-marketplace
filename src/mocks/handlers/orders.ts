import { delay, http } from 'msw'
import { createOrderInputSchema, type Order } from '@/lib/api/contracts'
import { getDb, nowIso, persist, randomId, type DbOrder } from '../db'
import { publishNftUpdated, publishOrderUpdated } from '../realtime'
import { getScenario } from '../scenarios'
import { computeQuote, getOrCreateCart } from './cart'
import { API, apiError, applyLatency, authenticate, json, zodFields } from './utils'

const DEFAULT_PAYMENT_DELAY_MS = 2500
const firstAttemptSeen = new Set<string>()
const scheduled = new Set<string>()

function toPublic(order: DbOrder): Order {
  const { userId: _u, ...rest } = order
  return rest
}

function txRef() {
  const hex = () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0')
  return `0x${hex()}_${hex()}`
}

/** Settles a pending order after the configured delay (idempotent per order). */
export function scheduleSettlement(orderId: string) {
  if (scheduled.has(orderId)) return
  scheduled.add(orderId)
  const scenario = getScenario()
  const wait = scenario.paymentDelayMs ?? DEFAULT_PAYMENT_DELAY_MS
  setTimeout(() => {
    const db = getDb()
    const order = db.orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'pending') return
    const outcome = scenario.paymentOutcome ?? 'confirmed'
    order.status = outcome
    order.updatedAt = nowIso()
    order.version += 1
    if (outcome === 'declined') {
      order.declineReason = 'Pagamento recusado pela carteira conectada.'
      // release reserved availability
      for (const line of order.lines) {
        const nft = db.nfts.find((n) => n.id === line.nftId)
        const ed = nft?.editions.find((e) => e.id === line.editionId)
        if (nft && ed) {
          ed.available += line.quantity
          nft.version += 1
          db.catalogVersion += 1
          publishNftUpdated(nft)
        }
      }
    } else {
      // remove only purchased items/quantities from the cart
      const cart = db.carts[`user:${order.userId}`]
      if (cart) {
        for (const line of order.lines) {
          const item = cart.items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId)
          if (!item) continue
          item.quantity -= line.quantity
          if (item.quantity <= 0) cart.items = cart.items.filter((i) => i.id !== item.id)
        }
        if (cart.items.length === 0) cart.coupon = null
        cart.updatedAt = nowIso()
      }
    }
    persist()
    publishOrderUpdated(toPublic(order), order.userId)
  }, wait)
}

/** Re-arm settlement timers for pending orders after a page reload. */
export function resumePendingOrders() {
  for (const o of getDb().orders) if (o.status === 'pending') scheduleSettlement(o.id)
}

export const orderHandlers = [
  http.post(`${API}/orders`, async ({ request }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const key = request.headers.get('idempotency-key')
    if (!key) return apiError(422, 'VALIDATION_ERROR', 'Idempotency-Key obrigatório.')
    const raw = await request.json().catch(() => null)
    const parsed = createOrderInputSchema.safeParse(raw)
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Verifique os dados do pedido.', { fields: zodFields(parsed.error) })
    const db = getDb()
    const fingerprint = JSON.stringify(parsed.data)

    // Idempotency: same key + same body => same order; different body => conflict.
    const existing = db.idempotency[key]
    if (existing) {
      if (existing.userId !== auth.ctx.user.id) return apiError(403, 'FORBIDDEN', 'Chave de idempotência pertence a outro usuário.')
      if (existing.fingerprint !== fingerprint) return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Chave de idempotência reutilizada com conteúdo diferente.')
      const order = db.orders.find((o) => o.id === existing.orderId)
      if (order) {
        scheduleSettlement(order.id)
        return json(toPublic(order), 200)
      }
    }

    const scenario = getScenario()
    const cart = getOrCreateCart(db, `user:${auth.ctx.user.id}`, 'user')
    if (cart.items.length === 0) return apiError(409, 'QUOTE_OUTDATED', 'Seu carrinho está vazio.')

    // Scenario hooks: mutate the catalog on the first attempt to force revalidation.
    if (scenario.orderFirstAttempt && !firstAttemptSeen.has(key)) {
      firstAttemptSeen.add(key)
      const first = cart.items[0]
      const nft = db.nfts.find((n) => n.id === first.nftId)!
      if (scenario.orderFirstAttempt === 'price-change') {
        nft.previousPrice = nft.price
        nft.price = (Number(nft.price) + 0.2).toFixed(2)
        nft.version += 1
        db.catalogVersion += 1
        persist()
        publishNftUpdated(nft)
      } else if (scenario.orderFirstAttempt === 'sold-out') {
        const ed = nft.editions.find((e) => e.id === first.editionId)!
        ed.available = 0
        nft.version += 1
        db.catalogVersion += 1
        persist()
        publishNftUpdated(nft)
      } else if (scenario.orderFirstAttempt === 'transient') {
        return apiError(503, 'TRANSIENT_FAILURE', 'Serviço temporariamente indisponível. Tente novamente.')
      }
    }

    const quote = computeQuote(db, cart)
    if (quote.quoteId !== parsed.data.quoteId || !quote.valid) {
      return apiError(409, 'QUOTE_OUTDATED', 'A cotação mudou. Revise os valores antes de confirmar.', { details: { quote } })
    }

    const wallets = db.wallets[auth.ctx.user.id]
    const wallet = [wallets?.primary, wallets?.secondary].find((w) => w && w.id === parsed.data.walletId)
    if (!wallet) return apiError(422, 'VALIDATION_ERROR', 'Selecione uma carteira cadastrada.', { fields: { walletId: 'Carteira inválida' } })

    // Reserve availability now; released again if the payment is declined.
    for (const line of quote.lines) {
      const nft = db.nfts.find((n) => n.id === line.nftId)!
      const ed = nft.editions.find((e) => e.id === line.editionId)!
      ed.available -= line.quantity
      nft.version += 1
      db.catalogVersion += 1
    }

    const order: DbOrder = {
      id: randomId('ord'),
      userId: auth.ctx.user.id,
      status: 'pending',
      txRef: txRef(),
      explorerUrl: '',
      lines: quote.lines,
      subtotal: quote.subtotal,
      discount: quote.discount,
      networkFee: quote.networkFee,
      total: quote.total,
      couponCode: quote.coupon?.code ?? null,
      wallet: { id: wallet.id, type: parsed.data.walletType, address: wallet.address, nickname: wallet.nickname },
      network: parsed.data.network,
      collector: parsed.data.collector,
      declineReason: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      version: 1,
    }
    order.explorerUrl = `https://etherscan.io/tx/${order.txRef}`
    db.orders.push(order)
    db.idempotency[key] = { userId: auth.ctx.user.id, fingerprint, orderId: order.id }
    persist()
    for (const line of quote.lines) publishNftUpdated(db.nfts.find((n) => n.id === line.nftId)!)
    scheduleSettlement(order.id)

    if (scenario.orderFirstAttempt === 'timeout' && firstAttemptSeen.has(key) && !firstAttemptSeen.has(`${key}:responded`)) {
      firstAttemptSeen.add(`${key}:responded`)
      await delay('infinite')
    }
    return json(toPublic(order), 202)
  }),

  http.get(`${API}/orders`, async ({ request }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const items = getDb().orders.filter((o) => o.userId === auth.ctx.user.id).map(toPublic)
    return json({ items })
  }),

  http.get(`${API}/orders/:id`, async ({ request, params }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const order = getDb().orders.find((o) => o.id === params.id)
    if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
    if (order.userId !== auth.ctx.user.id) return apiError(403, 'FORBIDDEN', 'Este pedido pertence a outro colecionador.')
    if (order.status === 'pending') scheduleSettlement(order.id)
    return json(toPublic(order))
  }),
]
