import { useLocation, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

/** Root-level search params: the auth modal opens on top of whatever page is current. */
export const authSearchSchema = z.object({
  auth: z.enum(['login', 'register']).optional().catch(undefined),
  redirect: z.string().optional().catch(undefined),
})
export type AuthSearch = z.infer<typeof authSearchSchema>

/** Navigation helpers that keep the current page and only touch the auth params. */
export function useAuthModal() {
  const navigate = useNavigate()
  const location = useLocation()
  const go = (patch: AuthSearch, replace = false) =>
    navigate({
      to: location.pathname as never,
      hash: location.hash || undefined,
      search: ((prev: Record<string, unknown>) => ({ ...prev, ...patch })) as never,
      replace,
      resetScroll: false,
    })
  return {
    open: (mode: 'login' | 'register', redirect?: string) => go({ auth: mode, redirect }),
    switchTo: (mode: 'login' | 'register') => go({ auth: mode }, true),
    close: () => go({ auth: undefined, redirect: undefined }, true),
  }
}
