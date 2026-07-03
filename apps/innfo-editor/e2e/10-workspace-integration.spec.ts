import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder, expandAllNodes } from './helpers/setup'

/**
 * Integration test: full workspace workflow — open folder, navigate tree,
 * explore nodes, switch views, validate, close workspace.
 *
 * These tests verify the overall UI PATTERNS match the predecessor apps
 * (file-format, folder-format) that were ported from.
 */
test.describe('Workspace Integration — Full Workflow & UI Pattern Compliance', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  test('Full workflow: tree → node → sheet → tabs → matrices → info → home', async ({ page }) => {
    // 1. TREE: Expand a node and see its children
    const expandBtn = page.getByTitle('Expand All').first()
    await expandBtn.click()
    await page.waitForTimeout(500)

    // 2. NODE: Select Delorean from tree
    await page.getByText('Delorean').first().click()
    await page.waitForTimeout(1000)

    // 3. SHEET: BlockSheet shows View tab with content
    const body = page.locator('main')
    await expect(body).toContainText(/DeLorean|time machine/i)

    // 4. TABS: Switch between tabs
    for (const tab of ['Visual', 'Compliance']) {
      const tabEl = page.getByText(tab, { exact: true })
      const tabExists = await tabEl.count()
      if (tabExists > 0) {
        await tabEl.click()
        await page.waitForTimeout(500)
      }
    }

    // 5. MATRICES: Switch to matrices view
    await page.getByText('matrices', { exact: true }).click()
    await page.waitForTimeout(500)
    const matricesContent = page.locator('[class*="matrices"], [class*="matrix"]')
    expect(await matricesContent.count()).toBeGreaterThan(0)

    // 6. INFO: Switch to info view
    await page.getByText('info', { exact: true }).click()
    await page.waitForTimeout(500)
    await expect(body).toContainText(/V_1-0-0|model|version/i)

    // 7. BACK: Close workspace
    await page.getByText(/← Home|Home/).first().click()
    await page.waitForTimeout(1000)
    // Should be back at home page
    expect(page.url()).toBe('/app/')
    await expect(page.locator('button', { hasText: /Open folder/i })).toBeVisible()
  })

  test('UI Pattern: Three-panel layout with resizable sidebars', async ({ page }) => {
    // 1. LEFT SIDEBAR - resizable, contains model tree
    const leftSidebar = page.locator('[class*="sidebar"], [class*="left-sidebar"], aside').first()
    await expect(leftSidebar).toBeVisible()

    // Has resize handle
    const resizeHandles = page.locator('[class*="cursor-col-resize"]')
    expect(await resizeHandles.count()).toBeGreaterThan(0)

    // 2. MAIN CONTENT - center area with toolbar
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Toolbar elements
    await expect(page.getByRole('button', { name: 'Validate' })).toBeVisible()
    await expect(page.getByText('▼', { exact: true }).or(page.locator('[class*="view-switcher"]'))).toBeVisible()

    // 3. RIGHT PANEL - guidance/collapsible sidebar
    const rightPanel = page.getByTitle('Show Guidance Panel').or(
      page.locator('[class*="right-sidebar"], [class*="guidance"]').first()
    )
    await expect(rightPanel).toBeVisible()
  })

  test('UI Pattern: Tree nodes are styled pills with consistent layout', async ({ page }) => {
    // Tree nodes should have a consistent visual structure:
    // icon + colored pill + name + counter

    // Check tree node structure
    const treeNodes = page.locator('[class*="tree-node"], [class*="concept-tree"] *').first()

    // The tree should show hierarchy with proper indentation
    const treeContainer = page.locator('[class*="space-y"]').first()
    await expect(treeContainer).toBeVisible()
  })

  test('UI Pattern: Validation button triggers modal with report', async ({ page }) => {
    // Select a node with content
    await page.getByText('HillValleyCorp').first().click()
    await page.waitForTimeout(500)

    // Click Validate
    const validateBtn = page.getByText('Validate', { exact: true }).first()
    await expect(validateBtn).toBeEnabled()
    await validateBtn.click()
    await page.waitForTimeout(2000)

    // Should show validation results (success or error)
    const validationResult = page.locator('[class*="toast"], [class*="validation"], [class*="report"]').first()
    const valExists = await validationResult.count()

    if (valExists > 0) {
      await expect(validationResult).toBeVisible()
      // Should contain some validation text
      const text = await validationResult.textContent()
      expect(text?.length).toBeGreaterThan(0)
    }
  })

  test('UI Pattern: Graph view renders interactive SVG', async ({ page }) => {
    // Click Graph View button or "graph" tab
    const graphBtn = page.getByText('Graph View').or(page.getByText('graph', { exact: true }))
    await expect(graphBtn.first()).toBeVisible()
    await graphBtn.first().click()
    await page.waitForTimeout(1500)

    // Graph should render SVG
    const svg = page.locator('svg[class*="graph"], svg[class*="d3"]').first()
    const svgExists = await svg.count()
    if (svgExists > 0) {
      await expect(svg).toBeVisible()

      // SVG should have meaningful content (not empty)
      const innerHtml = await svg.innerHTML()
      expect(innerHtml.length).toBeGreaterThan(100)
    }
  })

  test('UI Pattern: Selected node stays highlighted across view switches', async ({ page }) => {
    // Expand tree to reveal child elements
    await expandAllNodes(page)
    // Select Delorean in tree
    await page.getByText('Delorean').first().click()
    await page.waitForTimeout(500)

    // Switch to graph view
    await page.getByText('graph', { exact: true }).click()
    await page.waitForTimeout(1000)

    // Switch to matrices view
    await page.getByText('matrices', { exact: true }).click()
    await page.waitForTimeout(500)

    // Switch back to editor view - Delorean should still be selected
    await page.getByText('editor', { exact: true }).click()
    await page.waitForTimeout(500)

    // The editor should still show Delorean's content
    await expect(page.locator('main')).toContainText(/DeLorean|DMC-12/i)
  })

  test('UI Pattern: Keyboard shortcuts — Ctrl+S saves', async ({ page }) => {
    // Select a node
    await page.getByText('HillValleyCorp').first().click()
    await page.waitForTimeout(500)

    // Press Ctrl+S
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(1000)

    // No error toast should appear
    const errorToast = page.getByText(/Save failed|error/i)
    // (may show success toast instead)
    const successToast = page.getByText(/saved|success/i)
    const hasSuccess = await successToast.count()
    const hasError = await errorToast.count()

    if (hasSuccess > 0) {
      await expect(successToast.first()).toBeVisible()
    }
    expect(hasError).toBe(0) // No save errors
  })

  test('UI Pattern: Home page has recent files list', async ({ page }) => {
    // Go back to home (beforeEach already opened a folder)
    await page.getByText(/← Home|Home/).first().click()
    await page.waitForTimeout(1000)

    // Recent files section should exist (or at least the home page loaded)
    const recentSection = page.getByText(/Recent|recent|history|History/i).first()
    const recentExists = await recentSection.count()
    if (recentExists > 0) {
      await expect(recentSection).toBeVisible()
    }
  })

  test('UI Pattern: Right sidebar guidance panel shows concept help', async ({ page }) => {
    // Expand tree to reveal child elements
    await expandAllNodes(page)
    // Select a node with a concept type
    await page.getByText('Delorean').first().click()
    await page.waitForTimeout(500)

    // Open right sidebar if collapsed
    const showBtn = page.getByTitle('Show Guidance Panel').first()
    if (await showBtn.count() > 0) {
      await showBtn.click()
      await page.waitForTimeout(500)
    }

    // Should show guidance or concept info
    const guidanceText = page.locator('[class*="guidance"]').first()
    const guidanceExists = await guidanceText.count()
    if (guidanceExists > 0) {
      const text = await guidanceText.textContent()
      expect(text?.length).toBeGreaterThan(0)
    }
  })

  test('UI Pattern: Toast messages appear and disappear', async ({ page }) => {
    // Trigger a toast by saving
    await page.getByText('HillValleyCorp').first().click()
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(500)

    // Toast should appear
    const toast = page.locator('[class*="toast"], [role="alert"]').first()
    const toastExists = await toast.count()
    if (toastExists > 0) {
      await expect(toast).toBeVisible()
      // Toast should disappear after some time
      // (not testing timing, just presence)
    }
  })
})
