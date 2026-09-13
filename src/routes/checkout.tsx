import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Breadcrumb } from '@/components/common/breadcrumb'
import { FormField } from '@/components/common/form-field'
import { SkeletonBlock } from '@/components/common/skeleton-block'
import { EmptyState, ErrorState } from '@/components/common/states'
import { QuoteTotals, RealtimeNotices } from '@/features/cart/cart-summary'
import { checkoutDraft, pendingOrder } from '@/features/checkout/checkout-storage'
import { ReviewDialog } from '@/features/checkout/review-dialog'
import { WalletConnect, shortAddress, walletTypeLabel, type WalletConnection } from '@/features/checkout/wallet-connect'
import { ApiError } from '@/lib/api/client'
import { NETWORKS, collectorProfileSchema, type CollectorProfile, type CreateOrderInput, type NetworkSlug, type Wallet } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money'
import { requireAuth } from '@/lib/protected-route'
import { cartQueryOptions, profileQueryOptions, quoteQueryOptions, useCreateOrder, walletsQueryOptions } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/checkout')({
  beforeLoad: requireAuth,
  loader: ({ context }) => {
    const qc = context.queryClient
    const userId = qc.getQueryData<{ user?: { id: string } }>(['session'])?.user?.id
    if (userId) {
      void qc.prefetchQuery(walletsQueryOptions(userId))
      void qc.prefetchQuery(profileQueryOptions(userId))
    }
  },
  head: () => ({ meta: [{ title: 'Pagamento — Kurio' }] }),
  component: CheckoutPage,
})

type Phase = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'recovering'; attempt: number } | { kind: 'error'; message: string; retryable: boolean }

