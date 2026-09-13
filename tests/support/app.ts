import { expect, type Page } from '@playwright/test'

export const USERS = {
  ana: { email: 'ana@kurio.app', password: 'Kurio@123', name: 'Ana Nova' },
  bruno: { email: 'bruno@kurio.app', password: 'Kurio@123', name: 'Bruno Mint' },
} as const

type MockControl = {
  setScenario(name: string): void
  getScenario(): string
  reset(): Promise<void>
  expireSession(): void
  updateNft(id: string, patch: { price?: string; editions?: Array<{ id: string; available: number }> }): unknown
  republishNft(id: string): void
  publishStaleNft(id: string): void
  disconnectRealtime(): void
  connections(): Array<{ id: string; userId: string | null }>
}

declare global {
  interface Window {
    __kurioMocks: MockControl
    __kurioRealtime: { getStatus(): { status: string }; isConnected(): boolean }
  }
}

/** Every test starts from a fresh, known mock state (`?mock-reset=1`). */
export async function openApp(page: Page, path = '/', scenario = 'default') {
  const url = new URL(path, 'http://localhost:4173')
  url.searchParams.set('mock-reset', '1')
  url.searchParams.set('mock-scenario', scenario)
  await page.goto(url.pathname + url.search + url.hash)
  await page.waitForFunction(() => !!window.__kurioMocks)
}

export async function waitForRealtime(page: Page) {
  await page.waitForFunction(() => window.__kurioRealtime?.isConnected(), null, { timeout: 15_000 })
}

export async function login(page: Page, user: keyof typeof USERS = 'ana', redirect?: string) {
  const target = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'
  await page.goto(target)
  const form = page.getByTestId('login-form')
  await form.getByLabel('E-mail').fill(USERS[user].email)
  await form.getByLabel('Senha', { exact: true }).fill(USERS[user].password)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('user-menu')).toContainText(USERS[user].name)
}

export async function addToCartFromDetail(page: Page, nftId = 'nft-05') {
  await page.goto(`/nft/${nftId}`)
  await page.getByTestId('buy-button').click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
}

export async function connectWallet(page: Page) {
  await page.getByTestId('connect-wallet').click()
  await page.getByTestId('wallet-approve').click()
  await expect(page.getByTestId('wallet-connect')).toHaveAttribute('data-status', 'connected')
}

export const mocks = {
  setScenario: (page: Page, name: string) => page.evaluate((n) => window.__kurioMocks.setScenario(n), name),
  updateNft: (page: Page, id: string, patch: Parameters<MockControl['updateNft']>[1]) => page.evaluate(([i, p]) => window.__kurioMocks.updateNft(i as string, p as never), [id, patch] as const),
  republishNft: (page: Page, id: string) => page.evaluate((i) => window.__kurioMocks.republishNft(i), id),
  publishStaleNft: (page: Page, id: string) => page.evaluate((i) => window.__kurioMocks.publishStaleNft(i), id),
  disconnectRealtime: (page: Page) => page.evaluate(() => window.__kurioMocks.disconnectRealtime()),
  expireSession: (page: Page) => page.evaluate(() => window.__kurioMocks.expireSession()),
}

/** Playwright's `page.goto` with the mocks already initialised in the same origin. */
export async function gotoWithinApp(page: Page, path: string) {
  await page.goto(path)
  await page.waitForFunction(() => !!window.__kurioMocks)
}
