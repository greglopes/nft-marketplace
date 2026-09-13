/**
 * Deterministic mock scenarios. Selected via `?mock-scenario=<name>` (persisted
 * in localStorage) or `window.__kurioMocks.setScenario(name)`.
 */
export interface ScenarioConfig {
  /** [min, max] latency in ms applied to every REST response */
  latency: [number, number]
  /** catalog returns no items */
  emptyCatalog?: boolean
  /** every request fails at the network level (TypeError: Failed to fetch) */
  offline?: boolean
  /** catalog list responds with this HTTP status */
  catalogStatus?: 500 | 503
  /** favorites mutations respond with this HTTP status */
  favoritesStatus?: 500 | 503
  /** session TTL override in ms */
  sessionTtlMs?: number
  /** behaviour of the first POST /orders attempt for a new idempotency key */
  orderFirstAttempt?: 'price-change' | 'sold-out' | 'timeout' | 'transient'
  /** final payment outcome */
  paymentOutcome?: 'confirmed' | 'declined'
  /** delay between order creation and the outcome event */
  paymentDelayMs?: number
}

export const SCENARIOS: Record<string, ScenarioConfig & { description: string }> = {
  default: { latency: [120, 350], description: 'Cenário padrão: sucesso, latência leve.' },
  'empty-catalog': { latency: [120, 350], emptyCatalog: true, description: 'Catálogo sem resultados.' },
  slow: { latency: [2500, 3200], description: 'Latência alta (skeletons visíveis).' },
  'variable-latency': { latency: [80, 2800], description: 'Latência aleatória: respostas fora de ordem.' },
  offline: { latency: [50, 100], offline: true, description: 'Falha de conexão em todas as chamadas.' },
  'catalog-error': { latency: [120, 350], catalogStatus: 500, description: 'Listagem responde HTTP 500.' },
  'favorites-fail': { latency: [120, 350], favoritesStatus: 500, description: 'Mutation de favoritos falha (rollback otimista).' },
  'session-short': { latency: [120, 350], sessionTtlMs: 20_000, description: 'Sessão expira em 20 segundos.' },
  'checkout-price-change': { latency: [120, 350], orderFirstAttempt: 'price-change', description: 'Preço muda durante a confirmação do pedido.' },
  'checkout-sold-out': { latency: [120, 350], orderFirstAttempt: 'sold-out', description: 'Edição esgota durante a confirmação.' },
  'order-timeout': { latency: [120, 350], orderFirstAttempt: 'timeout', description: 'Timeout após criar o pedido; recuperação por idempotência.' },
  'order-transient': { latency: [120, 350], orderFirstAttempt: 'transient', description: 'HTTP 503 transitório na criação do pedido.' },
  'payment-declined': { latency: [120, 350], paymentOutcome: 'declined', description: 'Pagamento recusado pela simulação.' },
  'payment-slow': { latency: [120, 350], paymentDelayMs: 20_000, description: 'Pagamento pendente por 20s (teste de desconexão/refresh).' },
}

export type ScenarioName = keyof typeof SCENARIOS

export const SCENARIO_STORAGE_KEY = 'kurio.mock.scenario'

export function getScenarioName(): ScenarioName {
  try {
    const stored = localStorage.getItem(SCENARIO_STORAGE_KEY)
    if (stored && stored in SCENARIOS) return stored as ScenarioName
  } catch {
    /* storage unavailable */
  }
  return 'default'
}

export function setScenarioName(name: string) {
  if (!(name in SCENARIOS)) throw new Error(`Unknown scenario "${name}"`)
  localStorage.setItem(SCENARIO_STORAGE_KEY, name)
}

export function getScenario(): ScenarioConfig {
  return SCENARIOS[getScenarioName()]
}
