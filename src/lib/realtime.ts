/**
 * Socket.IO client wiring. Events carry a stable id + resource + version.
 * Duplicates (same eventId) and stale versions are ignored; after a reconnect
 * every active query is reconciled against REST.
 */
import type { Socket } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import {
  REALTIME_EVENTS,
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  type Cart,
  type CatalogResponse,
  type Nft,
  type NftUpdatedEvent,
  type Order,
} from './api/contracts'
import { formatEth } from './money'
import { noticesStore } from './notices'
import { queryKeys } from './query-keys'
import { sessionStore } from './session'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

interface RealtimeState {
  status: RealtimeStatus
  lastEventAt: number | null
  reconnects: number
}

let state: RealtimeState = { status: 'idle', lastEventAt: null, reconnects: 0 }
const listeners = new Set<() => void>()
const setState = (patch: Partial<RealtimeState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const useRealtimeStatus = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
    () => state,
  )

const MAX_SEEN = 500

export class RealtimeClient {
  socket: Socket | null = null
  private readonly seen = new Set<string>()
  private readonly versions = new Map<string, number>()
  private everConnected = false
  private readonly qc: QueryClient
  private readonly url: string
  private connecting: Promise<void> | null = null

  constructor(qc: QueryClient, url = window.location.origin) {
    this.qc = qc
    this.url = url
  }

  /**
   * `socket.io-client` captures the global WebSocket constructor when its module
   * is evaluated, so it is imported lazily — after MSW has patched WebSocket.
   */
  connect(): Promise<void> {
    if (this.socket) {
      if (!this.socket.connected) this.socket.connect()
      return Promise.resolve()
    }
    if (this.connecting) return this.connecting
    setState({ status: 'connecting' })
    this.connecting = import('socket.io-client').then(({ io }) => {
      this.socket = io(this.url, {
        path: '/socket.io',
        transports: ['websocket'],
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 4000,
        timeout: 8000,
      })
      this.bind(this.socket)
      this.socket.connect()
    })
    return this.connecting
  }

  disconnect() {
    this.socket?.disconnect()
    setState({ status: 'disconnected' })
  }

  /** (Re)announce the current session to the server; clears per-user state. */
  authenticate() {
    this.versions.clear()
    if (this.socket?.connected) this.socket.emit(REALTIME_EVENTS.sessionAuth, { token: sessionStore.get().token })
  }

  private bind(s: Socket) {
    s.on('connect', () => {
      s.emit(REALTIME_EVENTS.sessionAuth, { token: sessionStore.get().token })
      const wasReconnect = this.everConnected
      this.everConnected = true
      setState({ status: 'connected', reconnects: wasReconnect ? state.reconnects + 1 : state.reconnects })
      if (wasReconnect) this.reconcile()
    })
    s.on('disconnect', () => setState({ status: 'reconnecting' }))
    s.on('connect_error', () => setState({ status: 'reconnecting' }))
    s.io.on('reconnect_attempt', () => setState({ status: 'reconnecting' }))
    s.on(REALTIME_EVENTS.nftUpdated, (raw: unknown) => this.onNftUpdated(raw))
    s.on(REALTIME_EVENTS.orderUpdated, (raw: unknown) => this.onOrderUpdated(raw))
  }

  /** After a reconnection, refetch what is on screen so REST is the source of truth. */
  reconcile() {
    void this.qc.invalidateQueries({ type: 'active' })
  }

  private accept(eventId: string, resource: string, id: string, version: number): boolean {
    if (this.seen.has(eventId)) return false
    this.seen.add(eventId)
    if (this.seen.size > MAX_SEEN) this.seen.delete(this.seen.values().next().value as string)
    const key = `${resource}:${id}`
    const known = this.versions.get(key) ?? this.knownVersion(resource, id)
    if (known !== undefined && version <= known) return false
    this.versions.set(key, version)
    setState({ lastEventAt: Date.now() })
    return true
  }

