import type { CatalogQuery } from './api/contracts'

/**
 * Query keys are namespaced by user for private resources so that switching
 * accounts never leaks cached data between users.
 */
export const queryKeys = {
  session: ['session'] as const,
  catalog: (query: CatalogQuery) => ['catalog', query] as const,
  catalogAll: ['catalog'] as const,
  nft: (id: string) => ['nft', id] as const,
  related: (id: string) => ['nft', id, 'related'] as const,
  favorites: (userId: string) => ['favorites', userId] as const,
  cart: (ownerId: string) => ['cart', ownerId] as const,
  quote: (ownerId: string) => ['cart', ownerId, 'quote'] as const,
  orders: (userId: string) => ['orders', userId] as const,
  order: (userId: string, id: string) => ['orders', userId, id] as const,
  profile: (userId: string) => ['profile', userId] as const,
  wallets: (userId: string) => ['wallets', userId] as const,
}

export const PRIVATE_KEY_PREFIXES = ['favorites', 'cart', 'orders', 'profile', 'wallets', 'session'] as const
