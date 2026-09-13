import { expect, test } from '@playwright/test'
import { addToCartFromDetail, connectWallet, login, openApp } from '../support/app'

test.describe('Acessibilidade', () => {
  test('navegação por teclado, foco visível e skip link', async ({ page }) => {
    await openApp(page)
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()
    const firstCard = page.getByRole('link', { name: 'Ver detalhes de Emerald Ape #042' })
    await firstCard.focus()
    await expect(firstCard).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/nft\/nft-01/)
    await expect(page.getByTestId('nft-title')).toBeVisible()

    // Modal de login abre sobre a página atual, prende o foco e fecha com Escape mantendo a página
    await page.getByTestId('open-login').click()
    await expect(page.getByTestId('auth-dialog')).toBeVisible()
    await expect(page).toHaveURL(/\/nft\/nft-01\?auth=login/)
    await expect(page.getByTestId('login-form').getByLabel('E-mail')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('auth-dialog')).toBeHidden()
    await expect(page).toHaveURL(/\/nft\/nft-01$/)
  })

  test('diálogo de revisão prende o foco e fecha com Escape', async ({ page }) => {
    await openApp(page)
    await login(page, 'ana')
    await addToCartFromDetail(page, 'nft-05')
    await page.getByTestId('checkout-button').click()
    await connectWallet(page)
    await page.getByTestId('review-order').click()
    const dialog = page.getByRole('dialog', { name: 'Revisar pedido' })
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab')
    const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
    expect(inside).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId('review-order')).toBeFocused()
  })

  test('validação de formulários associa mensagens aos campos', async ({ page }) => {
    await openApp(page, '/register')
    await page.getByTestId('register-submit').click()
    const username = page.getByLabel('Nome de usuário')
    await expect(username).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await username.getAttribute('aria-describedby')
    expect(describedBy).toContain('username-error')
    await expect(page.locator('#username-error')).toHaveText(/Mínimo de 3 caracteres/)
  })
})
