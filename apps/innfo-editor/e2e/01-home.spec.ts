import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Home Page — Landing & Workspace Entry', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
  })

  test('R-TN-00: Home page loads with all entry points', async ({ page }) => {
    await loadHomePage(page)

    const title = page.getByRole('heading', { name: /format-editor|innfo/i })
    await expect(title).toBeVisible()

    const openFolderBtn = page.locator('button', { hasText: /Open folder/i }).first()
    await expect(openFolderBtn).toBeVisible({ timeout: 10000 })
    await expect(openFolderBtn).toBeEnabled()

    await expect(page.getByText('Example models').or(page.getByText('Sample models'))).toBeVisible()
    const sampleCards = page.locator('button').filter({ hasText: /items/i })
    expect(await sampleCards.count()).toBeGreaterThanOrEqual(1)
  })

  test('Open folder loads workspace with tree', async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)

    const folderBtn = page.locator('button', { hasText: /Open folder/i }).first()
    await folderBtn.click()

    await page.waitForURL('**/workspace', { timeout: 15000 })
    await expect(page.getByText('BTTFKB')).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('← Home').or(page.getByText(/Home/i))).toBeVisible()
  })

  test('Workspace layout shows panels', async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)

    await expect(page.getByRole('heading', { name: 'Model', exact: true })).toBeVisible()

    await expect(page.getByTestId('view-switcher-editor')).toBeVisible()
  })
})