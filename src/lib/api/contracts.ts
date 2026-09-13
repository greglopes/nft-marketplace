import { z } from 'zod'

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */
export const ethString = z.string().regex(/^\d+(\.\d+)?$/, 'Valor ETH inválido')
export type EthString = z.infer<typeof ethString>

export const CATEGORIES = [
  { slug: 'arte-digital', label: 'Arte digital' },
  { slug: 'fotografia', label: 'Fotografia' },
  { slug: 'musica', label: 'Música' },
  { slug: 'arte-3d', label: 'Arte 3D' },
  { slug: 'colecionaveis', label: 'Colecionáveis' },
  { slug: 'generativa', label: 'Generativa' },
  { slug: 'jogos', label: 'Jogos' },
  { slug: 'assinaturas', label: 'Assinaturas' },
  { slug: 'utilidade', label: 'Utilidade' },
] as const
export type CategorySlug = (typeof CATEGORIES)[number]['slug']
export const categorySlug = z.enum(CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]])

export const NETWORKS = [
  { slug: 'ethereum', label: 'Ethereum' },
  { slug: 'polygon', label: 'Polygon' },
  { slug: 'solana', label: 'Solana' },
] as const
export type NetworkSlug = (typeof NETWORKS)[number]['slug']
export const networkSlug = z.enum(NETWORKS.map((n) => n.slug) as [NetworkSlug, ...NetworkSlug[]])

export const WALLET_TYPES = [
  { slug: 'metamask', label: 'MetaMask' },
  { slug: 'walletconnect', label: 'WalletConnect' },
  { slug: 'coinbase', label: 'Coinbase Wallet' },
] as const
export type WalletType = (typeof WALLET_TYPES)[number]['slug']
export const walletType = z.enum(WALLET_TYPES.map((w) => w.slug) as [WalletType, ...WalletType[]])

