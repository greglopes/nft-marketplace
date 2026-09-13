import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/form-field'
import { SkeletonBlock } from '@/components/common/skeleton-block'
import { ErrorState, InlineError } from '@/components/common/states'
import { PasswordInput } from '@/features/auth/password-input'
import { applyApiErrors } from '@/features/auth/use-api-form-errors'
import { ApiError } from '@/lib/api/client'
import { passwordInputSchema, profileInputSchema, type PasswordInput as PasswordValues, type ProfileInput, type User } from '@/lib/api/contracts'
import { profileQueryOptions, useChangePassword, useSetAvatar, useUpdateProfile } from '@/lib/queries'
import { sessionStore, useSession } from '@/lib/session'

export const Route = createFileRoute('/account/profile')({
  head: () => ({ meta: [{ title: 'Dados do perfil — Kurio' }] }),
  component: ProfilePage,
})

function ProfilePage() {
  const session = useSession()
  const userId = session.user?.id ?? 'anonymous'
  const profile = useQuery(profileQueryOptions(userId))
  return (
    <div className="space-y-8">
      <h1 className="text-sm font-semibold">Perfil do colecionador</h1>
      {profile.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : (
        <>
          <ProfileForm user={profile.data} />
          <PasswordForm />
        </>
      )}
    </div>
  )
}

function ProfileForm({ user }: { user: User }) {
  const update = useUpdateProfile()
  const [globalError, setGlobalError] = useState<string | null>(null)
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: { displayName: user.displayName, username: user.username, email: user.email, ensName: user.ensName ?? '', walletNickname: user.walletNickname ?? '' },
  })
  useEffect(() => {
    form.reset({ displayName: user.displayName, username: user.username, email: user.email, ensName: user.ensName ?? '', walletNickname: user.walletNickname ?? '' })
  }, [user, form])

  const onSubmit = form.handleSubmit(async (values) => {
    setGlobalError(null)
    try {
      const updated = await update.mutateAsync(values)
      sessionStore.set({ user: updated })
      toast.success('Perfil atualizado.')
    } catch (error) {
      setGlobalError(applyApiErrors(error, form.setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2" aria-label="Dados do perfil">
      <FormField id="displayName" label="Nome de exibição" required error={form.formState.errors.displayName?.message}>
        {(a) => <Input {...a} autoComplete="name" {...form.register('displayName')} />}
      </FormField>
      <FormField id="username" label="Nome de usuário" required error={form.formState.errors.username?.message}>
        {(a) => <Input {...a} autoComplete="username" {...form.register('username')} />}
      </FormField>
      <FormField id="email" label="E-mail" required error={form.formState.errors.email?.message}>
        {(a) => <Input {...a} type="email" autoComplete="email" {...form.register('email')} />}
      </FormField>
      <FormField id="ensName" label="Nome ENS" required={false} error={form.formState.errors.ensName?.message}>
        {(a) => (
          <div className="flex">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-surface-2 px-2 text-xs text-warm">.eth</span>
            <Input {...a} className="rounded-l-none" {...form.register('ensName')} />
          </div>
        )}
      </FormField>
      <FormField id="walletNickname" label="Apelido da carteira" error={form.formState.errors.walletNickname?.message}>
        {(a) => <Input {...a} {...form.register('walletNickname')} />}
      </FormField>
      <AvatarField user={user} />
      {globalError ? (
        <div className="sm:col-span-2">
          <InlineError>{globalError}</InlineError>
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting} data-testid="save-profile">
          {form.formState.isSubmitting ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}

async function fileToDataUrl(file: File, size = 128): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const w = bitmap.width * scale
  const h = bitmap.height * scale
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)
  return canvas.toDataURL('image/png')
}

function AvatarField({ user }: { user: User }) {
  const setAvatar = useSetAvatar()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Envie um arquivo de imagem.')
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      const updated = await setAvatar.mutateAsync(dataUrl)
      sessionStore.set({ user: updated })
      toast.success('Avatar atualizado.')
    } catch (e) {
      setError(ApiError.from(e).fields?.dataUrl ?? ApiError.from(e).message)
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs" id="avatar-label">
        Avatar
      </span>
      <div className="flex items-center gap-3">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="Seu avatar" width={40} height={40} className="size-10 rounded-full object-cover" data-testid="avatar-image" /> : <span className="inline-flex size-10 items-center justify-center rounded-full bg-surface-2 text-primary"><UserIcon className="size-5" aria-hidden="true" /></span>}
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" aria-labelledby="avatar-label" data-testid="avatar-input" onChange={(e) => void onFile(e.target.files?.[0])} />
        <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={setAvatar.isPending}>
          Alterar
        </Button>
        {user.avatarUrl ? (
          <Button type="button" size="sm" variant="ghost" disabled={setAvatar.isPending} onClick={() => void setAvatar.mutateAsync(null).then((u) => sessionStore.set({ user: u }))}>
            Remover
          </Button>
        ) : null}
      </div>
      {error ? <InlineError>{error}</InlineError> : null}
    </div>
  )
}

function PasswordForm() {
  const change = useChangePassword()
  const [globalError, setGlobalError] = useState<string | null>(null)
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordInputSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } })
  const onSubmit = form.handleSubmit(async (values) => {
    setGlobalError(null)
    try {
      await change.mutateAsync(values)
      form.reset()
      toast.success('Senha alterada.')
    } catch (error) {
      setGlobalError(applyApiErrors(error, form.setError))
    }
  })
  return (
    <form onSubmit={onSubmit} noValidate className="max-w-sm space-y-4" aria-labelledby="password-title">
      <h2 id="password-title" className="text-sm font-semibold">
        Alterar senha
      </h2>
      <FormField id="currentPassword" label="Senha atual" required error={form.formState.errors.currentPassword?.message}>
        {(a) => <PasswordInput {...a} autoComplete="current-password" {...form.register('currentPassword')} />}
      </FormField>
      <FormField id="newPassword" label="Nova senha" required error={form.formState.errors.newPassword?.message}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register('newPassword')} />}
      </FormField>
      <FormField id="confirmPassword" label="Confirmar nova senha" required error={form.formState.errors.confirmPassword?.message}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register('confirmPassword')} />}
      </FormField>
      {globalError ? <InlineError>{globalError}</InlineError> : null}
      <Button type="submit" disabled={form.formState.isSubmitting} data-testid="save-password">
        {form.formState.isSubmitting ? 'Salvando…' : 'Salvar senha'}
      </Button>
    </form>
  )
}
