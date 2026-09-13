import { http } from 'msw'
import { loginInputSchema, registerInputSchema, type Cart } from '@/lib/api/contracts'
import { getDb, hashPassword, nowIso, persist, randomId } from '../db'
import { getScenario } from '../scenarios'
import { API, apiError, applyLatency, authenticate, guestId, json, publicUser, zodFields } from './utils'
import type { DbUser } from '../fixtures/users'

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000

function createSession(user: DbUser) {
  const db = getDb()
  const ttl = getScenario().sessionTtlMs ?? DEFAULT_TTL_MS
  const session = {
    token: `tok_${crypto.randomUUID()}`,
    userId: user.id,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + ttl).toISOString(),
  }
  db.sessions.push(session)
  persist()
  return session
}

/** Guest cart items are merged into the user's cart when authenticating. */
function mergeGuestCart(userId: string, guest: string | null) {
  if (!guest) return
  const db = getDb()
  const guestKey = `guest:${guest}`
  const userKey = `user:${userId}`
  const guestCart = db.carts[guestKey]
  if (!guestCart || guestCart.items.length === 0) return
  const userCart: Cart = db.carts[userKey] ?? { id: userKey, ownerType: 'user', items: [], coupon: null, updatedAt: nowIso() }
  for (const item of guestCart.items) {
    const existing = userCart.items.find((i) => i.nftId === item.nftId && i.editionId === item.editionId)
    const nft = db.nfts.find((n) => n.id === item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    const limit = edition ? Math.min(edition.available, edition.maxPerOrder) : item.quantity
    if (existing) existing.quantity = Math.max(1, Math.min(limit, existing.quantity + item.quantity))
    else userCart.items.push({ ...item, id: randomId('ci'), quantity: Math.max(1, Math.min(limit, item.quantity)) })
  }
  userCart.coupon = userCart.coupon ?? guestCart.coupon
  userCart.updatedAt = nowIso()
  db.carts[userKey] = userCart
  delete db.carts[guestKey]
  persist()
}

export const authHandlers = [
  http.post(`${API}/auth/register`, async ({ request }) => {
    await applyLatency()
    const body = await request.json().catch(() => null)
    const parsed = registerInputSchema.safeParse(body)
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos.', { fields: zodFields(parsed.error) })
    const db = getDb()
    const email = parsed.data.email.toLowerCase()
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { fields: { email: 'E-mail já cadastrado' } })
    }
    if (db.users.some((u) => u.username.toLowerCase() === parsed.data.username.toLowerCase())) {
      return apiError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { fields: { username: 'Nome de usuário indisponível' } })
    }
    const id = randomId('u')
    const salt = crypto.randomUUID()
    const user: DbUser = {
      id,
      username: parsed.data.username,
      displayName: parsed.data.username,
      email,
      ensName: null,
      walletNickname: null,
      avatarUrl: null,
      createdAt: nowIso(),
      salt,
      passwordHash: await hashPassword(parsed.data.password, salt),
    }
    db.users.push(user)
    db.favorites[id] = []
    db.wallets[id] = { primary: null, secondary: null }
    persist()
    mergeGuestCart(id, guestId(request))
    const session = createSession(user)
    return json({ token: session.token, expiresAt: session.expiresAt, user: publicUser(user) }, 201)
  }),

  http.post(`${API}/auth/login`, async ({ request }) => {
    await applyLatency()
    const body = await request.json().catch(() => null)
    const parsed = loginInputSchema.safeParse(body)
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos.', { fields: zodFields(parsed.error) })
    const db = getDb()
    const user = db.users.find((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase())
    if (!user) return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.')
    const hash = await hashPassword(parsed.data.password, user.salt)
    if (hash !== user.passwordHash) return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.')
    mergeGuestCart(user.id, guestId(request))
    const session = createSession(user)
    return json({ token: session.token, expiresAt: session.expiresAt, user: publicUser(user) })
  }),

  http.get(`${API}/auth/session`, async ({ request }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    return json({ token: auth.ctx.session.token, expiresAt: auth.ctx.session.expiresAt, user: publicUser(auth.ctx.user) })
  }),

  http.post(`${API}/auth/logout`, async ({ request }) => {
    await applyLatency()
    const db = getDb()
    const header = request.headers.get('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (token) {
      db.sessions = db.sessions.filter((s) => s.token !== token)
      persist()
    }
    return new Response(null, { status: 204 })
  }),
]
