import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FIXTURE_CREDENTIALS } from '@/mocks/fixtures/users'
import { SCENARIOS, getScenarioName } from '@/mocks/scenarios'
import type { KurioMockControl } from '@/mocks/control'

export const Route = createFileRoute('/mocks')({
  head: () => ({ meta: [{ title: 'Cenários de simulação — Kurio' }] }),
  component: MocksPage,
})

const control = () => (window as unknown as { __kurioMocks?: KurioMockControl }).__kurioMocks

function MocksPage() {
  const [selected, setSelected] = useState(getScenarioName())
  const api = control()
  if (!api) {
    return <p className="p-8 text-center text-sm text-warm">A camada de mocks está desativada neste build.</p>
  }
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Cenários de simulação (MSW)</h1>
        <p className="mt-1 text-xs text-warm">
          Cenário atual: <strong data-testid="current-scenario">{api.getScenario()}</strong>. Também é possível usar <code>?mock-scenario=nome</code> e <code>?mock-reset=1</code> em qualquer URL.
        </p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Selecionar cenário</legend>
        {Object.entries(SCENARIOS).map(([name, s]) => (
          <label key={name} className="flex cursor-pointer items-start gap-2 rounded border border-border p-2 text-xs has-[:checked]:border-primary">
            <input type="radio" name="scenario" value={name} checked={selected === name} onChange={() => setSelected(name)} className="mt-0.5 accent-primary" />
            <span>
              <strong>{name}</strong> — <span className="text-warm">{s.description}</span>
            </span>
          </label>
        ))}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => {
              api.setScenario(selected)
              toast.success(`Cenário "${selected}" ativado.`)
              window.location.assign('/')
            }}
          >
            Aplicar e ir ao início
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void api.reset().then(() => {
                api.setScenario('default')
                toast.success('Dados restaurados para o cenário padrão.')
                window.location.assign('/')
              })
            }}
          >
            Resetar dados
          </Button>
        </div>
      </fieldset>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Gatilhos em tempo real</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => api.updateNft('nft-01', { price: '1.49' })}>
            Alterar preço do Emerald Ape #042
          </Button>
          <Button size="sm" variant="outline" onClick={() => api.updateNft('nft-02', { editions: [{ id: 'e50', available: 0 }] })}>
            Esgotar Sage Nomad 1/50
          </Button>
          <Button size="sm" variant="outline" onClick={() => api.disconnectRealtime()}>
            Derrubar conexão Socket.IO
          </Button>
          <Button size="sm" variant="outline" onClick={() => api.expireSession()}>
            Expirar sessão
          </Button>
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold">Credenciais fictícias</h2>
        <ul className="mt-2 space-y-1 text-xs">
          {FIXTURE_CREDENTIALS.map((c) => (
            <li key={c.email}>
              <code>{c.email}</code> / <code>{c.password}</code> — <span className="text-warm">{c.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-warm">Cupons: KURIO10 (10%), GENESIS20 (20%), EXPIRED20 (expirado).</p>
      </section>
    </div>
  )
}