  private knownVersion(resource: string, id: string): number | undefined {
    if (resource === 'nft') return this.qc.getQueryData<Nft>(queryKeys.nft(id))?.version
    if (resource === 'order') {
      const userId = sessionStore.get().user?.id
      return userId ? this.qc.getQueryData<Order>(queryKeys.order(userId, id))?.version : undefined
    }
    return undefined
  }

  private onNftUpdated(raw: unknown) {
    const parsed = nftUpdatedEventSchema.safeParse(raw)
    if (!parsed.success) return
    const evt = parsed.data
    if (!this.accept(evt.eventId, 'nft', evt.id, evt.version)) return
    this.applyNft(evt)
  }

  private applyNft(evt: NftUpdatedEvent) {
    const qc = this.qc
    const patch = { price: evt.data.price, previousPrice: evt.data.previousPrice, editions: evt.data.editions, version: evt.version }
    qc.setQueryData<Nft>(queryKeys.nft(evt.id), (old) => (old && old.version < evt.version ? { ...old, ...patch } : old))
    qc.setQueriesData<CatalogResponse>({ queryKey: queryKeys.catalogAll }, (old) =>
      old ? { ...old, items: old.items.map((it) => (it.id === evt.id && it.version < evt.version ? { ...it, ...patch } : it)) } : old,
    )
    // Cart: update the snapshot, notify, and force a fresh quote.
    let affected = false
    qc.setQueriesData<Cart>({ queryKey: ['cart'], predicate: (q) => q.queryKey.length === 2 }, (old) => {
      if (!old) return old
      const items = old.items.map((item) => {
        if (item.nftId !== evt.id) return item
        affected = true
        const edition = evt.data.editions.find((e) => e.id === item.editionId)
        if (item.nft.price !== evt.data.price) {
          noticesStore.push({ nftId: evt.id, name: item.nft.name, kind: 'price', message: `${item.nft.name}: preço alterado de ${formatEth(item.nft.price)} para ${formatEth(evt.data.price)}.` })
        }
        const prevEdition = item.nft.editions.find((e) => e.id === item.editionId)
        if (edition && prevEdition && edition.available !== prevEdition.available) {
          noticesStore.push({ nftId: evt.id, name: item.nft.name, kind: 'availability', message: edition.available === 0 ? `${item.nft.name}: edição ${edition.label} esgotou.` : `${item.nft.name}: disponibilidade da edição ${edition.label} agora é ${edition.available}.` })
        }
        return { ...item, nft: { ...item.nft, ...patch } }
      })
      return { ...old, items }
    })
    if (affected) {
      void qc.invalidateQueries({ queryKey: ['cart'], predicate: (q) => q.queryKey.length === 3 })
    }
  }

  private onOrderUpdated(raw: unknown) {
    const parsed = orderUpdatedEventSchema.safeParse(raw)
    if (!parsed.success) return
    const evt = parsed.data
    const user = sessionStore.get().user
    // Events from another user's session must never touch this cache.
    if (!user || evt.userId !== user.id) return
    if (!this.accept(evt.eventId, 'order', evt.id, evt.version)) return
    const key = queryKeys.order(user.id, evt.id)
    this.qc.setQueryData<Order>(key, (old) => (!old || old.version < evt.version ? evt.data : old))
    void this.qc.invalidateQueries({ queryKey: queryKeys.orders(user.id) })
    if (evt.data.status === 'confirmed') {
      void this.qc.invalidateQueries({ queryKey: queryKeys.cart(`user:${user.id}`) })
      void this.qc.invalidateQueries({ queryKey: queryKeys.catalogAll })
      toast.success('Pedido confirmado na rede.')
    } else if (evt.data.status === 'declined') {
      toast.error('Pagamento recusado.')
    }
  }
}

let client: RealtimeClient | null = null
export function getRealtime(qc?: QueryClient): RealtimeClient {
  if (!client) {
    if (!qc) throw new Error('Realtime client not initialised')
    client = new RealtimeClient(qc)
    ;(window as unknown as { __kurioRealtime: unknown }).__kurioRealtime = {
      getStatus: () => state,
      isConnected: () => !!client?.socket?.connected,
    }
  }
  return client
}
