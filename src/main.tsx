import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@fontsource/ibm-plex-mono/700.css'
import './styles/globals.css'
import { createQueryClient } from './app/query-client'
import { createAppRouter } from './app/router'
import { bootSession, installSessionExpiryHandler } from './lib/auth'
import { getRealtime } from './lib/realtime'

export const MOCKS_ENABLED = import.meta.env.VITE_ENABLE_MOCKS !== 'false'

async function bootstrap() {
  if (MOCKS_ENABLED) {
    const { startMocks } = await import('./mocks/browser')
    await startMocks()
  }

  const queryClient = createQueryClient()
  const router = createAppRouter(queryClient)

  installSessionExpiryHandler(queryClient, () => {
    const { pathname, search } = window.location
    const isPrivate = /^\/(checkout|account|orders)/.test(pathname)
    if (isPrivate) void router.navigate({ to: '/', search: { auth: 'login', redirect: pathname + search } })
  })

  const realtime = getRealtime(queryClient)
  void realtime.connect().then(() => bootSession(queryClient)).then(() => realtime.authenticate())

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
