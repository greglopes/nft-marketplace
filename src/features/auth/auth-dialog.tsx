import { useNavigate, useSearch } from '@tanstack/react-router'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { outOfScope } from '@/components/common/out-of-scope'
import { hrefToNavigate } from '@/lib/navigation'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'
import { useAuthModal } from './auth-search'
import { LoginForm } from './login-form'
import { RegisterForm } from './register-form'

const tab = 'text-sm font-semibold transition-colors'

/**
 * Login / register modal. It opens on top of the current page and its state
 * lives in the URL (`?auth=login|register&redirect=…`), so it survives refresh
 * and can be linked directly. On small screens it fills the viewport (Figma mobile).
 */
export function AuthDialog() {
  const { auth, redirect } = useSearch({ strict: false }) as { auth?: 'login' | 'register'; redirect?: string }
  const modal = useAuthModal()
  const navigate = useNavigate()
  const session = useSession()
  const mode = auth ?? 'login'
  const contentRef = useRef<HTMLDivElement>(null)

  const onSuccess = () => {
    if (redirect) void navigate(hrefToNavigate(redirect))
    else modal.close()
  }

  return (
    <Dialog open={!!auth} onOpenChange={(open) => !open && modal.close()}>
      <DialogContent
        ref={contentRef}
        onOpenAutoFocus={(e) => {
          // Start on the first field instead of the tab switcher.
          e.preventDefault()
          contentRef.current?.querySelector<HTMLInputElement>('form input')?.focus()
        }}
        data-testid="auth-dialog"
        className="flex max-h-dvh flex-col gap-5 overflow-y-auto border-none bg-surface px-6 py-8 shadow-2xl max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:justify-center max-sm:rounded-none sm:max-w-md sm:rounded-lg sm:border-b-4 sm:border-primary"
      >
        <p className="text-center text-2xl font-bold tracking-[0.3em] sm:hidden">KURIO</p>
        <nav className="flex items-center justify-center gap-3" aria-label="Entrar ou criar conta">
          <button type="button" className={cn(tab, mode === 'login' ? 'text-primary' : 'text-foreground/70 hover:text-foreground')} aria-current={mode === 'login' ? 'page' : undefined} onClick={() => modal.switchTo('login')}>
            Entrar
          </button>
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <button type="button" className={cn(tab, mode === 'register' ? 'text-primary' : 'text-foreground/70 hover:text-foreground')} aria-current={mode === 'register' ? 'page' : undefined} onClick={() => modal.switchTo('register')}>
            Criar conta
          </button>
        </nav>
        <DialogTitle className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</DialogTitle>
        <DialogDescription className="text-center text-xs text-warm">
          {mode === 'login' ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.' : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
        </DialogDescription>
        {session.user && mode === 'login' ? (
          <p className="text-center text-xs text-warm" role="status">
            Você já está conectado como {session.user.displayName}.
          </p>
        ) : null}
        {mode === 'login' ? <LoginForm onSuccess={onSuccess} /> : <RegisterForm onSuccess={onSuccess} />}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> Ou continue com <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => outOfScope('Login com Google')}>
            <span aria-hidden="true" className="font-bold text-primary">
              G
            </span>{' '}
            Continuar com Google
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => outOfScope('Login com Facebook')}>
            <span aria-hidden="true" className="font-bold text-[#4a7cf6]">
              f
            </span>{' '}
            Continuar com Facebook
          </Button>
        </div>
        <p className="text-center text-xs text-warm sm:hidden">
          {mode === 'login' ? (
            <>
              Novo na Kurio?{' '}
              <button type="button" className="text-primary" onClick={() => modal.switchTo('register')}>
                Crie uma conta
              </button>
            </>
          ) : (
            <>
              Já tem uma conta?{' '}
              <button type="button" className="text-primary" onClick={() => modal.switchTo('login')}>
                Entre
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  )
}
