import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Home Page — Landing & Workspace Entry', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
  })

  test('R-TN-00: Home page loads with all entry points', async ({ page }) => {
    await loadHomePage(page)

    // Home page should show title or app identifier
    await expect(page.locator('h1, h2, h3, .app-title, .logo')).toBeVisible()

    // Open Local Folder button
    const openFolderBtn = page.getByText('Open Local Folder')
    await expect(openFolderBtn).toBeVisible()
    await expect(openFolderBtn).toBeEnabled()

    // Load from URL button/input area
    const loadUrlSection = page.getByText('Load from URL', { exact: false })
    await expect(loadUrlSection).toBeVisible()
  })

  test('Open Local Folder loads workspace with tree', async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)

    // Click Open Local Folder
    await page.getByText('Open Local Folder').first().click()
    await page.waitForTimeout(2000)

    // Should navigate to workspace with tree nodes visible
    await expect(page.getByText('Back to the Future KB')).toBeVisible()
    await expect(page.getByText('Hill Valley Time Travel')).toBeVisible()

    // Back button should be visible in toolbar
    await expect(page.getByText('← Home')).toBeVisible()
  })

  test('Workspace layout shows 3-panel structure', async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)

    // Left sidebar (tree) — should show model tree
    await expect(page.getByText('Model')).toBeVisible()

    // Main editor area — should show toolbar
    await expect(page.getByText('Validate')).toBeVisible()

    // Right sidebar — guidance panel (collapsed initially or expandable)
    // The guidance panel button should exist
    await expect(page.getByTitle('Show Guidance Panel').or(page.getByText('Guidance'))).toBeVisible()
  })
})
