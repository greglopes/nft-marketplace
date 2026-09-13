import { expect, test } from '@playwright/test'
import { USERS, addToCartFromDetail, openApp } from '../support/app'

test.describe('Carrinho', () => {
  test('quantidades, remoção, cupom e persistência após refresh e login', async ({ page }) => {
    await openApp(page)
    await addToCartFromDetail(page, 'nft-05')
    await expect(page.getByTestId('quote-subtotal')).toHaveText('1.39 ETH')

    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(page.getByTestId('line-total')).toHaveText('2.78 ETH')
    await expect(page.getByTestId('quote-total')).toHaveText('2.796 ETH')

    // Cupom inválido, expirado e válido
    await page.getByLabel('Código promocional').fill('NADA')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('alert')).toContainText('Cupom inválido')
    await page.getByLabel('Código promocional').fill('EXPIRED20')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('alert')).toContainText('Cupom expirado')
    await page.getByLabel('Código promocional').fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('coupon-applied')).toContainText('KURIO10')
    await expect(page.getByTestId('quote-discount')).toHaveText('(-) 0.278 ETH')
    await expect(page.getByTestId('quote-total')).toHaveText('2.518 ETH')

    // Refresh mantém o carrinho do visitante
    await page.reload()
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
    await expect(page.getByTestId('coupon-applied')).toContainText('KURIO10')

    // Login preserva os itens do visitante (merge com o carrinho da conta)
    await page.getByTestId('checkout-button').click()
    await expect(page).toHaveURL(/auth=login.*redirect=%2Fcheckout/)
    const form = page.getByTestId('login-form')
    await form.getByLabel('E-mail').fill(USERS.bruno.email)
    await form.getByLabel('Senha', { exact: true }).fill(USERS.bruno.password)
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL(/\/checkout/)
    await page.goto('/cart')
    await expect(page.getByTestId('cart-item')).toHaveCount(2) // item do visitante + item fixture do Bruno

    // Remover cupom e item
    await page.getByRole('button', { name: 'Remover cupom' }).click()
    await expect(page.getByLabel('Código promocional')).toBeVisible()
    await page.getByRole('button', { name: /Remover Violet Nomad/ }).click()
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
  })

  test('respeita o limite de disponibilidade por edição', async ({ page }) => {
    await openApp(page)
    await addToCartFromDetail(page, 'nft-06')
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
    await expect(page.getByTestId('line-total')).toHaveText('3.58 ETH')
  })
})
