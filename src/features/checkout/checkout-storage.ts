import type { CollectorProfile, CreateOrderInput, NetworkSlug } from '@/lib/api/contracts'
import { CHECKOUT_DRAFT_KEY, CHECKOUT_PENDING_KEY } from '@/lib/auth'

export interface CheckoutDraft {
  userId: string
  collector: Partial<CollectorProfile>
  walletId?: string
  network?: NetworkSlug
}

export interface PendingOrderRecord {
  userId: string
  key: string
  body: CreateOrderInput
  orderId?: string
  createdAt: number
}

function read<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export const checkoutDraft = {
  load: (userId: string): CheckoutDraft | null => {
    const d = read<CheckoutDraft>(sessionStorage, CHECKOUT_DRAFT_KEY)
    return d && d.userId === userId ? d : null
  },
  save: (draft: CheckoutDraft) => {
    try {
      sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft))
    } catch {
      /* ignore */
    }
  },
  clear: () => sessionStorage.removeItem(CHECKOUT_DRAFT_KEY),
}

export const pendingOrder = {
  load: (userId: string): PendingOrderRecord | null => {
    const r = read<PendingOrderRecord>(localStorage, CHECKOUT_PENDING_KEY)
    return r && r.userId === userId ? r : null
  },
  save: (r: PendingOrderRecord) => {
    try {
      localStorage.setItem(CHECKOUT_PENDING_KEY, JSON.stringify(r))
    } catch {
      /* ignore */
    }
  },
  clear: () => localStorage.removeItem(CHECKOUT_PENDING_KEY),
}
