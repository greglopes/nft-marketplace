import { expect, test, type Page } from '@playwright/test'
import { addToCartFromDetail, connectWallet, login, openApp } from '../support/app'

async function stabilize(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addStyleTag({ content: '[data-sonner-toaster]{display:none !important} *{caret-color:transparent !important}' })
  await page.evaluate(() => document.fonts.ready)
}

test.describe('Regressão visual', () => {
  test('início', async ({ page }) => {
    await openApp(page)
    await stabilize(page)
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
    await expect(page).toHaveScreenshot('home.png', { fullPage: true })
  })

  test('detalhe', async ({ page }) => {
    await openApp(page, '/nft/nft-01')
    await stabilize(page)
    await expect(page.getByTestId('nft-title')).toBeVisible()
    await expect(page.getByTestId('nft-card')).toHaveCount(5)
    await expect(page).toHaveScreenshot('detail.png', { fullPage: true })
  })

  test('carrinho', async ({ page }) => {
    await openApp(page)
    await addToCartFromDetail(page, 'nft-05')
    await stabilize(page)
    await expect(page.getByTestId('quote-total')).toHaveText('1.406 ETH')
    await expect(page.getByTestId('nft-card')).toHaveCount(5)
    await expect(page).toHaveScreenshot('cart.png', { fullPage: true })
  })

  test('pagamento', async ({ page }) => {
    await openApp(page)
    await login(page, 'ana')
    await addToCartFromDetail(page, 'nft-05')
    await page.getByTestId('checkout-button').click()
    await connectWallet(page)
    await stabilize(page)
    await expect(page.getByTestId('quote-total')).toHaveText('1.406 ETH')
    await expect(page).toHaveScreenshot('checkout.png', { fullPage: true })
  })
})
