import { expect, test } from '@playwright/test'
import { USERS, login, mocks, openApp } from '../support/app'

test.describe('Conta e sessão', () => {
  test('cadastro, conflito, login, expiração, logout e troca de usuário', async ({ page }) => {
    await openApp(page, '/register')
    const register = page.getByTestId('register-form')
    await register.getByLabel('Nome de usuário').fill('novo.colecionador')
    await register.getByLabel('E-mail').fill(USERS.ana.email)
    await register.getByLabel('Senha', { exact: true }).fill('Segredo@123')
    await register.getByLabel('Confirmar senha').fill('Segredo@123')
    await page.getByTestId('register-submit').click()
    await expect(page.getByRole('alert').filter({ hasText: 'E-mail já cadastrado' })).toBeVisible()

    await register.getByLabel('E-mail').fill('novo@kurio.app')
    await page.getByTestId('register-submit').click()
    await expect(page.getByTestId('user-menu')).toContainText('novo.colecionador')

    // Sessão sobrevive ao refresh
    await page.reload()
    await expect(page.getByTestId('user-menu')).toContainText('novo.colecionador')

    // Expiração durante a navegação: redireciona preservando o destino
    await mocks.expireSession(page)
    await page.goto('/account/profile')
    await expect(page).toHaveURL(/auth=login.*redirect=%2Faccount%2Fprofile/)

    // Login com usuário fixture e retorno ao fluxo anterior
    const form = page.getByTestId('login-form')
    await form.getByLabel('E-mail').fill(USERS.ana.email)
    await form.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL(/\/account\/profile/)
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Nova')

    // Logout limpa dados privados
    await page.getByTestId('account-logout').click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('open-login')).toBeVisible()
    await page.goto('/account/profile')
    await expect(page).toHaveURL(/auth=login/)

    // Troca de usuário: favoritos do usuário anterior não vazam
    await login(page, 'ana')
    await page.goto('/nft/nft-01')
    await expect(page.getByTestId('favorite-button')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('user-menu').click()
    await page.getByTestId('logout').click()
    await login(page, 'bruno')
    await page.goto('/nft/nft-01')
    await expect(page.getByTestId('favorite-button')).toHaveAttribute('aria-pressed', 'false')
  })

  test('credenciais inválidas e validação de formulário', async ({ page }) => {
    await openApp(page, '/login')
    const form = page.getByTestId('login-form')
    await page.getByTestId('login-submit').click()
    await expect(page.getByRole('alert').filter({ hasText: 'Informe um e-mail válido' })).toBeVisible()
    await form.getByLabel('E-mail').fill(USERS.ana.email)
    await form.getByLabel('Senha', { exact: true }).fill('errada')
    await page.getByTestId('login-submit').click()
    await expect(page.getByRole('alert').filter({ hasText: 'E-mail ou senha inválidos' })).toBeVisible()
  })
})
