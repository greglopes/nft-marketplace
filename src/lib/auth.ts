import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, setSessionExpiredHandler } from './api/client'
import type { LoginInput, RegisterInput } from './api/contracts'
import { authApi } from './api/endpoints'
import { noticesStore } from './notices'
import { PRIVATE_KEY_PREFIXES } from './query-keys'
import { getRealtime } from './realtime'
import { rotateGuestId, sessionStore } from './session'

let resolveReady: () => void = () => {}
/** Resolves once the persisted token was validated (or there was none). */
export const sessionReady = new Promise<void>((resolve) => {
  resolveReady = resolve
})

export const CHECKOUT_DRAFT_KEY = 'kurio.checkout.draft'
export const CHECKOUT_PENDING_KEY = 'kurio.checkout.pending'

/**
 * Drops every user-scoped query. The checkout draft is kept on session
 * expiry (so the user can resume) and dropped on explicit logout.
 */
export function clearPrivateCache(qc: QueryClient, opts: { keepCheckoutDraft?: boolean } = {}) {
  for (const prefix of PRIVATE_KEY_PREFIXES) qc.removeQueries({ queryKey: [prefix] })
  noticesStore.clear()
  if (!opts.keepCheckoutDraft) {
    try {
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY)
      localStorage.removeItem(CHECKOUT_PENDING_KEY)
    } catch {
      /* ignore */
    }
  }
}

export async function bootSession(qc: QueryClient) {
  const { token } = sessionStore.get()
  if (!token) {
    resolveReady()
    return
  }
  try {
    const session = await authApi.session()
    sessionStore.signIn(session)
  } catch (error) {
    const apiError = ApiError.from(error)
    if (apiError.status === 401) sessionStore.signOut()
    else sessionStore.set({ status: 'guest' }) // network problem: treat as guest but keep token for retry
    clearPrivateCache(qc, { keepCheckoutDraft: true })
  } finally {
    resolveReady()
  }
}

async function afterAuth(qc: QueryClient) {
  // The server merged the guest cart into the account; drop the old guest key.
  rotateGuestId()
  // The checkout draft is user-scoped, so it can survive a re-login after expiry.
  clearPrivateCache(qc, { keepCheckoutDraft: true })
  getRealtime().authenticate()
  await qc.invalidateQueries({ queryKey: ['cart'] })
}

export async function login(qc: QueryClient, input: LoginInput) {
  const session = await authApi.login(input)
  sessionStore.signIn(session)
  await afterAuth(qc)
  return session
}

export async function register(qc: QueryClient, input: RegisterInput) {
  const session = await authApi.register(input)
  sessionStore.signIn(session)
  await afterAuth(qc)
  return session
}

export async function logout(qc: QueryClient) {
  try {
    await authApi.logout()
  } catch {
    /* the session is cleared locally regardless */
  }
  sessionStore.signOut()
  rotateGuestId()
  clearPrivateCache(qc)
  getRealtime().authenticate()
  await qc.invalidateQueries({ queryKey: ['cart'] })
}

/** Installed once: any 401 with an active token ends the session gracefully. */
export function installSessionExpiryHandler(qc: QueryClient, onExpired: () => void) {
  setSessionExpiredHandler(() => {
    if (!sessionStore.get().token) return
    sessionStore.signOut()
    clearPrivateCache(qc, { keepCheckoutDraft: true })
    getRealtime().authenticate()
    toast.warning('Sua sessão expirou. Entre novamente para continuar.')
    onExpired()
  })
}
