import { toast } from 'sonner'

/** Auxiliary links (editorial, support…) are out of scope: they never fake success. */
export function outOfScope(label: string) {
  toast.info(`"${label}" não faz parte desta entrega.`, { description: 'Fluxos editoriais e de suporte estão fora do escopo do desafio.' })
}

export function OutOfScopeLink({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => outOfScope(label)}>
      {label}
    </button>
  )
}
