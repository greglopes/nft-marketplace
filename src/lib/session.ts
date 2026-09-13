/**
 * Session store: the access token lives in localStorage so the session survives
 * refresh; the user object is kept in memory and re-validated through
 * GET /api/auth/session on boot. Components subscribe via useSyncExternalStore.
 */
import { useSyncExternalStore } from 'react'
import type { User } from './api/contracts'

export const SESSION_STORAGE_KEY = 'kurio.session.v1'
export const GUEST_STORAGE_KEY = 'kurio.guest.v1'

export interface SessionState {
  token: string | null
  expiresAt: string | null
  user: User | null
  /** 'unknown' until the boot validation finishes */
  status: 'unknown' | 'guest' | 'authenticated'
}

type Listener = () => void
const listeners = new Set<Listener>()

function readPersisted(): Pick<SessionState, 'token' | 'expiresAt'> {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return { token: null, expiresAt: null }
    const parsed = JSON.parse(raw) as { token: string; expiresAt: string }
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return { token: null, expiresAt: null }
    return parsed
  } catch {
    return { token: null, expiresAt: null }
  }
}

let state: SessionState = (() => {
  const p = readPersisted()
  return { ...p, user: null, status: p.token ? 'unknown' : 'guest' }
})()

function emit() {
  for (const l of listeners) l()
}

export const sessionStore = {
  get: () => state,
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  set(next: Partial<SessionState>) {
    state = { ...state, ...next }
    try {
      if (state.token) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: state.token, expiresAt: state.expiresAt }))
      else localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    emit()
  },
  signIn(session: { token: string; expiresAt: string; user: User }) {
    sessionStore.set({ token: session.token, expiresAt: session.expiresAt, user: session.user, status: 'authenticated' })
  },
  signOut() {
    sessionStore.set({ token: null, expiresAt: null, user: null, status: 'guest' })
  },
}

export function getGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_STORAGE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(GUEST_STORAGE_KEY, id)
    }
    return id
  } catch {
    return 'guest-ephemeral'
  }
}

export function rotateGuestId() {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, crypto.randomUUID())
  } catch {
    /* ignore */
  }
}

export function useSession() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
}
