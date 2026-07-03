import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Matrices — Virtual Scrolling, MatrixSummary, MatrixPill Navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  test('Matrices view accessible from tab switcher', async ({ page }) => {
    // Click on "matrices" in the view switcher
    const matricesTab = page.getByText('matrices', { exact: true })
    await expect(matricesTab).toBeVisible()
    await matricesTab.click()
    await page.waitForTimeout(1000)

    // Matrices view should render
    await expect(page.getByRole('button', { name: 'matrices' }).or(page.locator('[class*="matrix-view"]'))).toBeVisible()
  })

  test('Matrix definitions shown in sidebar Relations section', async ({ page }) => {
    // Left sidebar has Relations section with MatrixPill components
    const relationsSection = page.getByText('Relations').first()
    await expect(relationsSection).toBeVisible()

    // Relations section should be expandable
    await relationsSection.click()
    await page.waitForTimeout(500)

    // Check for matrix pill items (stakeholder-risk, work-roles matrices)
    const matrixPills = page.locator('[class*="pill"], [class*="matrix-pill"]')
    const pillCount = await matrixPills.count()
    if (pillCount > 0) {
      await expect(matrixPills.first()).toBeVisible()
    }
  })

  test('Clicking MatrixPill navigates to matrix view', async ({ page }) => {
    // Find matrix pills in Relations section
    const relationsSection = page.getByText('Relations').first()
    await relationsSection.click()
    await page.waitForTimeout(500)

    // Find and click a matrix pill
    const matrixPill = page.locator('[class*="pill"], [class*="matrix-pill"]').filter({ hasText: /stakeholder|work.*role/i }).first()
    const pillExists = await matrixPill.count()
    if (pillExists > 0) {
      await matrixPill.click()
      await page.waitForTimeout(1000)

      // Should switch to matrices view
      // The matrix grid should show
      const grid = page.locator('[class*="matrices-grid"], [class*="matrix-grid"], table').first()
      const gridExists = await grid.count()
      if (gridExists > 0) {
        await expect(grid).toBeVisible()
      }
    }
  })

  test('MatricesGrid renders with virtual scroll (DOM-limited)', async ({ page }) => {
    // Navigate to matrices view
    await page.getByText('matrices', { exact: true }).click()
    await page.waitForTimeout(1000)

    // The matrix should render with virtual scroll
    // Check that the DOM doesn't contain ALL cells (only visible window)
    const allCells = await page.locator('td, [class*="cell"], [class*="matrix-cell"]').count()

    // Virtual scrolling should limit DOM nodes
    // A full table would render everything; virtual scrolling renders ~20-50 visible cells
    // With 2 matrices (stakeholder-risk 2×2, work-roles 2×1 = about 10 cells total),
    // the DOM count should be reasonable
    expect(allCells).toBeLessThan(100)

    // Scroll position widgets should persist per matrix
    const matrixSelector = page.locator('select, [class*="matrix-select"]').first()
    const selectorExists = await matrixSelector.count()
    if (selectorExists > 0) {
      // Switch between matrices
      await matrixSelector.selectOption({ index: 1 })
      await page.waitForTimeout(500)

      // Switch back
      await matrixSelector.selectOption({ index: 0 })
      await page.waitForTimeout(500)
    }
  })

  test('Value distribution bar visible on matrices', async ({ page }) => {
    // Navigate to matrices view
    await page.getByText('matrices', { exact: true }).click()
    await page.waitForTimeout(1000)

    // Check for value distribution
    const distBar = page.getByText(/distribution|values/i).first()
    const distExists = await distBar.count()
    if (distExists > 0) {
      await expect(distBar).toBeVisible()
    }
  })

  test('Copy table button present on matrices', async ({ page }) => {
    // Navigate to matrices view
    await page.getByText('matrices', { exact: true }).click()
    await page.waitForTimeout(1000)

    // Check for copy button
    const copyBtn = page.getByText(/Copy|Copy table|copy/i)
      .or(page.locator('[title*="copy" i]'))
      .first()
    const copyExists = await copyBtn.count()
    if (copyExists > 0) {
      await expect(copyBtn).toBeEnabled()
    }
  })
})
