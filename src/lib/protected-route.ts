import { redirect, type ParsedLocation } from '@tanstack/react-router'
import { sessionReady } from './auth'
import { sessionStore } from './session'

/** beforeLoad guard for private flows: waits for the boot validation. */
export async function requireAuth({ location }: { location: ParsedLocation }) {
  await sessionReady
  if (!sessionStore.get().user) {
    // Opens the auth modal over the home; the private page is resumed after login.
    throw redirect({ to: '/', search: { auth: 'login', redirect: location.href } })
  }
}
