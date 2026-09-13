import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const apiError = ApiError.from(error)
  return (
    <section role="alert" className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-widest text-destructive">Algo deu errado</p>
      <h1 className="text-2xl font-semibold">Não foi possível carregar esta página</h1>
      <p className="text-sm text-muted-foreground">{apiError.message}</p>
      <Button
        onClick={() => {
          reset()
          void router.invalidate()
        }}
      >
        Tentar novamente
      </Button>
    </section>
  )
}