function CheckoutPage() {
  const session = useSession()
  const user = session.user!
  const navigate = useNavigate()
  const cart = useQuery(cartQueryOptions(`user:${user.id}`))
  const quote = useQuery({ ...quoteQueryOptions(`user:${user.id}`), enabled: (cart.data?.items.length ?? 0) > 0, refetchInterval: 15_000 })
  const wallets = useQuery(walletsQueryOptions(user.id))
  const profile = useQuery(profileQueryOptions(user.id))
  const createOrder = useCreateOrder()

  const draft = useMemo(() => checkoutDraft.load(user.id), [user.id])
  const [walletId, setWalletId] = useState<string | null>(draft?.walletId ?? null)
  const [network, setNetwork] = useState<NetworkSlug | null>(draft?.network ?? null)
  const [connection, setConnection] = useState<WalletConnection>({ status: 'disconnected', walletId: null })
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewedQuoteId, setReviewedQuoteId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const keyRef = useRef<string | null>(null)
  const reviewButtonRef = useRef<HTMLButtonElement>(null)

  const form = useForm<CollectorProfile>({
    resolver: zodResolver(collectorProfileSchema),
    defaultValues: { displayName: '', username: '', email: '', ensName: '', profileName: '', referralCode: '', note: '', ...draft?.collector },
  })

  // Prefill from the profile once loaded (draft wins).
  useEffect(() => {
    if (!profile.data) return
    const v = form.getValues()
    if (!v.displayName) form.setValue('displayName', profile.data.displayName)
    if (!v.username) form.setValue('username', profile.data.username)
    if (!v.email) form.setValue('email', profile.data.email)
    if (!v.ensName && profile.data.ensName) form.setValue('ensName', profile.data.ensName)
  }, [profile.data, form])

  const walletList = useMemo(() => [wallets.data?.primary, wallets.data?.secondary].filter((w): w is Wallet => !!w), [wallets.data])
  const wallet = walletList.find((w) => w.id === walletId) ?? walletList[0] ?? null
  useEffect(() => {
    if (wallet && !walletId) setWalletId(wallet.id)
    if (wallet && !network) setNetwork(wallet.network)
  }, [wallet, walletId, network])
  useEffect(() => {
    if (wallet) {
      const v = form.getValues()
      if (!v.profileName) form.setValue('profileName', wallet.profileName)
      if (!v.referralCode) form.setValue('referralCode', wallet.referralCode)
    }
  }, [wallet, form])

  // Persist the draft so an expired session can resume the checkout.
  useEffect(() => {
    const sub = form.watch((values) => checkoutDraft.save({ userId: user.id, collector: values as Partial<CollectorProfile>, walletId: walletId ?? undefined, network: network ?? undefined }))
    return () => sub.unsubscribe()
  }, [form, user.id, walletId, network])

  // Resume a pending order (refresh/timeout) without creating a new one. Runs once per mount.
  const resumeAttempted = useRef(false)
  const mutateRef = useRef(createOrder.mutate)
  mutateRef.current = createOrder.mutate
  useEffect(() => {
    if (resumeAttempted.current) return
    resumeAttempted.current = true
    const pending = pendingOrder.load(user.id)
    if (!pending) return
    if (pending.orderId) {
      void navigate({ to: '/orders/$orderId', params: { orderId: pending.orderId }, replace: true })
      return
    }
    keyRef.current = pending.key
    setPhase({ kind: 'recovering', attempt: 1 })
    mutateRef.current(
      { input: pending.body, idempotencyKey: pending.key },
      {
        onSuccess: (order) => {
          pendingOrder.save({ ...pending, orderId: order.id })
          void navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true })
        },
        onError: () => {
          pendingOrder.clear()
          keyRef.current = null
          setPhase({ kind: 'idle' })
        },
      },
    )
  }, [user.id, navigate])

  const walletConnected = !!wallet && connection.status === 'connected' && connection.walletId === wallet.id

  const submit = useCallback(
    (body: CreateOrderInput, key: string, attempt = 1) => {
      setPhase(attempt === 1 ? { kind: 'submitting' } : { kind: 'recovering', attempt })
      pendingOrder.save({ userId: user.id, key, body, createdAt: Date.now() })
      createOrder.mutate(
        { input: body, idempotencyKey: key },
        {
          onSuccess: (order) => {
            pendingOrder.save({ userId: user.id, key, body, orderId: order.id, createdAt: Date.now() })
            checkoutDraft.clear()
            void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
          },
          onError: (error) => {
            const e = ApiError.from(error)
            if (e.code === 'QUOTE_OUTDATED' || e.code === 'IDEMPOTENCY_CONFLICT') {
              pendingOrder.clear()
              keyRef.current = null
              setReviewedQuoteId(null)
              void quote.refetch()
              void cart.refetch()
              setPhase({ kind: 'error', message: e.message, retryable: false })
              return
            }
            if ((e.isTimeout || e.isNetworkError || e.status >= 500) && attempt < 3) {
              // Same idempotency key: the server returns the same order if it was created.
              setTimeout(() => submit(body, key, attempt + 1), 1500)
              return
            }
            setPhase({ kind: 'error', message: e.message, retryable: true })
          },
        },
      )
    },
    [createOrder, navigate, quote, cart, user.id],
  )

  const onReview = form.handleSubmit(() => {
    if (!wallet || !network) return
    setPhase({ kind: 'idle' })
    setReviewedQuoteId(quote.data?.quoteId ?? null)
    setReviewOpen(true)
  })

  const onConfirm = () => {
    if (!quote.data || !wallet || !network) return
    const body: CreateOrderInput = { quoteId: quote.data.quoteId, walletId: wallet.id, walletType: wallet.type, network, collector: form.getValues() }
    // A new quote means a new attempt (different content ⇒ new key); a retry reuses the key.
    if (!keyRef.current || phase.kind !== 'error') keyRef.current = keyRef.current && phase.kind === 'error' ? keyRef.current : crypto.randomUUID()
    submit(body, keyRef.current)
  }

  const busy = phase.kind === 'submitting' || phase.kind === 'recovering'
  const hasItems = (cart.data?.items.length ?? 0) > 0

  if (cart.isSuccess && !hasItems && phase.kind === 'idle') {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10">
        <EmptyState title="Seu carrinho está vazio" description="Adicione NFTs antes de finalizar a compra." action={<Button asChild size="sm"><Link to="/" hash="catalogo">Explorar catálogo</Link></Button>} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-4 md:py-6">
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Pagamento' }]} />
      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={onReview} noValidate className="space-y-4" aria-labelledby="collector-title" aria-busy={busy}>
          <h1 id="collector-title" className="text-sm font-semibold">
            Perfil do colecionador
          </h1>
          {phase.kind === 'recovering' ? (
            <p role="status" className="rounded border border-primary/50 bg-primary/10 p-3 text-xs" data-testid="recovering">
              Recuperando o pedido enviado (tentativa {phase.attempt})… O mesmo pedido será reaproveitado, sem duplicar a compra.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="displayName" label="Nome de exibição" required error={form.formState.errors.displayName?.message}>
              {(a) => <Input {...a} autoComplete="name" {...form.register('displayName')} />}
            </FormField>
            <FormField id="username" label="Nome de usuário" required error={form.formState.errors.username?.message}>
              {(a) => <Input {...a} autoComplete="username" {...form.register('username')} />}
            </FormField>
            <FormField id="network" label="Rede" required>
              {(a) => (
                <Select value={network ?? ''} onValueChange={(v) => setNetwork(v as NetworkSlug)}>
                  <SelectTrigger id={a.id} aria-describedby={a['aria-describedby']} className="w-full" data-testid="network-select">
                    <SelectValue placeholder="Selecione uma rede" />
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORKS.map((n) => (
                      <SelectItem key={n.slug} value={n.slug}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id="profileName" label="Nome do perfil" required error={form.formState.errors.profileName?.message}>
              {(a) => <Input {...a} {...form.register('profileName')} />}
            </FormField>
            <FormField id="walletAddress" label="Endereço da carteira" required hint="Definido pela carteira selecionada">
              {(a) => <Input {...a} readOnly value={wallet?.address ?? ''} placeholder="Endereço 0x da carteira" />}
            </FormField>
            <FormField id="secondaryAddress" label="ENS ou carteira secundária (opcional)">
              {(a) => <Input {...a} readOnly value={wallet?.secondaryAddress ?? ''} placeholder="ENS ou carteira secundária (opcional)" />}
            </FormField>
            <FormField id="walletType" label="Tipo de carteira" required>
              {(a) => <Input {...a} readOnly value={wallet ? walletTypeLabel(wallet.type) : ''} placeholder="Selecione uma carteira" />}
            </FormField>
            <FormField id="referralCode" label="Código de indicação" required error={form.formState.errors.referralCode?.message}>
              {(a) => <Input {...a} {...form.register('referralCode')} />}
            </FormField>
            <FormField id="email" label="E-mail" required error={form.formState.errors.email?.message}>
              {(a) => <Input {...a} type="email" autoComplete="email" {...form.register('email')} />}
            </FormField>
            <FormField id="ensName" label="Nome ENS" required error={form.formState.errors.ensName?.message}>
              {(a) => (
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-surface-2 px-2 text-xs text-warm">.eth</span>
                  <Input {...a} className="rounded-l-none" {...form.register('ensName')} />
                </div>
              )}
            </FormField>
          </div>
          <p className="text-xs text-warm">
            Usar outra carteira?{' '}
            <Link to="/account/wallets" className="text-primary underline">
              Gerenciar carteiras
            </Link>
          </p>
          <FormField id="note" label="Observação do colecionador (opcional)" error={form.formState.errors.note?.message}>
            {(a) => <Textarea {...a} rows={4} {...form.register('note')} />}
          </FormField>
          <Button ref={reviewButtonRef} type="submit" className="w-full sm:w-auto" disabled={busy || !walletConnected || !quote.data?.valid} data-testid="review-order">
            Revisar pedido
          </Button>
          {!walletConnected ? (
            <p className="text-[11px] text-warm" role="status">
              Conecte uma carteira para revisar o pedido.
            </p>
          ) : null}
        </form>

        <aside className="space-y-4 rounded-lg bg-surface p-4" aria-label="Resumo do pedido">
          <h2 className="text-sm font-semibold">Seus NFTs</h2>
          <RealtimeNotices />
          {cart.isPending ? (
            <div className="space-y-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <SkeletonBlock key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cart.isError ? (
            <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />
          ) : (
            <ul className="divide-y divide-border text-xs" aria-label="Itens">
              {cart.data?.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 py-2">
                  <img src={item.nft.images[0].replace('-900.webp', '-400.webp')} alt="" width={40} height={40} className="size-10 rounded object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.nft.name}</p>
                    <p className="text-[11px] text-warm">ID do token: {item.nft.tokenId}</p>
                  </div>
                  <span className="text-warm">(x {item.quantity})</span>
                  <span className="font-semibold text-primary">{formatEth(item.nft.price)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-warm">
            Tem um código promocional?{' '}
            <Link to="/cart" className="text-primary underline">
              Aplique no carrinho
            </Link>
          </p>
          {quote.isError ? <ErrorState error={quote.error} onRetry={() => void quote.refetch()} title="Cotação indisponível" /> : <QuoteTotals quote={quote.data} isFetching={quote.isFetching} />}

          <h2 className="pt-2 text-sm font-semibold">Carteira e rede</h2>
          {wallets.isPending ? (
            <SkeletonBlock className="h-24 w-full" />
          ) : walletList.length === 0 ? (
            <EmptyState title="Nenhuma carteira cadastrada" description="Cadastre uma carteira principal para pagar." action={<Button asChild size="sm"><Link to="/account/wallets">Cadastrar carteira</Link></Button>} className="py-6" />
          ) : (
            <div role="radiogroup" aria-label="Carteira" className="space-y-2">
              {walletList.map((w) => (
                <label key={w.id} className={cn('flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-xs', w.id === wallet?.id ? 'border-primary' : 'border-border')}>
                  <input
                    type="radio"
                    name="wallet"
                    value={w.id}
                    checked={w.id === wallet?.id}
                    className="accent-primary"
                    onChange={() => {
                      setWalletId(w.id)
                      setNetwork(w.network)
                      setConnection({ status: 'disconnected', walletId: null })
                    }}
                  />
                  <span className="flex-1">
                    <span className="font-semibold">{walletTypeLabel(w.type)}</span> <span className="text-warm">· {w.nickname} · {shortAddress(w.address)}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <WalletConnect wallet={wallet} connection={connection} onChange={setConnection} />
          {phase.kind === 'error' ? (
            <div role="alert" className="rounded border border-destructive/50 bg-destructive/10 p-3 text-xs" data-testid="checkout-error">
              <p>{phase.message}</p>
              {phase.retryable ? (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setReviewOpen(true)}>
                  Tentar novamente
                </Button>
              ) : (
                <p className="mt-1 text-warm">Revise os novos valores e confirme novamente.</p>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      {wallet && network ? (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          collector={form.getValues()}
          wallet={wallet}
          network={network}
          quote={quote.data}
          reviewedQuoteId={reviewedQuoteId}
          onReviewed={setReviewedQuoteId}
          onConfirm={onConfirm}
          submitting={busy}
          error={phase.kind === 'error' ? phase.message : null}
          returnFocusTo={reviewButtonRef}
        />
      ) : null}
    </div>
  )
}
