import { http } from 'msw'
import { getDb, persist } from '../db'
import { getScenario } from '../scenarios'
import { API, apiError, applyLatency, authenticate, json } from './utils'

export const favoritesHandlers = [
  http.get(`${API}/favorites`, async ({ request }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    return json({ items: auth.ctx.db.favorites[auth.ctx.user.id] ?? [] })
  }),

  http.put(`${API}/favorites/:nftId`, async ({ request, params }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const status = getScenario().favoritesStatus
    if (status) return apiError(status, 'TRANSIENT_FAILURE', 'Não foi possível salvar o favorito agora.')
    const db = getDb()
    const nftId = String(params.nftId)
    if (!db.nfts.some((n) => n.id === nftId)) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    const list = db.favorites[auth.ctx.user.id] ?? (db.favorites[auth.ctx.user.id] = [])
    if (!list.includes(nftId)) list.push(nftId)
    persist()
    return json({ items: list })
  }),

  http.delete(`${API}/favorites/:nftId`, async ({ request, params }) => {
    await applyLatency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const status = getScenario().favoritesStatus
    if (status) return apiError(status, 'TRANSIENT_FAILURE', 'Não foi possível remover o favorito agora.')
    const db = getDb()
    const nftId = String(params.nftId)
    db.favorites[auth.ctx.user.id] = (db.favorites[auth.ctx.user.id] ?? []).filter((id) => id !== nftId)
    persist()
    return json({ items: db.favorites[auth.ctx.user.id] })
  }),
]
