import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/form-field'
import { outOfScope } from '@/components/common/out-of-scope'
import { InlineError } from '@/components/common/states'
import { loginInputSchema, type LoginInput } from '@/lib/api/contracts'
import { login } from '@/lib/auth'
import { PasswordInput } from './password-input'
import { applyApiErrors } from './use-api-form-errors'

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const qc = useQueryClient()
  const [globalError, setGlobalError] = useState<string | null>(null)
  const form = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema), defaultValues: { email: '', password: '' } })

  const onSubmit = form.handleSubmit(async (values) => {
    setGlobalError(null)
    try {
      await login(qc, values)
      onSuccess()
    } catch (error) {
      setGlobalError(applyApiErrors(error, form.setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate data-testid="login-form" className="space-y-3" aria-describedby={globalError ? 'login-error' : undefined}>
      <FormField id="email" label="E-mail" required error={form.formState.errors.email?.message}>
        {(a) => <Input {...a} type="email" autoComplete="email" placeholder="contato@email.com" {...form.register('email')} />}
      </FormField>
      <FormField id="password" label="Senha" required error={form.formState.errors.password?.message}>
        {(a) => <PasswordInput {...a} placeholder="••••••••••" {...form.register('password')} />}
      </FormField>
      <div className="text-right">
        <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => outOfScope('Recuperação de senha')}>
          Esqueceu a senha?
        </button>
      </div>
      {globalError ? <InlineError id="login-error">{globalError}</InlineError> : null}
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting} data-testid="login-submit">
        {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
