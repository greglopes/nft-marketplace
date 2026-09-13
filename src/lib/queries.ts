import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from './api/client'
import type { CatalogQuery, CreateOrderInput, FavoritesResponse, Order, PasswordInput, ProfileInput, WalletInput, WalletSlot } from './api/contracts'
import { authApi, cartApi, catalogApi, favoritesApi, ordersApi, profileApi, walletsApi } from './api/endpoints'
import { queryKeys } from './query-keys'
import { getGuestId, useSession } from './session'

/* ------------------------------------------------------------------ */
/* Cache policy (documented in ARCHITECTURE.md)                        */
/* ------------------------------------------------------------------ */
export const STALE = {
  catalog: 30_000,
  nft: 60_000,
  cart: 10_000,
  quote: 0,
  order: 5_000,
  account: 60_000,
} as const

export function useOwnerId() {
  const session = useSession()
  return session.user ? `user:${session.user.id}` : `guest:${getGuestId()}`
}

export function useUserId() {
  return useSession().user?.id ?? null
}

/* Catalog ---------------------------------------------------------- */
export const catalogQueryOptions = (query: CatalogQuery) =>
  queryOptions({
    queryKey: queryKeys.catalog(query),
    queryFn: ({ signal }) => catalogApi.list(query, { signal }),
    staleTime: STALE.catalog,
    placeholderData: (prev) => prev,
  })

export const nftQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.nft(id),
    queryFn: ({ signal }) => catalogApi.detail(id, { signal }),
    staleTime: STALE.nft,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  })

export const relatedQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.related(id),
    queryFn: ({ signal }) => catalogApi.related(id, { signal }),
    staleTime: STALE.nft,
  })

/* Favorites (optimistic with rollback) ---------------------------- */
export const favoritesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.favorites(userId),
    queryFn: ({ signal }) => favoritesApi.list({ signal }),
    staleTime: STALE.account,
  })

export function useFavorites() {
  const userId = useUserId()
  return useQuery({ ...favoritesQueryOptions(userId ?? 'anonymous'), enabled: !!userId })
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationKey: ['favorites', 'toggle'],
    mutationFn: ({ nftId, next }: { nftId: string; next: boolean }) => (next ? favoritesApi.add(nftId) : favoritesApi.remove(nftId)),
    onMutate: async ({ nftId, next }) => {
      if (!userId) return
      const key = queryKeys.favorites(userId)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      qc.setQueryData<FavoritesResponse>(key, (old) => {
        const items = old?.items ?? []
        return { items: next ? Array.from(new Set([...items, nftId])) : items.filter((id) => id !== nftId) }
      })
      return { previous, key }
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous)
      toast.error(ApiError.from(error).message)
    },
    onSuccess: (data, _vars, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, data)
    },
    onSettled: () => {
      if (userId) void qc.invalidateQueries({ queryKey: queryKeys.favorites(userId) })
    },
  })
}

/* Cart ------------------------------------------------------------- */
export const cartQueryOptions = (ownerId: string) =>
  queryOptions({
    queryKey: queryKeys.cart(ownerId),
    queryFn: ({ signal }) => cartApi.get({ signal }),
    staleTime: STALE.cart,
  })

export const quoteQueryOptions = (ownerId: string) =>
  queryOptions({
    queryKey: queryKeys.quote(ownerId),
    queryFn: ({ signal }) => cartApi.quote({ signal }),
    staleTime: STALE.quote,
  })

export function useCart() {
  const ownerId = useOwnerId()
  const session = useSession()
  return useQuery({ ...cartQueryOptions(ownerId), enabled: session.status !== 'unknown' })
}

export function useQuote(enabled = true) {
  const ownerId = useOwnerId()
  const session = useSession()
  return useQuery({ ...quoteQueryOptions(ownerId), enabled: enabled && session.status !== 'unknown' })
}

