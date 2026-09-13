import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

/** Direct access to /register opens the auth modal (register tab) over the home page. */
export const Route = createFileRoute('/register')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search: { auth: 'register', redirect: search.redirect }, replace: true })
  },
})
