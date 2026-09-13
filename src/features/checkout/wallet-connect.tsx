import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { WALLET_TYPES, type Wallet } from '@/lib/api/contracts'

export type WalletConnection = { status: 'disconnected' | 'connecting' | 'connected' | 'refused'; walletId: string | null }

export function walletTypeLabel(type: Wallet['type']) {
  return WALLET_TYPES.find((w) => w.slug === type)?.label ?? type
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** Simulated wallet extension handshake: approve, refuse or disconnect. */
export function WalletConnect({ wallet, connection, onChange }: { wallet: Wallet | null; connection: WalletConnection; onChange: (c: WalletConnection) => void }) {
  const [open, setOpen] = useState(false)
  if (!wallet) return null
  const connected = connection.status === 'connected' && connection.walletId === wallet.id
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-surface-2 px-3 py-2 text-xs" data-testid="wallet-connect" data-status={connected ? 'connected' : connection.status}>
      <div>
        <p className="font-semibold">{walletTypeLabel(wallet.type)}</p>
        <p className="text-warm">
          {wallet.nickname} · {shortAddress(wallet.address)}
        </p>
        <p role="status" className={connected ? 'text-success' : connection.status === 'refused' ? 'text-destructive' : 'text-muted-foreground'}>
          {connected ? 'Carteira conectada' : connection.status === 'refused' ? 'Conexão recusada pela carteira' : 'Carteira não conectada'}
        </p>
      </div>
      {connected ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange({ status: 'disconnected', walletId: null })}>
          Desconectar
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)} data-testid="connect-wallet">
          Conectar carteira
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Autorizar conexão</DialogTitle>
            <DialogDescription>
              A Kurio quer se conectar à sua carteira {walletTypeLabel(wallet.type)} ({shortAddress(wallet.address)}). Esta é uma simulação: nenhuma extensão real é usada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              data-testid="wallet-refuse"
              onClick={() => {
                onChange({ status: 'refused', walletId: null })
                setOpen(false)
              }}
            >
              Recusar
            </Button>
            <Button
              type="button"
              data-testid="wallet-approve"
              onClick={() => {
                onChange({ status: 'connecting', walletId: wallet.id })
                setOpen(false)
                setTimeout(() => onChange({ status: 'connected', walletId: wallet.id }), 600)
              }}
            >
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
