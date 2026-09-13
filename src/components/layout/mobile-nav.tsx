import { Link } from '@tanstack/react-router'
import { Compass, Heart, Home, ShoppingCart, User } from 'lucide-react'
import { outOfScope } from '@/components/common/out-of-scope'
import { useAuthModal } from '@/features/auth/auth-search'
import { useCart } from '@/lib/queries'
import { useSession } from '@/lib/session'

const item = 'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-muted-foreground [&.active]:text-primary'

export function MobileNav() {
  const session = useSession()
  const cart = useCart()
  const authModal = useAuthModal()
  const count = cart.data?.items.reduce((a, i) => a + i.quantity, 0) ?? 0
  return (
    <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-surface/95 backdrop-blur md:hidden">
      <Link to="/" className={item} activeOptions={{ exact: true }}>
        <Home className="size-5" aria-hidden="true" /> Início
      </Link>
      <button type="button" className={item} onClick={() => outOfScope('Lista de interesse')}>
        <Heart className="size-5" aria-hidden="true" /> Favoritos
      </button>
      <Link to="/" hash="catalogo" className="flex flex-1 items-center justify-center" aria-label="Explorar catálogo">
        <span className="-mt-6 inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Compass className="size-6" aria-hidden="true" />
        </span>
      </Link>
      <Link to="/cart" className={item}>
        <span className="relative">
          <ShoppingCart className="size-5" aria-hidden="true" />
          {count > 0 ? <span className="absolute -right-2 -top-1 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{count}</span> : null}
        </span>
        Carrinho
      </Link>
      {session.user ? (
        <Link to="/account/profile" className={item}>
          <User className="size-5" aria-hidden="true" /> Perfil
        </Link>
      ) : (
        <button type="button" className={item} onClick={() => authModal.open('login')}>
          <User className="size-5" aria-hidden="true" /> Entrar
        </button>
      )}
    </nav>
  )
}
