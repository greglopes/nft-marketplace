import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/common/form-field'
import { InlineError } from '@/components/common/states'
import { applyApiErrors } from '@/features/auth/use-api-form-errors'
import { NETWORKS, WALLET_TYPES, walletInputSchema, type Wallet, type WalletInput, type WalletSlot } from '@/lib/api/contracts'
import { useSaveWallet } from '@/lib/queries'

const EMPTY: WalletInput = { displayName: '', nickname: '', network: 'ethereum', profileName: '', address: '', secondaryAddress: '', type: 'metamask', referralCode: '', email: '', ensName: '' }

export function toInput(w: Wallet | null | undefined): WalletInput {
  if (!w) return EMPTY
  const { id: _i, slot: _s, updatedAt: _u, ...rest } = w
  return { ...rest, secondaryAddress: rest.secondaryAddress ?? '' }
}

export function WalletForm({ slot, wallet, initial, onSaved }: { slot: WalletSlot; wallet: Wallet | null; initial?: WalletInput; onSaved?: () => void }) {
  const save = useSaveWallet()
  const [globalError, setGlobalError] = useState<string | null>(null)
  const form = useForm<WalletInput>({ resolver: zodResolver(walletInputSchema), defaultValues: initial ?? toInput(wallet) })
  useEffect(() => {
    form.reset(initial ?? toInput(wallet))
  }, [wallet, initial, form])
  const p = `${slot}-`

  const onSubmit = form.handleSubmit(async (values) => {
    setGlobalError(null)
    try {
      await save.mutateAsync({ slot, input: values })
      toast.success(slot === 'primary' ? 'Carteira principal salva.' : 'Carteira secundária salva.')
      onSaved?.()
    } catch (error) {
      setGlobalError(applyApiErrors(error, form.setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2" aria-label={slot === 'primary' ? 'Carteira principal' : 'Carteira secundária'} data-testid={`wallet-form-${slot}`}>
      <FormField id={`${p}displayName`} label="Nome de exibição" required error={form.formState.errors.displayName?.message}>
        {(a) => <Input {...a} {...form.register('displayName')} />}
      </FormField>
      <FormField id={`${p}nickname`} label="Apelido da carteira" required error={form.formState.errors.nickname?.message}>
        {(a) => <Input {...a} {...form.register('nickname')} />}
      </FormField>
      <FormField id={`${p}network`} label="Rede" required error={form.formState.errors.network?.message}>
        {(a) => (
          <Select value={form.watch('network')} onValueChange={(v) => form.setValue('network', v as WalletInput['network'], { shouldValidate: true })}>
            <SelectTrigger id={a.id} className="w-full">
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
      <FormField id={`${p}profileName`} label="Nome do perfil" required error={form.formState.errors.profileName?.message}>
        {(a) => <Input {...a} {...form.register('profileName')} />}
      </FormField>
      <FormField id={`${p}address`} label="Endereço da carteira" required error={form.formState.errors.address?.message}>
        {(a) => <Input {...a} placeholder="Endereço 0x da carteira" {...form.register('address')} />}
      </FormField>
      <FormField id={`${p}secondaryAddress`} label="ENS ou carteira secundária (opcional)" error={form.formState.errors.secondaryAddress?.message}>
        {(a) => <Input {...a} placeholder="ENS ou carteira secundária (opcional)" {...form.register('secondaryAddress')} />}
      </FormField>
      <FormField id={`${p}type`} label="Tipo de carteira" required error={form.formState.errors.type?.message}>
        {(a) => (
          <Select value={form.watch('type')} onValueChange={(v) => form.setValue('type', v as WalletInput['type'], { shouldValidate: true })}>
            <SelectTrigger id={a.id} className="w-full">
              <SelectValue placeholder="Selecione uma carteira" />
            </SelectTrigger>
            <SelectContent>
              {WALLET_TYPES.map((w) => (
                <SelectItem key={w.slug} value={w.slug}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
      <FormField id={`${p}referralCode`} label="Código de indicação" required error={form.formState.errors.referralCode?.message}>
        {(a) => <Input {...a} {...form.register('referralCode')} />}
      </FormField>
      <FormField id={`${p}email`} label="E-mail" required error={form.formState.errors.email?.message}>
        {(a) => <Input {...a} type="email" {...form.register('email')} />}
      </FormField>
      <FormField id={`${p}ensName`} label="Nome ENS" required error={form.formState.errors.ensName?.message}>
        {(a) => (
          <div className="flex">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-surface-2 px-2 text-xs text-warm">.eth</span>
            <Input {...a} className="rounded-l-none" {...form.register('ensName')} />
          </div>
        )}
      </FormField>
      {globalError ? (
        <div className="sm:col-span-2">
          <InlineError>{globalError}</InlineError>
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting} data-testid={`save-wallet-${slot}`}>
          {form.formState.isSubmitting ? 'Salvando…' : 'Salvar carteira'}
        </Button>
      </div>
    </form>
  )
}
