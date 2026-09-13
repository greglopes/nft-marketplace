import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Activity, Download, Heart, LifeBuoy, LogOut, Tag, User, Wallet } from 'lucide-react'
import { OutOfScopeLink } from '@/components/common/out-of-scope'
import { logout } from '@/lib/auth'
import { requireAuth } from '@/lib/protected-route'

export const Route = createFileRoute('/account')({
  beforeLoad: requireAuth,
  component: AccountLayout,
})

const itemClass = 'flex items-center gap-2 border-l-2 border-transparent px-3 py-2 text-xs text-warm transition-colors hover:text-foreground [&.active]:border-primary [&.active]:text-primary'

function AccountLayout() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
      <nav aria-label="Minha conta" className="rounded-lg bg-surface py-3">
        <p className="px-3 pb-2 text-sm font-semibold">Meu perfil</p>
        <Link to="/account/profile" className={itemClass}>
          <User className="size-3.5" aria-hidden="true" /> Dados do perfil
        </Link>
        <Link to="/account/wallets" className={itemClass}>
          <Wallet className="size-3.5" aria-hidden="true" /> Carteiras
        </Link>
        {[
          { label: 'Atividade', Icon: Activity },
          { label: 'Lista de interesse', Icon: Heart },
          { label: 'Ofertas', Icon: Tag },
          { label: 'Arquivos baixados', Icon: Download },
          { label: 'Suporte', Icon: LifeBuoy },
        ].map(({ label, Icon }) => (
          <span key={label} className={itemClass}>
            <Icon className="size-3.5" aria-hidden="true" /> <OutOfScopeLink label={label} />
          </span>
        ))}
        <button type="button" className={`${itemClass} w-full font-semibold text-foreground`} data-testid="account-logout" onClick={() => void logout(qc).then(() => navigate({ to: '/' }))}>
          <LogOut className="size-3.5" aria-hidden="true" /> Sair
        </button>
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
