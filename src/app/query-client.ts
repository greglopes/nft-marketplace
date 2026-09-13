import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          const e = ApiError.from(error)
          if (e.status >= 400 && e.status < 500) return false
          return failureCount < 2
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
      },
      mutations: { retry: 0 },
    },
  })
}
