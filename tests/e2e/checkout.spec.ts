import { expect, test } from '@playwright/test'
import { addToCartFromDetail, connectWallet, login, mocks, openApp, waitForRealtime } from '../support/app'

async function goToCheckout(page: Parameters<typeof login>[0], scenario = 'default') {
  await openApp(page, '/', scenario)
  await login(page, 'ana')
  await addToCartFromDetail(page, 'nft-05')
  await page.getByTestId('checkout-button').click()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByTestId('quote-total')).toHaveText('1.406 ETH')
}

test.describe('Pagamento e confirmação', () => {
  test('compra completa do catálogo ao recibo confirmado', async ({ page }) => {
    test.slow() // fluxo longo (login, compra, confirmação, reload, troca de usuário)
    await goToCheckout(page)
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Nova')
    await expect(page.getByTestId('review-order')).toBeDisabled()

    // Recusa da carteira, depois aprovação
    await page.getByTestId('connect-wallet').click()
    await page.getByTestId('wallet-refuse').click()
    await expect(page.getByTestId('wallet-connect')).toHaveAttribute('data-status', 'refused')
    await connectWallet(page)

    await page.getByTestId('review-order').click()
    await expect(page.getByTestId('review-dialog')).toBeVisible()
    await expect(page.getByTestId('review-dialog')).toContainText('Violet Nomad #314')
    await page.getByTestId('confirm-order').click()

    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.getByTestId('order-card')).toHaveAttribute('data-status', 'pending')
    await expect(page.getByTestId('order-card')).toHaveAttribute('data-status', 'confirmed', { timeout: 15_000 })
    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
    await expect(page.getByTestId('order-total')).toHaveText('1.406 ETH')

    // Snapshot do recibo não muda com o catálogo; carrinho ficou sem o item comprado
    const url = page.url()
    await mocks.updateNft(page, 'nft-05', { price: '9.99' })
    await expect(page.getByTestId('order-total')).toHaveText('1.406 ETH')
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()

    // Refresh do recibo recupera o pedido; pedido de outro usuário é negado
    await page.goto(url)
    await page.reload()
    await expect(page.getByTestId('order-card')).toHaveAttribute('data-status', 'confirmed')
    await page.goto('/account/profile')
    await page.getByTestId('account-logout').click()
    await expect(page.getByTestId('open-login')).toBeVisible()
    await login(page, 'bruno')
    await page.goto(url)
    await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
  })

  test('pagamento recusado preserva os itens do carrinho', async ({ page }) => {
    await goToCheckout(page, 'payment-declined')
    await connectWallet(page)
    await page.getByTestId('review-order').click()
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-card')).toHaveAttribute('data-status', 'declined', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await page.goto('/cart')
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
  })

  test('clique repetido não duplica e timeout recupera o mesmo pedido por idempotência', async ({ page }) => {
    await goToCheckout(page, 'order-timeout')
    await connectWallet(page)
    await page.getByTestId('review-order').click()
    const confirm = page.getByTestId('confirm-order')
    await confirm.click()
    await expect(confirm).toBeDisabled()
    await confirm.click({ force: true }).catch(() => undefined)
    await expect(page).toHaveURL(/\/orders\/ord_/, { timeout: 30_000 })
    await expect(page.getByTestId('order-card')).toHaveAttribute('data-status', 'confirmed', { timeout: 15_000 })
    const orders = await page.evaluate(() => (window.__kurioMocks as unknown as { snapshot(): { orders: unknown[] } }).snapshot().orders.length)
    expect(orders).toBe(1)
  })

  test('alteração de preço via Socket.IO durante o checkout exige nova confirmação', async ({ page }) => {
    await goToCheckout(page)
    await waitForRealtime(page)
    await connectWallet(page)
    await page.getByTestId('review-order').click()
    await expect(page.getByTestId('confirm-order')).toBeEnabled()

    await mocks.updateNft(page, 'nft-05', { price: '1.59' })
    await expect(page.getByTestId('quote-outdated')).toBeVisible()
    await expect(page.getByTestId('confirm-order')).toBeDisabled()
    await expect(page.getByTestId('realtime-notice').first()).toContainText('preço alterado')
    await expect(page.getByTestId('review-dialog').getByTestId('quote-total')).toHaveText('1.606 ETH')

    await page.getByTestId('acknowledge-quote').click()
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-card')).toHaveAttribute('data-status', 'confirmed', { timeout: 15_000 })
    await expect(page.getByTestId('order-total')).toHaveText('1.606 ETH')
  })

  test('edição esgotada na confirmação bloqueia o pedido', async ({ page }) => {
    await goToCheckout(page, 'checkout-sold-out')
    await connectWallet(page)
    await page.getByTestId('review-order').click()
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-error')).toContainText('A cotação mudou')
    await expect(page.getByTestId('confirm-order')).toBeDisabled()
  })

  test('expiração de sessão durante o checkout preserva o contexto', async ({ page }) => {
    await goToCheckout(page)
    await page.getByLabel('Observação do colecionador (opcional)').fill('Entregar na carteira reserva')
    await mocks.expireSession(page)
    await page.getByLabel('Código de indicação').fill('KURIO-ANA-2')
    await page.getByTestId('review-order').click({ force: true }).catch(() => undefined)
    await page.goto('/checkout')
    await expect(page).toHaveURL(/auth=login.*redirect=%2Fcheckout/)
    const form = page.getByTestId('login-form')
    await form.getByLabel('E-mail').fill('ana@kurio.app')
    await form.getByLabel('Senha', { exact: true }).fill('Kurio@123')
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue('Entregar na carteira reserva')
    await expect(page.getByTestId('cart-item').or(page.getByText('Violet Nomad #314')).first()).toBeVisible()
  })
})
