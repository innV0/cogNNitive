import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Matrices — Virtual Scrolling, MatrixSummary, MatrixPill Navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  test('Matrices view accessible from tab switcher', async ({ page }) => {
    await page.getByTestId('view-switcher-matrices').click()
    await expect(page.getByTestId('matrices-grid')).toBeVisible()
  })

  test('Matrix definitions shown in sidebar Relations section', async ({ page }) => {
    await expect(page.getByText('Relations').first()).toBeVisible()
    await expect(page.locator('[data-testid^="matrix-pill-"]').first()).toBeVisible()
  })

  test('Clicking MatrixPill navigates to matrix view', async ({ page }) => {
    const matrixPill = page.locator('[data-testid^="matrix-pill-"]').first()
    await expect(matrixPill).toBeVisible()
    await matrixPill.click()

    await expect(page.getByTestId('matrices-grid')).toBeVisible()
  })

  test('MatricesGrid renders with virtual scroll (DOM-limited)', async ({ page }) => {
    await page.getByTestId('view-switcher-matrices').click()

    const allCells = await page.locator('td, [class*="cell"], [class*="matrix-cell"]').count()
    expect(allCells).toBeLessThan(100)

    await expect(page.getByTestId('matrix-selector')).toBeVisible()
    await page.getByTestId('matrix-selector').click()
    // Select second option from dropdown
    const options = page.locator(
      '[class*="bg-white dark:bg-slate-800 border border-slate-200"] [role="option"], [class*="bg-white dark:bg-slate-800 border border-slate-200"] button',
    )
    const optionCount = await options.count()
    if (optionCount > 1) {
      await options.nth(1).click()
    }
  })

  test('Value distribution bar visible on matrices', async ({ page }) => {
    await page.getByTestId('view-switcher-matrices').click()

    const distBar = page.getByText(/distribution|values/i).first()
    await expect(distBar).toBeVisible()
  })

  test('Copy table button present on matrices', async ({ page }) => {
    await page.getByTestId('view-switcher-matrices').click()

    const copyBtn = page
      .getByText(/Copy|Copy table|copy/i)
      .or(page.locator('[title*="copy" i]'))
      .first()
    await expect(copyBtn).toBeVisible()
    await expect(copyBtn).toBeEnabled()
  })
})
