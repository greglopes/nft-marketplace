import { expect, test } from '@playwright/test'
import { login, mocks, openApp } from '../support/app'

test.describe('Favoritos', () => {
  test('exige autenticação, persiste e faz rollback quando a mutation falha', async ({ page }) => {
    await openApp(page, '/nft/nft-02')
    await page.getByTestId('favorite-button').click()
    await expect(page).toHaveURL(/auth=login/)
    await expect(page.getByTestId('auth-dialog')).toBeVisible()

    await login(page, 'ana', '/nft/nft-02')
    await expect(page).toHaveURL(/\/nft\/nft-02/)
    const button = page.getByTestId('favorite-button')
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    const saved = page.waitForResponse((r) => r.url().includes('/api/favorites/nft-02') && r.request().method() === 'PUT')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true') // otimista
    expect((await saved).status()).toBe(200)
    await page.reload()
    await expect(button).toHaveAttribute('aria-pressed', 'true')

    // Falha da mutation: atualização otimista aparece e é revertida
    await mocks.setScenario(page, 'favorites-fail')
    await button.click()
    await expect(page.getByText('Não foi possível remover o favorito agora.')).toBeVisible()
    await expect(button).toHaveAttribute('aria-pressed', 'true')

    await mocks.setScenario(page, 'default')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
  })
})
