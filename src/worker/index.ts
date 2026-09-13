import type { ApiErrorBody } from '../lib/api/contracts'

/**
 * Cloudflare Worker that only runs for `/api/*` (see `run_worker_first` in wrangler.jsonc).
 *
 * The API is simulated by MSW inside the browser, so a request reaching the edge means the
 * service worker did not intercept it. Without this Worker, the SPA fallback would answer
 * with index.html (200, text/html) and the client would fail schema validation with a
 * cryptic error. Answer with a JSON error in the API contract instead.
 */
export default {
  fetch(): Response {
    const body: ApiErrorBody = {
      code: 'TRANSIENT_FAILURE',
      message: 'Não foi possível carregar os dados simulados. Recarregue a página.',
    }
    return Response.json(body, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  },
}
