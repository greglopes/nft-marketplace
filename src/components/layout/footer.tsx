import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OutOfScopeLink, outOfScope } from '@/components/common/out-of-scope'
import { CATEGORIES } from '@/lib/api/contracts'

const columns = [
  { title: 'Meu perfil', links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'] },
  { title: 'Central de ajuda', links: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'] },
]

const features = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamento', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

export function Footer() {
  const [email, setEmail] = useState('')
  return (
    <footer className="mx-auto mt-16 w-full max-w-[1200px] px-4 pb-24 md:pb-10">
      <div className="bg-surface">
        <div className="grid gap-6 p-6 md:grid-cols-4 md:divide-x md:divide-border">
          {features.map((f) => (
            <div key={f.letter} className="md:pr-6">
              <span className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground" aria-hidden="true">
                {f.letter}
              </span>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-warm">{f.text}</p>
            </div>
          ))}
          <form
            className="md:pl-6"
            onSubmit={(e) => {
              e.preventDefault()
              outOfScope('Newsletter')
            }}
          >
            <h3 className="text-sm font-semibold">Antecipe-se ao próximo lançamento</h3>
            <div className="mt-3 flex">
              <label htmlFor="newsletter" className="sr-only">
                E-mail para a newsletter
              </label>
              <Input id="newsletter" type="email" placeholder="digite seu e-mail…" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 min-w-0 flex-1 rounded-r-none border-transparent bg-surface-2 px-3 text-xs placeholder:text-muted-foreground focus-visible:border-primary dark:bg-surface-2" />
              <Button type="submit" size="sm" className="h-9 rounded-l-none px-4">
                Enviar
              </Button>
            </div>
            <p className="mt-2 text-xs text-warm">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
          </form>
        </div>
        <div className="grid gap-2 bg-surface-2 px-6 py-4 text-xs md:grid-cols-4">
          <span className="font-bold tracking-[0.2em]">KURIO</span>
          <span className="text-warm">Feito para colecionadores, criadores e cultura</span>
          <span className="text-warm">contato@email.com</span>
          <span className="text-warm">+55 11 4002 8922</span>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2 md:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="mt-2 space-y-1">
                {col.links.map((l) => (
                  <li key={l}>
                    {l === 'Meu perfil' ? (
                      <Link to="/account/profile" className="text-xs text-warm hover:text-foreground">
                        {l}
                      </Link>
                    ) : (
                      <OutOfScopeLink label={l} className="text-xs text-warm hover:text-foreground" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-sm font-semibold">Coleções</h3>
            <ul className="mt-2 space-y-1">
              {CATEGORIES.slice(0, 5).map((c) => (
                <li key={c.slug}>
                  <Link to="/" search={{ category: c.slug }} hash="catalogo" className="text-xs text-warm hover:text-foreground">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Redes sociais</h3>
            <ul className="mt-2 flex gap-2" aria-label="Redes sociais">
              {['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube'].map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => outOfScope(s)} aria-label={s} className="inline-flex size-6 items-center justify-center rounded border border-primary text-[10px] font-bold text-primary hover:bg-primary/10">
                    {s[0]}
                  </button>
                </li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-semibold">Carteiras compatíveis</h3>
            <p className="mt-2 inline-block rounded bg-primary/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">metamask · walletconnect · coinbase</p>
          </div>
        </div>
        <p className="border-t border-border px-6 py-3 text-center text-[11px] text-warm">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}
