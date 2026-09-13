import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFound({ title = 'Página não encontrada', description = 'O endereço que você acessou não existe ou foi movido.' }: { title?: string; description?: string }) {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center" aria-labelledby="nf-title">
      <p className="text-xs uppercase tracking-widest text-primary">Erro 404</p>
      <h1 id="nf-title" className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
