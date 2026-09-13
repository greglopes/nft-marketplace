/**
 * Runtime control surface for demos and Playwright tests. Everything here goes
 * through the mock "server" state — never through the UI or the query cache —
 * so realtime events still travel over socket.io-client.
 */
import { getDb, persist, resetDb } from './db'
import { disconnectAll, listConnections, publishNftUpdated, updateNft } from './realtime'
import { SCENARIOS, getScenarioName, setScenarioName } from './scenarios'

export interface KurioMockControl {
  scenarios: Record<string, string>
  getScenario(): string
  setScenario(name: string): void
  reset(): Promise<void>
  expireSession(): void
  updateNft: typeof updateNft
  /** re-publishes the latest known event for an NFT (duplicate delivery) */
  republishNft(nftId: string): void
  /** publishes an event with an older version than the current state */
  publishStaleNft(nftId: string): void
  disconnectRealtime(): void
  snapshot(): unknown
  connections(): Array<{ id: string; userId: string | null }>
}

export function installMockControl(): KurioMockControl {
  const api: KurioMockControl = {
    scenarios: Object.fromEntries(Object.entries(SCENARIOS).map(([k, v]) => [k, v.description])),
    getScenario: getScenarioName,
    setScenario: setScenarioName,
    reset: async () => {
      await resetDb()
    },
    expireSession: () => {
      const db = getDb()
      for (const s of db.sessions) s.expiresAt = new Date(Date.now() - 1000).toISOString()
      persist()
    },
    updateNft,
    republishNft: (nftId) => {
      const nft = getDb().nfts.find((n) => n.id === nftId)
      if (nft) publishNftUpdated(nft)
    },
    publishStaleNft: (nftId) => {
      const nft = getDb().nfts.find((n) => n.id === nftId)
      if (!nft) return
      publishNftUpdated(nft, {
        version: Math.max(0, nft.version - 1),
        data: { price: '0.01', previousPrice: nft.price, editions: nft.editions.map((e) => ({ ...e, available: 0 })) },
      })
    },
    disconnectRealtime: disconnectAll,
    snapshot: () => structuredClone(getDb()),
    connections: () => listConnections().map((c) => ({ id: c.id, userId: c.userId })),
  }
  ;(window as unknown as { __kurioMocks: KurioMockControl }).__kurioMocks = api
  return api
}
