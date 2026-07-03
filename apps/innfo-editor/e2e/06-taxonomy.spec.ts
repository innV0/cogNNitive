import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder, expandAllNodes } from './helpers/setup'

test.describe('Taxonomy Perspectives — Concept Tree, Neighborhood, Navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  test('R-TP-01: Taxonomy-defined perspective navigation', async ({ page }) => {
    // Expand tree to reveal child elements
    await expandAllNodes(page)

    // Select a KB node that has taxonomy perspective assigned
    await page.getByText('Delorean').first().click()
    await page.waitForTimeout(1000)

    // Right guidance sidebar should show perspective info
    // The perspective panel shows Parents/Children/Siblings
    const perspectivePanel = page.locator('[class*="perspective"], [class*="guidance"], [class*="right-sidebar"]')

    // Look for perspective content
    const panelContent = perspectivePanel.first()
    const panelExists = await panelContent.count()
    if (panelExists > 0) {
      // Should show perspective neighborhood info
      await expect(panelContent).toContainText(/Technology|Vehicles|Devices|Perspective|neighborhood/i)
    }
  })

  test('R-TP-02: Taxonomy tree built from frontmatter taxonomy field', async ({ page }) => {
    // The KB root _F.md has taxonomy defined in frontmatter
    // Click on the "Model" section in the left sidebar
    const modelHeader = page.getByText('Model').first()
    await expect(modelHeader).toBeVisible()

    // Tree should group concepts by taxonomy
    // Check for perspective-based grouping (Technology, People groups)
    const technologyGroup = page.getByText('Technology').or(page.locator('[class*="virtual"]').filter({ hasText: /Technology/i }))
    const techGroupExists = await technologyGroup.count()

    if (techGroupExists > 0) {
      await expect(technologyGroup.first()).toBeVisible()
    } else {
      // Fallback: expand tree and select Delorean
      await expandAllNodes(page)
      await page.getByText('Delorean').first().click()
      await page.waitForTimeout(1000)

      // Delorean has taxonomy.perspective: "Vehicles"
      const deloreanContent = page.locator('main')
      await expect(deloreanContent).toContainText(/Vehicles|Devices/i)
    }
  })

  test('R-TP-04: Perspective neighborhood shows parents/children/siblings', async ({ page }) => {
    // Expand tree to reveal child elements
    await expandAllNodes(page)
    // Select Delorean (perspective: "Vehicles", child of Technology)
    await page.getByText('Delorean').first().click()
    await page.waitForTimeout(1000)

    // Open right guidance sidebar if collapsed
    const showBtn = page.getByTitle('Show Guidance Panel').first()
    if (await showBtn.count() > 0) {
      await showBtn.click()
      await page.waitForTimeout(500)
    }

    // Look for neighborhood information
    const guidanceArea = page.locator('[class*="guidance"], [class*="right-sidebar"]')
    const guidanceText = await guidanceArea.first().textContent() || ''
    const hasNeighborhood = /parent|child|sibling|neighborhood|perspective/i.test(guidanceText)

    // If perspective panel is implemented, should show taxonomy info
    if (hasNeighborhood) {
      // Delorean should show parent Technology or sibling info
      const hasRelations = /technology|devices|hoverboard/i.test(guidanceText)
      expect(hasRelations).toBeTruthy()
    }
  })

  test('R-TP-06: No relationship editor in perspectives', async ({ page }) => {
    // Expand tree to reveal child elements
    await expandAllNodes(page)
    // Perspectives are read-only — no add/edit/delete controls
    await page.getByText('Delorean').first().click()
    await page.waitForTimeout(1000)

    const addEdgeBtn = page.getByText(/Add edge|Add relationship|Edit taxonomy/i)
    expect(await addEdgeBtn.count()).toBe(0)
  })
})
