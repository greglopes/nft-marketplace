/**
 * Realtime notices: user-facing messages about price/availability changes that
 * affect the current cart. Rendered in an aria-live region by the cart and the
 * checkout so screen readers get the same feedback.
 */
import { useSyncExternalStore } from 'react'

export interface RealtimeNotice {
  id: string
  nftId: string
  name: string
  kind: 'price' | 'availability'
  message: string
  at: number
}

let notices: RealtimeNotice[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const noticesStore = {
  get: () => notices,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  push(n: Omit<RealtimeNotice, 'id' | 'at'>) {
    notices = [{ ...n, id: crypto.randomUUID(), at: Date.now() }, ...notices].slice(0, 10)
    emit()
  },
  dismiss(id: string) {
    notices = notices.filter((n) => n.id !== id)
    emit()
  },
  clear() {
    notices = []
    emit()
  },
}

export const useNotices = () => useSyncExternalStore(noticesStore.subscribe, noticesStore.get, noticesStore.get)
