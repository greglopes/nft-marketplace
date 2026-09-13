import { http, type RequestConfig } from './client'
import {
  cartSchema,
  catalogResponseSchema,
  favoritesResponseSchema,
  nftSchema,
  nftSummarySchema,
  orderSchema,
  quoteSchema,
  sessionSchema,
  userSchema,
  walletSchema,
  walletsResponseSchema,
  type Cart,
  type CatalogQuery,
  type CreateOrderInput,
  type LoginInput,
  type PasswordInput,
  type ProfileInput,
  type RegisterInput,
  type WalletInput,
  type WalletSlot,
} from './contracts'
import { z } from 'zod'

const parse = <T>(schema: z.ZodType<T>, data: unknown): T => schema.parse(data)

/* Session ---------------------------------------------------------- */
export const authApi = {
  register: async (input: RegisterInput) => parse(sessionSchema, (await http.post('/auth/register', input)).data),
  login: async (input: LoginInput) => parse(sessionSchema, (await http.post('/auth/login', input)).data),
  session: async (config?: RequestConfig) => parse(sessionSchema, (await http.get('/auth/session', config)).data),
  logout: async () => {
    await http.post('/auth/logout')
  },
}

/* Catalog ---------------------------------------------------------- */
export function catalogParams(query: CatalogQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.q) params.q = query.q
  if (query.category?.length) params.category = query.category.join(',')
  if (query.network?.length) params.network = query.network.join(',')
  if (query.minPrice) params.minPrice = query.minPrice
  if (query.maxPrice) params.maxPrice = query.maxPrice
  if (query.sort) params.sort = query.sort
  if (query.tab) params.tab = query.tab
  if (query.page) params.page = String(query.page)
  if (query.pageSize) params.pageSize = String(query.pageSize)
  return params
}

export const catalogApi = {
  list: async (query: CatalogQuery, config?: RequestConfig) =>
    parse(catalogResponseSchema, (await http.get('/nfts', { ...config, params: catalogParams(query) })).data),
  detail: async (id: string, config?: RequestConfig) => parse(nftSchema, (await http.get(`/nfts/${id}`, config)).data),
  related: async (id: string, config?: RequestConfig) =>
    parse(z.object({ items: z.array(nftSummarySchema) }), (await http.get(`/nfts/${id}/related`, config)).data),
}

/* Favorites -------------------------------------------------------- */
export const favoritesApi = {
  list: async (config?: RequestConfig) => parse(favoritesResponseSchema, (await http.get('/favorites', config)).data),
  add: async (nftId: string) => parse(favoritesResponseSchema, (await http.put(`/favorites/${nftId}`)).data),
  remove: async (nftId: string) => parse(favoritesResponseSchema, (await http.delete(`/favorites/${nftId}`)).data),
}

/* Cart ------------------------------------------------------------- */
export const cartApi = {
  get: async (config?: RequestConfig): Promise<Cart> => parse(cartSchema, (await http.get('/cart', config)).data),
  addItem: async (input: { nftId: string; editionId: string; quantity: number }) => parse(cartSchema, (await http.post('/cart/items', input)).data),
  updateItem: async (itemId: string, quantity: number) => parse(cartSchema, (await http.patch(`/cart/items/${itemId}`, { quantity })).data),
  removeItem: async (itemId: string) => parse(cartSchema, (await http.delete(`/cart/items/${itemId}`)).data),
  applyCoupon: async (code: string) => parse(cartSchema, (await http.post('/cart/coupon', { code })).data),
  removeCoupon: async () => parse(cartSchema, (await http.delete('/cart/coupon')).data),
  quote: async (config?: RequestConfig) => parse(quoteSchema, (await http.get('/cart/quote', config)).data),
}

/* Orders ----------------------------------------------------------- */
export const ordersApi = {
  create: async (input: CreateOrderInput, idempotencyKey: string) =>
    parse(orderSchema, (await http.post('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey }, timeout: 8_000 })).data),
  get: async (id: string, config?: RequestConfig) => parse(orderSchema, (await http.get(`/orders/${id}`, config)).data),
  list: async (config?: RequestConfig) => parse(z.object({ items: z.array(orderSchema) }), (await http.get('/orders', config)).data),
}

/* Profile & wallets ------------------------------------------------ */
export const profileApi = {
  get: async (config?: RequestConfig) => parse(userSchema, (await http.get('/profile', config)).data),
  update: async (input: ProfileInput) => parse(userSchema, (await http.patch('/profile', input)).data),
  setAvatar: async (dataUrl: string | null) => parse(userSchema, (await http.put('/profile/avatar', { dataUrl })).data),
  changePassword: async (input: PasswordInput) => {
    await http.post('/profile/password', input)
  },
}

export const walletsApi = {
  list: async (config?: RequestConfig) => parse(walletsResponseSchema, (await http.get('/wallets', config)).data),
  save: async (slot: WalletSlot, input: WalletInput) => parse(walletSchema, (await http.put(`/wallets/${slot}`, input)).data),
  remove: async (slot: WalletSlot) => {
    await http.delete(`/wallets/${slot}`)
  },
}
