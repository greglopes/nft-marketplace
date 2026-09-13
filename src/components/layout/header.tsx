import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { LogIn, LogOut, Search, ShoppingCart, User as UserIcon, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { OutOfScopeLink } from '@/components/common/out-of-scope'
import { useAuthModal } from '@/features/auth/auth-search'
import { logout } from '@/lib/auth'
import { useCart } from '@/lib/queries'
import { useRealtimeStatus } from '@/lib/realtime'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

const navLink = 'relative px-1 py-2 text-xs text-foreground/80 transition-colors hover:text-foreground'

export function Header() {
  const session = useSession()
  const cart = useCart()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const realtime = useRealtimeStatus()
  const authModal = useAuthModal()
  const [searchOpen, setSearchOpen] = useState(false)
  const [term, setTerm] = useState('')
  const count = cart.data?.items.reduce((acc, i) => acc + i.quantity, 0) ?? 0

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1 focus:text-primary-foreground">
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-4 md:h-16">
        <Link to="/" className="text-sm font-bold tracking-[0.2em]" aria-label="Kurio — início">
          KURIO
        </Link>

        <nav aria-label="Principal" className="mx-auto hidden items-center gap-6 md:flex">
          {/* "Mercado" is the catalogue anchor of the home (/#catalogo); "Início" is the home without it. */}
          <Link to="/" search={{}} className={navLink} activeOptions={{ exact: true, includeHash: true, includeSearch: false }} activeProps={{ className: cn(navLink, 'text-primary link-underline') }}>
            Início
          </Link>
          <Link to="/" hash="catalogo" className={navLink} activeOptions={{ exact: true, includeHash: true, includeSearch: false }} activeProps={{ className: cn(navLink, 'text-primary link-underline') }}>
            Mercado
          </Link>
          <OutOfScopeLink label="Criadores" className={navLink} />
          <OutOfScopeLink label="Aprenda" className={navLink} />
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <span className="sr-only" aria-live="polite">
            {realtime.status === 'reconnecting' ? 'Conexão em tempo real perdida, reconectando.' : ''}
          </span>
          {realtime.status === 'reconnecting' ? (
            <span className="rounded bg-destructive/20 px-2 py-0.5 text-[10px] text-destructive" data-testid="realtime-status">
              reconectando…
            </span>
          ) : null}

          {searchOpen ? (
            <form
              role="search"
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault()
                void navigate({ to: '/', search: (prev) => ({ ...prev, q: term || undefined, page: undefined }), hash: 'catalogo' })
                setSearchOpen(false)
              }}
            >
              <label htmlFor="header-search" className="sr-only">
                Buscar NFTs
              </label>
              <Input id="header-search" autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar NFTs…" className="h-8 w-40 md:w-56" onBlur={() => !term && setSearchOpen(false)} />
            </form>
          ) : (
            <Button variant="ghost" size="icon-sm" aria-label="Abrir busca" onClick={() => setSearchOpen(true)}>
              <Search aria-hidden="true" />
            </Button>
          )}

          <Button asChild variant="ghost" size="icon-sm">
            <Link to="/cart" aria-label="Ir para o carrinho">
              <span className="relative">
                <ShoppingCart aria-hidden="true" />
                {count > 0 ? (
                  <span data-testid="cart-count" className="absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {count}
                  </span>
                ) : null}
              </span>
            </Link>
          </Button>

          {session.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="user-menu">
                  {session.user.avatarUrl ? <img src={session.user.avatarUrl} alt="" className="size-5 rounded-full object-cover" /> : <UserIcon aria-hidden="true" />}
                  <span className="max-w-24 truncate">{session.user.displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/account/profile">
                    <UserIcon aria-hidden="true" /> Dados do perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/wallets">
                    <Wallet aria-hidden="true" /> Carteiras
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="logout"
                  onSelect={() => {
                    void logout(qc).then(() => navigate({ to: '/' }))
                  }}
                >
                  <LogOut aria-hidden="true" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" className="gap-1" onClick={() => authModal.open('login')} data-testid="open-login">
              <LogIn aria-hidden="true" /> Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