/* ------------------------------------------------------------------ */
/* NFT                                                                 */
/* ------------------------------------------------------------------ */
export const editionSchema = z.object({
  id: z.string(),
  label: z.enum(['1/1', '1/10', '1/50', 'ABERTA']),
  available: z.number().int().min(0),
  maxPerOrder: z.number().int().min(1),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSchema = z.object({
  id: z.string(),
  tokenId: z.string(),
  name: z.string(),
  collection: z.string(),
  creator: z.string(),
  category: categorySlug,
  network: networkSlug,
  price: ethString,
  previousPrice: ethString.nullable(),
  rarity: z.enum(['comum', 'raro', 'lendario']),
  description: z.string(),
  attributes: z.array(z.string()),
  rating: z.number(),
  reviewsCount: z.number().int(),
  images: z.array(z.string()).min(1),
  editions: z.array(editionSchema).min(1),
  contract: z.string(),
  royaltyPct: z.number(),
  listedAt: z.string(),
  trendingScore: z.number(),
  version: z.number().int(),
})
export type Nft = z.infer<typeof nftSchema>

export const nftSummarySchema = nftSchema.pick({
  id: true,
  tokenId: true,
  name: true,
  collection: true,
  category: true,
  network: true,
  price: true,
  previousPrice: true,
  rarity: true,
  images: true,
  editions: true,
  listedAt: true,
  trendingScore: true,
  version: true,
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Listados recentemente' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'trending', label: 'Em alta' },
  { value: 'name', label: 'Nome (A–Z)' },
] as const
export type SortValue = (typeof SORT_OPTIONS)[number]['value']
export const sortValue = z.enum(SORT_OPTIONS.map((s) => s.value) as [SortValue, ...SortValue[]])

export const catalogTab = z.enum(['all', 'new', 'trending'])
export type CatalogTab = z.infer<typeof catalogTab>

export const catalogQuerySchema = z.object({
  q: z.string().optional(),
  category: z.array(categorySlug).optional(),
  network: z.array(networkSlug).optional(),
  minPrice: ethString.optional(),
  maxPrice: ethString.optional(),
  sort: sortValue.optional(),
  tab: catalogTab.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
})
export type CatalogQuery = z.infer<typeof catalogQuerySchema>

export const facetSchema = z.object({ slug: z.string(), label: z.string(), count: z.number().int() })
export const catalogResponseSchema = z.object({
  items: z.array(nftSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  facets: z.object({
    categories: z.array(facetSchema),
    networks: z.array(facetSchema),
    priceRange: z.object({ min: ethString, max: ethString }),
  }),
  catalogVersion: z.number().int(),
})
export type CatalogResponse = z.infer<typeof catalogResponseSchema>

/* ------------------------------------------------------------------ */
/* Account & session                                                   */
/* ------------------------------------------------------------------ */
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  ensName: z.string().nullable(),
  walletNickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  user: userSchema,
})
export type Session = z.infer<typeof sessionSchema>

export const registerInputSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Mínimo de 3 caracteres')
      .max(24, 'Máximo de 24 caracteres')
      .regex(/^[a-z0-9_.]+$/i, 'Use letras, números, ponto ou underline'),
    email: z.string().email('Informe um e-mail válido'),
    password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type RegisterInput = z.infer<typeof registerInputSchema>

export const loginInputSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginInput = z.infer<typeof loginInputSchema>

export const profileInputSchema = z.object({
  displayName: z.string().min(2, 'Mínimo de 2 caracteres').max(40, 'Máximo de 40 caracteres'),
  username: z
    .string()
    .min(3, 'Mínimo de 3 caracteres')
    .max(24, 'Máximo de 24 caracteres')
    .regex(/^[a-z0-9_.]+$/i, 'Use letras, números, ponto ou underline'),
  email: z.string().email('Informe um e-mail válido'),
  ensName: z
    .string()
    .max(40, 'Máximo de 40 caracteres')
    .regex(/^[a-z0-9-]*$/i, 'Use apenas letras, números e hífen')
    .optional()
    .or(z.literal('')),
  walletNickname: z.string().max(40, 'Máximo de 40 caracteres').optional().or(z.literal('')),
})
export type ProfileInput = z.infer<typeof profileInputSchema>

export const passwordInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z.string().min(8, 'A nova senha precisa de pelo menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type PasswordInput = z.infer<typeof passwordInputSchema>

/* ------------------------------------------------------------------ */
/* Wallets                                                             */
/* ------------------------------------------------------------------ */
export const walletSlot = z.enum(['primary', 'secondary'])
export type WalletSlot = z.infer<typeof walletSlot>

export const walletInputSchema = z.object({
  displayName: z.string().min(2, 'Mínimo de 2 caracteres').max(40),
  nickname: z.string().min(2, 'Mínimo de 2 caracteres').max(40),
  network: networkSlug,
  profileName: z.string().min(2, 'Mínimo de 2 caracteres').max(40),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço 0x com 40 caracteres hexadecimais'),
  secondaryAddress: z.string().optional().or(z.literal('')),
  type: walletType,
  referralCode: z.string().min(4, 'Mínimo de 4 caracteres').max(16),
  email: z.string().email('Informe um e-mail válido'),
  ensName: z.string().min(2, 'Mínimo de 2 caracteres').regex(/^[a-z0-9-]+$/i, 'Use apenas letras, números e hífen'),
})
export type WalletInput = z.infer<typeof walletInputSchema>

export const walletSchema = walletInputSchema.extend({
  id: z.string(),
  slot: walletSlot,
  updatedAt: z.string(),
})
export type Wallet = z.infer<typeof walletSchema>

export const walletsResponseSchema = z.object({
  primary: walletSchema.nullable(),
  secondary: walletSchema.nullable(),
})
export type WalletsResponse = z.infer<typeof walletsResponseSchema>

/* ------------------------------------------------------------------ */
/* Favorites                                                           */
/* ------------------------------------------------------------------ */
export const favoritesResponseSchema = z.object({ items: z.array(z.string()) })
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>

/* ------------------------------------------------------------------ */
/* Cart & quote                                                        */
/* ------------------------------------------------------------------ */
export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1),
  nft: nftSummarySchema,
  addedAt: z.string(),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  id: z.string(),
  ownerType: z.enum(['guest', 'user']),
  items: z.array(cartItemSchema),
  coupon: z.string().nullable(),
  updatedAt: z.string(),
})
export type Cart = z.infer<typeof cartSchema>

