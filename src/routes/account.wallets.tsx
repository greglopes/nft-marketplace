import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SkeletonBlock } from '@/components/common/skeleton-block'
import { ErrorState } from '@/components/common/states'
import { WalletForm, toInput } from '@/features/account/wallet-form'
import type { WalletInput } from '@/lib/api/contracts'
import { useRemoveWallet, walletsQueryOptions } from '@/lib/queries'
import { useSession } from '@/lib/session'

export const Route = createFileRoute('/account/wallets')({
  head: () => ({ meta: [{ title: 'Carteiras — Kurio' }] }),
  component: WalletsPage,
})

function WalletsPage() {
  const session = useSession()
  const userId = session.user?.id ?? 'anonymous'
  const wallets = useQuery(walletsQueryOptions(userId))
  const remove = useRemoveWallet()
  const [secondaryOpen, setSecondaryOpen] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const [primaryOpen, setPrimaryOpen] = useState(false)

  if (wallets.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }
  if (wallets.isError) return <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} />

  const { primary, secondary } = wallets.data
  const secondaryInitial: WalletInput | undefined = sameAsPrimary && primary ? { ...toInput(primary), nickname: 'Reserva' } : undefined

  return (
    <div className="space-y-10">
      <section aria-labelledby="primary-title" className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 id="primary-title" className="text-sm font-semibold">
              Carteira principal
            </h1>
            <p className="text-xs text-warm">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
          </div>
          {!primary && !primaryOpen ? (
            <Button variant="link" size="sm" className="text-primary" onClick={() => setPrimaryOpen(true)}>
              Adicionar
            </Button>
          ) : null}
        </div>
        {primary || primaryOpen ? <WalletForm slot="primary" wallet={primary} onSaved={() => setPrimaryOpen(false)} /> : <p className="text-xs text-warm">Você ainda não cadastrou uma carteira principal.</p>}
      </section>

      <section aria-labelledby="secondary-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="secondary-title" className="text-sm font-semibold">
            Carteira secundária
          </h2>
          <div className="flex items-center gap-3 text-xs">
            {!secondary ? (
              <label className="flex items-center gap-1">
                <input type="radio" name="secondary-mode" className="accent-primary" checked={sameAsPrimary} disabled={!primary} onChange={() => setSameAsPrimary(true)} onClick={() => sameAsPrimary && setSameAsPrimary(false)} />
                Igual à carteira principal
              </label>
            ) : null}
            {!secondary && !secondaryOpen ? (
              <Button variant="link" size="sm" className="text-primary" onClick={() => setSecondaryOpen(true)} data-testid="add-secondary">
                Adicionar
              </Button>
            ) : null}
            {secondary ? (
              <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate('secondary')}>
                Remover
              </Button>
            ) : null}
          </div>
        </div>
        {secondary || secondaryOpen ? <WalletForm slot="secondary" wallet={secondary} initial={secondaryInitial} onSaved={() => setSecondaryOpen(false)} /> : <p className="text-xs text-warm">Você ainda não adicionou uma carteira secundária.</p>}
      </section>
    </div>
  )
}
