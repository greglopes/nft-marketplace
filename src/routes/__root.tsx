import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { AuthDialog } from '@/features/auth/auth-dialog'
import { authSearchSchema } from '@/features/auth/auth-search'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Toaster } from '@/components/ui/sonner'
import type { RouterContext } from '@/app/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: authSearchSchema,
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="conteudo" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      <AuthDialog />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  )
}
