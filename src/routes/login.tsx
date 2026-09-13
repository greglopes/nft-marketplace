import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

/** Direct access to /login opens the auth modal over the home page. */
export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search: { auth: 'login', redirect: search.redirect }, replace: true })
  },
})
