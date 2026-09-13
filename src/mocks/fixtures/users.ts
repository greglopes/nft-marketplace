import type { User, Wallet } from '@/lib/api/contracts'

export interface DbUser extends User {
  passwordHash: string
  salt: string
}

/** Fictional credentials (documented in README). */
export const FIXTURE_CREDENTIALS = [
  { email: 'ana@kurio.app', password: 'Kurio@123', label: 'Ana Nova — carteiras cadastradas, favoritos' },
  { email: 'bruno@kurio.app', password: 'Kurio@123', label: 'Bruno Mint — sem carteiras, carrinho com itens' },
] as const

export const FIXTURE_USERS: Array<Omit<DbUser, 'passwordHash' | 'salt'> & { password: string }> = [
  {
    id: 'u_ana',
    username: 'ana.nova',
    displayName: 'Ana Nova',
    email: 'ana@kurio.app',
    ensName: 'nova',
    walletNickname: 'Reserva',
    avatarUrl: null,
    createdAt: '2026-01-10T10:00:00.000Z',
    password: 'Kurio@123',
  },
  {
    id: 'u_bruno',
    username: 'bruno.mint',
    displayName: 'Bruno Mint',
    email: 'bruno@kurio.app',
    ensName: null,
    walletNickname: null,
    avatarUrl: null,
    createdAt: '2026-02-02T10:00:00.000Z',
    password: 'Kurio@123',
  },
]

export const FIXTURE_WALLETS: Record<string, { primary: Wallet | null; secondary: Wallet | null }> = {
  u_ana: {
    primary: {
      id: 'w_ana_primary',
      slot: 'primary',
      displayName: 'Ana Nova',
      nickname: 'Principal',
      network: 'ethereum',
      profileName: 'nova.kurio',
      address: '0xA91F3c8b2d4e5f60718293a4b5c6d7e8f9a0E82C',
      secondaryAddress: '',
      type: 'metamask',
      referralCode: 'KURIO-ANA',
      email: 'ana@kurio.app',
      ensName: 'nova',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
    secondary: {
      id: 'w_ana_secondary',
      slot: 'secondary',
      displayName: 'Ana Nova',
      nickname: 'Reserva',
      network: 'polygon',
      profileName: 'nova.reserva',
      address: '0xB22C9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6F7A8',
      secondaryAddress: '',
      type: 'coinbase',
      referralCode: 'KURIO-ANA',
      email: 'ana@kurio.app',
      ensName: 'nova-reserva',
      updatedAt: '2026-03-05T10:00:00.000Z',
    },
  },
  u_bruno: { primary: null, secondary: null },
}

export const FIXTURE_FAVORITES: Record<string, string[]> = {
  u_ana: ['nft-01', 'nft-03'],
  u_bruno: ['nft-07'],
}

export const FIXTURE_CART_ITEMS: Record<string, Array<{ nftId: string; editionId: string; quantity: number }>> = {
  u_ana: [],
  u_bruno: [{ nftId: 'nft-02', editionId: 'e50', quantity: 1 }],
}

export interface Coupon {
  code: string
  discountPct: number
  expiresAt: string | null
}

export const FIXTURE_COUPONS: Coupon[] = [
  { code: 'KURIO10', discountPct: 10, expiresAt: null },
  { code: 'GENESIS20', discountPct: 20, expiresAt: '2027-12-31T23:59:59.000Z' },
  { code: 'EXPIRED20', discountPct: 20, expiresAt: '2025-12-31T23:59:59.000Z' },
]

export const NETWORK_FEE_ETH = '0.016'