export const quoteLineStatus = z.enum(['ok', 'price_changed', 'unavailable', 'limited'])
export const quoteLineSchema = z.object({
  cartItemId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  editionLabel: z.string(),
  quantity: z.number().int(),
  unitPrice: ethString,
  lineTotal: ethString,
  available: z.number().int(),
  status: quoteLineStatus,
  previousUnitPrice: ethString.nullable(),
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteSchema = z.object({
  quoteId: z.string(),
  lines: z.array(quoteLineSchema),
  subtotal: ethString,
  discount: ethString,
  networkFee: ethString,
  total: ethString,
  coupon: z
    .object({ code: z.string(), discountPct: z.number(), status: z.enum(['applied']) })
    .nullable(),
  catalogVersion: z.number().int(),
  issuedAt: z.string(),
  valid: z.boolean(),
})
export type Quote = z.infer<typeof quoteSchema>

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */
export const orderStatus = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof orderStatus>

export const collectorProfileSchema = z.object({
  displayName: z.string().min(2, 'Mínimo de 2 caracteres'),
  username: z.string().min(3, 'Mínimo de 3 caracteres'),
  email: z.string().email('Informe um e-mail válido'),
  ensName: z.string().min(2, 'Informe o nome ENS').regex(/^[a-z0-9-]+$/i, 'Use apenas letras, números e hífen'),
  profileName: z.string().min(2, 'Mínimo de 2 caracteres'),
  referralCode: z.string().min(4, 'Mínimo de 4 caracteres'),
  note: z.string().max(280, 'Máximo de 280 caracteres').optional().or(z.literal('')),
})
export type CollectorProfile = z.infer<typeof collectorProfileSchema>

export const createOrderInputSchema = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  walletType: walletType,
  network: networkSlug,
  collector: collectorProfileSchema,
})
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatus,
  txRef: z.string(),
  explorerUrl: z.string(),
  lines: z.array(quoteLineSchema),
  subtotal: ethString,
  discount: ethString,
  networkFee: ethString,
  total: ethString,
  couponCode: z.string().nullable(),
  wallet: z.object({ id: z.string(), type: walletType, address: z.string(), nickname: z.string() }),
  network: networkSlug,
  collector: collectorProfileSchema,
  declineReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
})
export type Order = z.infer<typeof orderSchema>

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */
export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'INVALID_CREDENTIALS',
  'SESSION_EXPIRED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'QUANTITY_LIMIT',
  'EDITION_UNAVAILABLE',
  'QUOTE_OUTDATED',
  'IDEMPOTENCY_CONFLICT',
  'PASSWORD_MISMATCH',
  'TRANSIENT_FAILURE',
  'INTERNAL_ERROR',
] as const
export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export const apiErrorSchema = z.object({
  code: z.enum(API_ERROR_CODES),
  message: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
  details: z.unknown().optional(),
})
export type ApiErrorBody = z.infer<typeof apiErrorSchema>

/* ------------------------------------------------------------------ */
/* Realtime                                                            */
/* ------------------------------------------------------------------ */
export const nftUpdatedEventSchema = z.object({
  eventId: z.string(),
  resource: z.literal('nft'),
  id: z.string(),
  version: z.number().int(),
  occurredAt: z.string(),
  data: z.object({
    price: ethString,
    previousPrice: ethString.nullable(),
    editions: z.array(editionSchema),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = z.object({
  eventId: z.string(),
  resource: z.literal('order'),
  id: z.string(),
  userId: z.string(),
  version: z.number().int(),
  occurredAt: z.string(),
  data: orderSchema,
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const REALTIME_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
  sessionAuth: 'session.auth',
  sessionAuthAck: 'session.auth.ack',
} as const