export function invalidateCart(qc: QueryClient, ownerId: string) {
  return qc.invalidateQueries({ queryKey: queryKeys.cart(ownerId) })
}

function useCartMutation<TVars>(fn: (vars: TVars) => ReturnType<typeof cartApi.get>, opts: { successMessage?: string } = {}) {
  const qc = useQueryClient()
  const ownerId = useOwnerId()
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => {
      qc.setQueryData(queryKeys.cart(ownerId), cart)
      void qc.invalidateQueries({ queryKey: queryKeys.quote(ownerId) })
      if (opts.successMessage) toast.success(opts.successMessage)
    },
    onError: (error) => toast.error(ApiError.from(error).message),
  })
}

export const useAddToCart = () => useCartMutation(cartApi.addItem, { successMessage: 'Adicionado ao carrinho.' })
export const useUpdateCartItem = () => useCartMutation(({ itemId, quantity }: { itemId: string; quantity: number }) => cartApi.updateItem(itemId, quantity))
export const useRemoveCartItem = () => useCartMutation((itemId: string) => cartApi.removeItem(itemId), { successMessage: 'Item removido.' })
export const useApplyCoupon = () => useCartMutation((code: string) => cartApi.applyCoupon(code), { successMessage: 'Cupom aplicado.' })
export const useRemoveCoupon = () => useCartMutation(() => cartApi.removeCoupon(), { successMessage: 'Cupom removido.' })

/* Orders ----------------------------------------------------------- */
export const orderQueryOptions = (userId: string, id: string) =>
  queryOptions({
    queryKey: queryKeys.order(userId, id),
    queryFn: ({ signal }) => ordersApi.get(id, { signal }),
    staleTime: STALE.order,
    // Pending orders are reconciled by polling as a fallback to Socket.IO.
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 4_000 : false),
    retry: (count, error) => !(error instanceof ApiError && (error.status === 404 || error.status === 403)) && count < 2,
  })

export const ordersQueryOptions = (userId: string) =>
  queryOptions({ queryKey: queryKeys.orders(userId), queryFn: ({ signal }) => ordersApi.list({ signal }), staleTime: STALE.order })

export function useCreateOrder() {
  const qc = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateOrderInput; idempotencyKey: string }) => ordersApi.create(input, idempotencyKey),
    onSuccess: (order: Order) => {
      if (userId) qc.setQueryData(queryKeys.order(userId, order.id), order)
    },
  })
}

/* Account ---------------------------------------------------------- */
export const profileQueryOptions = (userId: string) =>
  queryOptions({ queryKey: queryKeys.profile(userId), queryFn: ({ signal }) => profileApi.get({ signal }), staleTime: STALE.account })

export const walletsQueryOptions = (userId: string) =>
  queryOptions({ queryKey: queryKeys.wallets(userId), queryFn: ({ signal }) => walletsApi.list({ signal }), staleTime: STALE.account })

export function useUpdateProfile() {
  const qc = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: (input: ProfileInput) => profileApi.update(input),
    onSuccess: (user) => {
      if (userId) qc.setQueryData(queryKeys.profile(userId), user)
      void qc.invalidateQueries({ queryKey: queryKeys.session })
    },
  })
}

export function useSetAvatar() {
  const qc = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: (dataUrl: string | null) => profileApi.setAvatar(dataUrl),
    onSuccess: (user) => {
      if (userId) qc.setQueryData(queryKeys.profile(userId), user)
    },
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (input: PasswordInput) => profileApi.changePassword(input) })
}

export function useSaveWallet() {
  const qc = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: ({ slot, input }: { slot: WalletSlot; input: WalletInput }) => walletsApi.save(slot, input),
    onSuccess: () => {
      if (userId) void qc.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
    },
  })
}

export function useRemoveWallet() {
  const qc = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: (slot: WalletSlot) => walletsApi.remove(slot),
    onSuccess: () => {
      if (userId) void qc.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
    },
  })
}

export { authApi }
