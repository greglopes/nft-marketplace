/**
 * In-page broker for the mocked Socket.IO "server". The ws handler registers
 * each connection here; REST handlers publish events through it so REST and
 * realtime always stay consistent.
 */
import { REALTIME_EVENTS, type Nft, type NftUpdatedEvent, type Order, type OrderUpdatedEvent } from '@/lib/api/contracts'
import { getDb, persist } from './db'

export interface RealtimeConnection {
  id: string
  userId: string | null
  emit: (event: string, payload: unknown) => void
  close: () => void
}

const connections = new Map<string, RealtimeConnection>()
let eventSeq = 0

export function registerConnection(conn: RealtimeConnection) {
  connections.set(conn.id, conn)
}

export function unregisterConnection(id: string) {
  connections.delete(id)
}

export function authenticateConnection(id: string, userId: string | null) {
  const c = connections.get(id)
  if (c) c.userId = userId
}

export function listConnections() {
  return Array.from(connections.values())
}

export function newEventId() {
  eventSeq += 1
  return `evt_${Date.now().toString(36)}_${eventSeq}`
}

export function buildNftUpdatedEvent(nft: Nft, overrides: Partial<NftUpdatedEvent> = {}): NftUpdatedEvent {
  return {
    eventId: newEventId(),
    resource: 'nft',
    id: nft.id,
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: { price: nft.price, previousPrice: nft.previousPrice, editions: nft.editions },
    ...overrides,
  }
}

export function publishNftUpdated(nft: Nft, overrides: Partial<NftUpdatedEvent> = {}) {
  const event = buildNftUpdatedEvent(nft, overrides)
  for (const c of connections.values()) c.emit(REALTIME_EVENTS.nftUpdated, event)
  return event
}

export function publishOrderUpdated(order: Order, userId: string, overrides: Partial<OrderUpdatedEvent> = {}) {
  const event: OrderUpdatedEvent = {
    eventId: newEventId(),
    resource: 'order',
    id: order.id,
    userId,
    version: order.version,
    occurredAt: new Date().toISOString(),
    data: order,
    ...overrides,
  }
  // Private resource: only the owner's sockets receive it.
  for (const c of connections.values()) if (c.userId === userId) c.emit(REALTIME_EVENTS.orderUpdated, event)
  return event
}

/** Mutates an NFT (price/availability), bumps version and publishes the event. */
export function updateNft(nftId: string, patch: { price?: string; editions?: Array<{ id: string; available: number }> }) {
  const db = getDb()
  const nft = db.nfts.find((n) => n.id === nftId)
  if (!nft) throw new Error(`NFT ${nftId} not found`)
  if (patch.price !== undefined && patch.price !== nft.price) {
    nft.previousPrice = nft.price
    nft.price = patch.price
  }
  if (patch.editions) {
    for (const e of patch.editions) {
      const ed = nft.editions.find((x) => x.id === e.id)
      if (ed) ed.available = Math.max(0, e.available)
    }
  }
  nft.version += 1
  db.catalogVersion += 1
  // keep cart snapshots in sync
  for (const cart of Object.values(db.carts)) {
    for (const item of cart.items) {
      if (item.nftId === nft.id) {
        item.nft = { ...item.nft, price: nft.price, previousPrice: nft.previousPrice, editions: nft.editions, version: nft.version }
      }
    }
  }
  persist()
  return publishNftUpdated(nft)
}

export function disconnectAll() {
  for (const c of connections.values()) c.close()
}
