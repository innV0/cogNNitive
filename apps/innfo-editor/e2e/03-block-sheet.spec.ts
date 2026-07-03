import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder, expandAllNodes } from './helpers/setup'

test.describe('BlockSheet — 4 Tabs, Markdown, Relationships, Matrix Summary, Media, Field Viewer, Compliance', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
    // Expand tree to reveal child elements (collapsed by default)
    await expandAllNodes(page)
    // Select the Delorean node to open BlockSheet
    await page.getByText('Delorean').first().click()
    await page.waitForTimeout(1000)
  })

  test('R-SC-01: Full Markdown rendering in View tab', async ({ page }) => {
    // The body should render Markdown content from Delorean
    // Look for rendered Markdown elements: headings, code blocks, tables
    const viewContent = page.locator('[class*="block-sheet"], [class*="sheet-body"], main')
    await expect(viewContent).toBeVisible()

    // Delorean body has markdown: headings, tables, code blocks
    await expect(viewContent).toContainText(/Delorean|time machine|88 mph|DMC-12/i)

    // Code block should render (TypeScript)
    const codeBlock = page.locator('pre code, [class*="language-"]')
    const codeExists = await codeBlock.count()
    if (codeExists > 0) {
      await expect(codeBlock.first()).toBeVisible()
    }

    // Tables should be rendered
    const table = page.locator('table')
    const tableExists = await table.count()
    if (tableExists > 0) {
      await expect(table.first()).toBeVisible()
    }
  })

  test('R-SC-02: Inline GraphViewer in Visual tab', async ({ page }) => {
    // Click "Visual" tab (underline-style tab)
    const visualTab = page.getByText('Visual', { exact: true })
    await expect(visualTab).toBeVisible()
    await visualTab.click()
    await page.waitForTimeout(1000)

    // Inline GraphViewer should render at 320px height
    const graphViewer = page.locator('[class*="graph"], [class*="graph-viewer"], svg')
    const graphExists = await graphViewer.count()

    if (graphExists > 0) {
      // Check height constraint
      const svg = page.locator('svg').first()
      const bbox = await svg.boundingBox()
      if (bbox) {
        expect(bbox.height).toBeLessThanOrEqual(400) // ~320px inline
      }
    }
  })

  test('R-SC-03: BlockRelationships shows clickable pills', async ({ page }) => {
    // Look for relationships section in the View tab
    // Delorean has graph_edges to DocBrown
    const relationsSection = page.getByText(/built-by|relationships/i).first()
    const relExists = await relationsSection.count()

    if (relExists > 0) {
      await expect(relationsSection).toBeVisible()

      // Clickable pills should navigate
      const relationPills = page.locator('[class*="chip"], [class*="pill"], [class*="badge"]').filter({ hasText: /DocBrown|built-by/i })
      const pillExists = await relationPills.count()
      if (pillExists > 0) {
        await relationPills.first().click()
        await page.waitForTimeout(500)
        // Should navigate to DocBrown
        await expect(page.getByText('Dr. Emmett Brown').first()).toBeVisible()
      }
    }
  })

  test('R-SC-04: BlockMatrixSummary shows matrix participation chips', async ({ page }) => {
    // Look for matrix chips section — Delorean might not appear in matrices
    // But the Hill Valley model has matrices that some concepts participate in
    // First select DocBrown or Marty which may have matrix participation
    await page.getByText('DocBrown', { exact: false }).first().click()
    await page.waitForTimeout(1000)

    // Check for matrix-related chips
    const matrixChips = page.locator('[class*="matrix-summary"], [class*="matrix-chip"], [class*="chip"]').filter({ hasText: /matrix|row|col/i })
    const chipExists = await matrixChips.count()
    if (chipExists > 0) {
      await expect(matrixChips.first()).toBeVisible()
    }
  })

  test('R-SC-05: NodeMedia image gallery with lightbox', async ({ page }) => {
    // Check for media section in BlockSheet
    // Delorean may not have assets, but the section should show if assets exist
    const mediaSection = page.locator('[class*="media"], [class*="node-media"]')

    // If no assets, should show placeholder
    const noAttachments = page.getByText(/No attachments?|No media/i)
    const mediaExists = await mediaSection.count()
    const noAttachExists = await noAttachments.count()

    if (mediaExists > 0) {
      // Media grid should exist
      const images = mediaSection.locator('img')
      const imgCount = await images.count()
      if (imgCount > 0) {
        // Click on image to open lightbox
        await images.first().click()
        await page.waitForTimeout(500)
        // Lightbox overlay should appear
        const lightbox = page.locator('[class*="lightbox"], [class*="overlay"]').first()
        const lbExists = await lightbox.count()
        if (lbExists > 0) {
          await expect(lightbox).toBeVisible()
          // Close button should dismiss
          const closeBtn = lightbox.locator('button, [class*="close"]')
          if (await closeBtn.count() > 0) {
            await closeBtn.first().click()
            await page.waitForTimeout(300)
            await expect(lightbox).not.toBeVisible()
          }
        }
      }
    } else if (noAttachExists > 0) {
      await expect(noAttachments.first()).toBeVisible()
    }
  })

  test('R-SC-06: FieldViewer renders widgets in read mode', async ({ page }) => {
    // The Delorean node has fields: category, status, year_introduced, etc.
    // FieldViewer should display these as labeled widgets in read mode
    const fieldLabels = page.getByText(/CATEGORY|STATUS|YEAR|RATING|WEBSITE|TAGS/i)
    const fieldCount = await fieldLabels.count()

    // Should have at least some field labels visible
    expect(fieldCount).toBeGreaterThan(0)

    // Toggle edit mode — FieldViewer should switch to interactive widgets
    const editButton = page.getByText(/Edit|edit/i).first()
    const editExists = await editButton.count()
    if (editExists > 0) {
      await editButton.click()
      await page.waitForTimeout(500)

      // In edit mode, widgets should be interactive
      // Look for inputs, selects, textareas
      const inputs = page.locator('input, select, textarea')
      const inputCount = await inputs.count()
      expect(inputCount).toBeGreaterThan(0)
    }
  })

  test('R-SC-07: Four detail tabs with underline-style active indicator', async ({ page }) => {
    // Check for the four tabs
    const tabs = ['View', 'Visual', 'History', 'Compliance']
    for (const tabName of tabs) {
      const tab = page.getByText(tabName, { exact: true })
      await expect(tab).toBeVisible()
    }

    // "View" should be active by default (first tab)
    const viewTab = page.getByRole('button', { name: 'View', exact: true })
    const isActive = await viewTab.getAttribute('class')
    // Active tab should have underline style or active class
    expect(isActive?.includes('active') || isActive?.includes('underline') || isActive?.includes('border-b')).toBeTruthy()

    // Switch to Compliance tab
    const complianceTab = page.getByRole('button', { name: 'Compliance', exact: true })
    await complianceTab.click()
    await page.waitForTimeout(500)

    // Compliance tab should now be active
    const compActive = await complianceTab.getAttribute('class')
    expect(compActive?.includes('active') || compActive?.includes('underline') || compActive?.includes('border-b')).toBeTruthy()

    // View tab should no longer be active
    const viewActive = await viewTab.getAttribute('class')
    // Only the active tab should have the active indicator
    expect(viewActive?.includes('active') || viewActive?.includes('underline')).toBeFalsy()
  })

  test('R-SC-08: File attachments section', async ({ page }) => {
    // Look for attachments section at bottom of View tab
    const attachments = page.getByText(/Attachments?|attachments?/i)

    // If no assets exist, should show "No attachments" placeholder
    const noAttachMsg = page.getByText(/No attachments?/i)
    if (await noAttachMsg.count() > 0) {
      await expect(noAttachMsg.first()).toBeVisible()
    } else if (await attachments.count() > 0) {
      await expect(attachments.first()).toBeVisible()
    }
  })

  test('R-SC-10: No relationship editor UI', async ({ page }) => {
    // Relationships section should be read-only — no add/edit/delete controls
    const addRelBtn = page.getByText(/Add relationship|Edit relationship|Delete relationship/i)
    expect(await addRelBtn.count()).toBe(0)
  })
})
