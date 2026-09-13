import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/form-field'
import { InlineError } from '@/components/common/states'
import { registerInputSchema, type RegisterInput } from '@/lib/api/contracts'
import { register as registerAccount } from '@/lib/auth'
import { PasswordInput } from './password-input'
import { applyApiErrors } from './use-api-form-errors'

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const qc = useQueryClient()
  const [globalError, setGlobalError] = useState<string | null>(null)
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerInputSchema), defaultValues: { username: '', email: '', password: '', confirmPassword: '' } })

  const onSubmit = form.handleSubmit(async (values) => {
    setGlobalError(null)
    try {
      await registerAccount(qc, values)
      onSuccess()
    } catch (error) {
      setGlobalError(applyApiErrors(error, form.setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate data-testid="register-form" className="space-y-3" aria-describedby={globalError ? 'register-error' : undefined}>
      <FormField id="username" label="Nome de usuário" required error={form.formState.errors.username?.message}>
        {(a) => <Input {...a} autoComplete="username" placeholder="Nome de usuário" {...form.register('username')} />}
      </FormField>
      <FormField id="email" label="E-mail" required error={form.formState.errors.email?.message}>
        {(a) => <Input {...a} type="email" autoComplete="email" placeholder="Digite seu e-mail" {...form.register('email')} />}
      </FormField>
      <FormField id="password" label="Senha" required error={form.formState.errors.password?.message} hint="Mínimo de 8 caracteres">
        {(a) => <PasswordInput {...a} autoComplete="new-password" placeholder="Senha" {...form.register('password')} />}
      </FormField>
      <FormField id="confirmPassword" label="Confirmar senha" required error={form.formState.errors.confirmPassword?.message}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" placeholder="Confirmar senha" {...form.register('confirmPassword')} />}
      </FormField>
      {globalError ? <InlineError id="register-error">{globalError}</InlineError> : null}
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting} data-testid="register-submit">
        {form.formState.isSubmitting ? 'Criando…' : 'Criar conta'}
      </Button>
    </form>
  )
}
