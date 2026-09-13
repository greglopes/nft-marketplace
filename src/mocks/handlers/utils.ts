import { delay, HttpResponse, type DefaultBodyType } from 'msw'
import type { ApiErrorBody, ApiErrorCode } from '@/lib/api/contracts'
import { getDb, persist, type DbSession, type MockDb } from '../db'
import type { DbUser } from '../fixtures/users'
import { getScenario } from '../scenarios'

export const API = '/api'

export async function applyLatency() {
  const s = getScenario()
  if (s.offline) {
    await delay(s.latency[0])
    throw HttpResponse.error()
  }
  const [min, max] = s.latency
  await delay(min + Math.floor(Math.random() * Math.max(0, max - min)))
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: Partial<Pick<ApiErrorBody, 'fields' | 'details'>> = {},
) {
  return HttpResponse.json<ApiErrorBody>({ code, message, ...extra }, { status })
}

export function json<T extends DefaultBodyType>(body: T, status = 200) {
  return HttpResponse.json(body, { status })
}

export interface AuthContext {
  user: DbUser
  session: DbSession
  db: MockDb
}

export type AuthResult = { ok: true; ctx: AuthContext } | { ok: false; response: Response }

export function authenticate(request: Request): AuthResult {
  const db = getDb()
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return { ok: false, response: apiError(401, 'UNAUTHORIZED', 'Faça login para continuar.') }
  const session = db.sessions.find((s) => s.token === token)
  if (!session) return { ok: false, response: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    db.sessions = db.sessions.filter((s) => s.token !== token)
    persist()
    return { ok: false, response: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') }
  }
  const user = db.users.find((u) => u.id === session.userId)
  if (!user) return { ok: false, response: apiError(401, 'UNAUTHORIZED', 'Usuário não encontrado.') }
  return { ok: true, ctx: { user, session, db } }
}

export function guestId(request: Request): string | null {
  return request.headers.get('x-guest-id')
}

export function publicUser(user: DbUser) {
  const { passwordHash: _h, salt: _s, ...rest } = user
  return rest
}

export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function zodFields(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_'
    if (!fields[key]) fields[key] = issue.message
  }
  return fields
}
