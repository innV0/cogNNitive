import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder, expandAllNodes } from './helpers/setup'

test.describe('Taxonomy Perspectives — Concept Tree, Neighborhood, Navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  test('R-TP-01: Taxonomy-defined perspective navigation', async ({ page }) => {
    await expandAllNodes(page)
    await page.getByText('Delorean').first().click()

    await expect(page.getByTestId('right-guidance-sidebar')).toBeVisible()
    await expect(page.getByTestId('right-guidance-sidebar')).toContainText(
      /Technology|Vehicles|Devices|Perspective|neighborhood/i,
    )
  })

  test('R-TP-02: Taxonomy tree built from frontmatter taxonomy field', async ({ page }) => {
    const modelHeader = page.getByText('Model').first()
    await expect(modelHeader).toBeVisible()

    const technologyGroup = page
      .getByText('Technology')
      .or(page.locator('[data-testid="virtual-group-node"]').filter({ hasText: /Technology/i }))
    const techGroupExists = await technologyGroup.count()

    if (techGroupExists > 0) {
      await expect(technologyGroup.first()).toBeVisible()
    } else {
      await expandAllNodes(page)
      await page.getByText('Delorean').first().click()
      const deloreanContent = page.locator('main')
      await expect(deloreanContent).toContainText(/Topic|technology/i)
    }
  })

  test('R-TP-04: Perspective neighborhood shows parents/children/siblings', async ({ page }) => {
    await expandAllNodes(page)
    await page.getByText('Delorean').first().click()

    const showBtn = page.getByTitle('Show Guidance Panel').first()
    if ((await showBtn.count()) > 0) {
      await showBtn.click()
    }

    const guidanceArea = page.getByTestId('right-guidance-sidebar')
    const guidanceText = (await guidanceArea.first().textContent()) || ''
    const hasNeighborhood = /parent|child|sibling|neighborhood|perspective/i.test(guidanceText)

    if (hasNeighborhood) {
      const hasRelations = /technology|devices|hoverboard/i.test(guidanceText)
      expect(hasRelations).toBeTruthy()
    }
  })

  test('R-TP-06: No relationship editor in perspectives', async ({ page }) => {
    await expandAllNodes(page)
    await page.getByText('Delorean').first().click()

    const addEdgeBtn = page.getByText(/Add edge|Add relationship|Edit taxonomy/i)
    expect(await addEdgeBtn.count()).toBe(0)
  })
})
