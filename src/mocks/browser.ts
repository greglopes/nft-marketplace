import { setupWorker } from 'msw/browser'
import { installMockControl } from './control'
import { initDb } from './db'
import { handlers } from './handlers'
import { resumePendingOrders } from './handlers/orders'
import { SCENARIO_STORAGE_KEY, setScenarioName } from './scenarios'

export const worker = setupWorker(...handlers)

/** Reads `?mock-scenario=` and `?mock-reset=1` from the URL, then starts MSW. */
export async function startMocks() {
  const url = new URL(window.location.href)
  const scenario = url.searchParams.get('mock-scenario')
  const reset = url.searchParams.get('mock-reset')
  let touched = false
  if (scenario) {
    try {
      setScenarioName(scenario)
    } catch {
      localStorage.removeItem(SCENARIO_STORAGE_KEY)
    }
    url.searchParams.delete('mock-scenario')
    touched = true
  }
  if (reset) {
    url.searchParams.delete('mock-reset')
    touched = true
  }
  await initDb({ reset: reset === '1' })
  if (reset === '1' && !scenario) localStorage.removeItem(SCENARIO_STORAGE_KEY)
  if (touched) window.history.replaceState(null, '', url.toString())

  installMockControl()
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
    quiet: true,
  })
  resumePendingOrders()
}
