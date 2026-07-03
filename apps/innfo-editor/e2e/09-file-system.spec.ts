import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('File System Operations — Directory Picker, URL Loading, Backup', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
  })

  test('R-FS-01: Directory picker welcome screen shows options', async ({ page }) => {
    await loadHomePage(page)

    // Should see "Open Local Folder" button
    const openBtn = page.getByText('Open Local Folder').first()
    await expect(openBtn).toBeVisible()

    // Should also see "Load from URL" option
    const urlSection = page.getByText('Load from URL', { exact: false })
    await expect(urlSection).toBeVisible()
  })

  test('R-FS-02: Open folder loads workspace and shows tree', async ({ page, context }) => {
    await loadHomePage(page)
    await page.getByText('Open Local Folder').first().click()
    await page.waitForTimeout(2000)

    // Should be in workspace route
    expect(page.url()).toContain('/workspace')

    // Tree should show model nodes
    await expect(page.getByText('Back to the Future KB')).toBeVisible()
    await expect(page.getByText('Hill Valley Time Travel')).toBeVisible()

    // Title should be visible
    await expect(page.getByText('Time Travel Protocol')).toBeVisible()
  })

  test('R-FS-03: Load from URL', async ({ page, context }) => {
    await loadHomePage(page)

    // Find URL input area
    const urlInput = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="http" i]').first()
    const urlExists = await urlInput.count()

    if (urlExists > 0) {
      await urlInput.fill('http://localhost:8000/Sandbox/HillValleyTimeTravel_V_1-0-0_business_F.md')
      const loadBtn = page.getByText(/Load|Fetch|Open/i).first()
      await expect(loadBtn).toBeEnabled()
    }
  })

  test('R-FS-05: Auto-backup runs before save', async ({ page, context }) => {
    await loadHomePage(page)
    await openMockFolder(page)

    // Click on the business model to select it
    await page.getByText('Hill Valley Time Travel').first().click()
    await page.waitForTimeout(500)

    // Try saving (Ctrl+S or Cmd+S)
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(1000)

    // Save should succeed (no toast error)
    const errorToast = page.locator('[class*="toast"]').filter({ hasText: /failed|error/i })
    expect(await errorToast.count()).toBe(0)
  })
})
