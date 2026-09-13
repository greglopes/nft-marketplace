import { expect, test } from '@playwright/test'
import { addToCartFromDetail, connectWallet, login, mocks, openApp, waitForRealtime } from '../support/app'

test.describe('Tempo real', () => {
  test('nft.updated atualiza catálogo, detalhe e carrinho; duplicatas e eventos antigos são ignorados', async ({ page }) => {
    await openApp(page)
    await waitForRealtime(page)
    const card = page.getByTestId('nft-card').filter({ hasText: 'Emerald Ape #042' })
    await expect(card).toContainText('1.19 ETH')

    await mocks.updateNft(page, 'nft-01', { price: '1.49' })
    await expect(card).toContainText('1.49 ETH')

    // Evento antigo (versão anterior) não regride o estado
    await mocks.publishStaleNft(page, 'nft-01')
    await page.waitForTimeout(300)
    await expect(card).toContainText('1.49 ETH')
    await expect(card).not.toContainText('0.01 ETH')

    // Duplicata (mesmo estado, novo eventId) não reaplica efeitos
    await addToCartFromDetail(page, 'nft-01')
    await mocks.updateNft(page, 'nft-01', { price: '1.69' })
    await expect(page.getByTestId('realtime-notice')).toHaveCount(1)
    await mocks.republishNft(page, 'nft-01')
    await page.waitForTimeout(300)
    await expect(page.getByTestId('realtime-notice')).toHaveCount(1)
    await expect(page.getByTestId('quote-subtotal')).toHaveText('1.69 ETH')

    // Detalhe reflete preço e disponibilidade
    await mocks.updateNft(page, 'nft-01', { editions: [{ id: 'e50', available: 0 }] })
    await page.goto('/nft/nft-01')
    await expect(page.getByTestId('edition-e50')).toHaveAttribute('aria-disabled', 'true')
  })

  test('desconexão com pedido pendente: reconexão e refresh recuperam o estado sem nova compra', async ({ page }) => {
    await openApp(page, '/', 'payment-slow')
    await login(page, 'ana')
    await addToCartFromDetail(page, 'nft-05')
    await page.getByTestId('checkout-button').click()
    await connectWallet(page)
    await page.getByTestId('review-order').click()
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-card')).toHaveAttribute('data-status', 'pending')

    await mocks.disconnectRealtime(page)
    await expect(page.getByTestId('realtime-status')).toBeVisible()
    await waitForRealtime(page)
    await expect(page.getByTestId('realtime-status')).toHaveCount(0)

    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByTestId('order-card')).toHaveAttribute('data-status', 'pending')
    await page.goto('/checkout')
    await expect(page).toHaveURL(url) // pedido pendente é retomado, não recriado
    await expect(page.getByTestId('order-card')).toHaveAttribute('data-status', 'confirmed', { timeout: 30_000 })
    const orders = await page.evaluate(() => (window.__kurioMocks as unknown as { snapshot(): { orders: unknown[] } }).snapshot().orders.length)
    expect(orders).toBe(1)
  })
})
