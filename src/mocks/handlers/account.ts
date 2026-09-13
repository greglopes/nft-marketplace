import { http } from 'msw'
import { z } from 'zod'
import { passwordInputSchema, profileInputSchema, walletInputSchema, walletSlot, type Wallet } from '@/lib/api/contracts'
import { getDb, hashPassword, nowIso, persist, randomId } from '../db'
import { API, apiError, applyLatency, authenticate, json, publicUser, zodFields } from './utils'

const avatarSchema = z.object({ dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp|svg\+xml);base64,/, 'Envie uma imagem PNG, JPEG ou WebP').max(600_000, 'Imagem muito grande (máx. ~400KB)').nullable() })

export const accountHandlers = [
  http.get(`${API}/profile`, async ({ request }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    return json(publicUser(auth.ctx.user))
  }),

  http.patch(`${API}/profile`, async ({ request }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const parsed = profileInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos.', { fields: zodFields(parsed.error) })
    const db = getDb()
    const { user } = auth.ctx
    const email = parsed.data.email.toLowerCase()
    if (db.users.some((u) => u.id !== user.id && u.email.toLowerCase() === email)) {
      return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', { fields: { email: 'E-mail já cadastrado' } })
    }
    if (db.users.some((u) => u.id !== user.id && u.username.toLowerCase() === parsed.data.username.toLowerCase())) {
      return apiError(409, 'USERNAME_TAKEN', 'Nome de usuário indisponível.', { fields: { username: 'Nome de usuário indisponível' } })
    }
    user.displayName = parsed.data.displayName
    user.username = parsed.data.username
    user.email = email
    user.ensName = parsed.data.ensName ? parsed.data.ensName : null
    user.walletNickname = parsed.data.walletNickname ? parsed.data.walletNickname : null
    persist()
    return json(publicUser(user))
  }),

  http.put(`${API}/profile/avatar`, async ({ request }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const parsed = avatarSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Avatar inválido.', { fields: zodFields(parsed.error) })
    auth.ctx.user.avatarUrl = parsed.data.dataUrl
    persist()
    return json(publicUser(auth.ctx.user))
  }),

  http.post(`${API}/profile/password`, async ({ request }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const parsed = passwordInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos.', { fields: zodFields(parsed.error) })
    const { user } = auth.ctx
    const current = await hashPassword(parsed.data.currentPassword, user.salt)
    if (current !== user.passwordHash) {
      return apiError(422, 'PASSWORD_MISMATCH', 'Senha atual incorreta.', { fields: { currentPassword: 'Senha atual incorreta' } })
    }
    user.salt = crypto.randomUUID()
    user.passwordHash = await hashPassword(parsed.data.newPassword, user.salt)
    persist()
    return new Response(null, { status: 204 })
  }),

  http.get(`${API}/wallets`, async ({ request }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const db = getDb()
    const wallets = db.wallets[auth.ctx.user.id] ?? { primary: null, secondary: null }
    return json(wallets)
  }),

  http.put(`${API}/wallets/:slot`, async ({ request, params }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const slot = walletSlot.safeParse(params.slot)
    if (!slot.success) return apiError(404, 'NOT_FOUND', 'Slot de carteira inválido.')
    const parsed = walletInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos.', { fields: zodFields(parsed.error) })
    const db = getDb()
    const wallets = (db.wallets[auth.ctx.user.id] ??= { primary: null, secondary: null })
    const other = slot.data === 'primary' ? wallets.secondary : wallets.primary
    if (other && other.address.toLowerCase() === parsed.data.address.toLowerCase()) {
      return apiError(409, 'VALIDATION_ERROR', 'Este endereço já está cadastrado na outra carteira.', { fields: { address: 'Endereço já cadastrado' } })
    }
    const existing = wallets[slot.data]
    const wallet: Wallet = { ...parsed.data, id: existing?.id ?? randomId('w'), slot: slot.data, updatedAt: nowIso() }
    wallets[slot.data] = wallet
    persist()
    return json(wallet, existing ? 200 : 201)
  }),

  http.delete(`${API}/wallets/:slot`, async ({ request, params }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const slot = walletSlot.safeParse(params.slot)
    if (!slot.success) return apiError(404, 'NOT_FOUND', 'Slot de carteira inválido.')
    const db = getDb()
    const wallets = (db.wallets[auth.ctx.user.id] ??= { primary: null, secondary: null })
    wallets[slot.data] = null
    persist()
    return new Response(null, { status: 204 })
  }),
]
