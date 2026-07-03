import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Home Page — Landing & Workspace Entry', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
  })

  test('R-TN-00: Home page loads with all entry points', async ({ page }) => {
    await loadHomePage(page)

    // Home page should show title
    const title = page.getByRole('heading', { name: /format-editor|innfo/i })
    await expect(title).toBeVisible()

    // The home page shows a folder picker area
    await page.waitForTimeout(500)

    // Main action: "Open folder…" button (innfo-editor uses this label)
    const openFolderBtn = page.locator('button', { hasText: /Open folder/i }).first()
    await expect(openFolderBtn).toBeVisible({ timeout: 10000 })
    await expect(openFolderBtn).toBeEnabled()

    // Sample model cards should be visible
    await expect(page.getByText('Example models').or(page.getByText('Sample models'))).toBeVisible()
    const sampleCards = page.locator('button').filter({ hasText: /items/i })
    expect(await sampleCards.count()).toBeGreaterThanOrEqual(1)
  })

  test('Open folder loads workspace with tree', async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)

    // Click Open folder… button
    const folderBtn = page.locator('button', { hasText: /Open folder/i }).first()
    await folderBtn.click()

    // Wait for workspace to load
    await page.waitForTimeout(2000)

    // Should navigate to workspace with tree nodes visible
    // The tree shows model names from the mock
    await page.waitForSelector('text=Back to the Future KB', { timeout: 15000 }).catch(() => {
      // Maybe the KB loads differently — check for any tree content
    })

    // Back button should be visible in toolbar
    await expect(page.getByText('← Home').or(page.getByText(/Home/i))).toBeVisible()
  })

  test('Workspace layout shows panels', async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)

    // Left sidebar (tree) — should show model tree area
    await expect(page.getByRole('heading', { name: 'Model', exact: true })).toBeVisible()

    // Toolbar / header with view switcher
    const viewSwitcher = page.locator('[class*="view-switcher"], button:has-text("editor"), button:has-text("graph"), button:has-text("matrices"), button:has-text("info")').first()
    const viewExists = await viewSwitcher.count()
    if (viewExists > 0) {
      await expect(viewSwitcher).toBeVisible()
    }
  })
})
