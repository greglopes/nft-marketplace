import { expect, test } from '@playwright/test'
import { openApp } from '../support/app'

test.describe('Catálogo', () => {
  test('busca, filtros combinados, ordenação, paginação e restauração pelo histórico', async ({ page }) => {
    await openApp(page)
    await expect(page.getByTestId('nft-card')).toHaveCount(9)

    // Filtro por coleção + rede (combináveis) => URL reflete e paginação reinicia
    await page.getByLabel('Página 2').click()
    await expect(page).toHaveURL(/page=2/)
    await page.locator('label[for="category-musica"]').click()
    await expect(page).toHaveURL(/category=musica/)
    await expect(page).not.toHaveURL(/page=2/)
    await page.locator('label[for="network-solana"]').click()
    await expect(page).toHaveURL(/network=solana/)
    const cards = page.getByTestId('nft-card')
    await expect(cards).not.toHaveCount(9)
    await expect(cards.first()).toBeVisible()
    await expect(cards.first()).toContainText('Golden')

    // Ordenação por menor preço (aguarda a resposta da API com o novo parâmetro)
    const sorted = page.waitForResponse((r) => r.url().includes('/api/nfts') && r.url().includes('sort=price-asc'))
    await page.getByTestId('sort-select').click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price-asc/)
    await sorted
    await expect(page.getByTestId('catalog-grid')).toHaveAttribute('data-state', 'ready')
    const prices = await page.locator('[data-testid="nft-card"] .text-primary').allInnerTexts()
    const numeric = prices.map((p) => Number(p.replace(' ETH', '')))
    expect([...numeric].sort((a, b) => a - b)).toEqual(numeric)

    // Busca por texto compõe a URL
    await page.getByRole('button', { name: 'Abrir busca' }).click()
    await page.getByLabel('Buscar NFTs').fill('Golden')
    await page.getByLabel('Buscar NFTs').press('Enter')
    await expect(page).toHaveURL(/q=Golden/)
    await expect(page.getByTestId('nft-card').first()).toContainText('Golden')

    // Refresh mantém o estado
    await page.reload()
    await expect(page).toHaveURL(/q=Golden/)
    await expect(page.getByRole('checkbox', { name: 'Música' })).toBeChecked()

    // Histórico: voltar restaura o estado anterior
    await page.goBack()
    await expect(page).not.toHaveURL(/q=Golden/)
    await expect(page).toHaveURL(/sort=price-asc/)
  })

  test('acesso direto ao detalhe e NFT inexistente', async ({ page }) => {
    await openApp(page, '/nft/nft-03')
    await expect(page.getByTestId('nft-title')).toHaveText('Neon Vessel #552')
    await expect(page.getByText('2.29 ETH')).toBeVisible()

    await page.goto('/nft/nao-existe')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.goto('/rota/inexistente')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })

  test('edição indisponível e limite de quantidade', async ({ page }) => {
    await openApp(page, '/nft/nft-06')
    await expect(page.getByTestId('edition-e1')).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByTestId('edition-e50')).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText('2 disponíveis')).toBeVisible()
    const inc = page.getByRole('button', { name: 'Aumentar quantidade' })
    await inc.click()
    await expect(page.getByRole('status').filter({ hasText: '2' }).first()).toBeVisible()
    await expect(inc).toBeDisabled()
  })

  test('resultado vazio', async ({ page }) => {
    await openApp(page, '/', 'empty-catalog')
    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
  })

  test('skeletons durante carregamento lento, falha e recuperação após nova tentativa', async ({ page }) => {
    await openApp(page, '/', 'slow')
    await expect(page.getByTestId('catalog-grid')).toHaveAttribute('data-state', 'loading')
    await expect(page.getByTestId('skeleton').first()).toBeVisible()
    await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 15_000 })

    await openApp(page, '/', 'catalog-error')
    await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o catálogo')
    await page.evaluate(() => window.__kurioMocks.setScenario('default'))
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
  })
})
