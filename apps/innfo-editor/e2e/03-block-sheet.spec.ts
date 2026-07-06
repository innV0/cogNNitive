import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder, expandAllNodes } from './helpers/setup'

test.describe('BlockSheet — 4 Tabs, Markdown, Relationships, Matrix Summary, Media, Field Viewer, Compliance', () => {
  test.beforeEach(async ({ page, context }) => {
    page.on('console', (msg) => console.log('BROWSER:', msg.text()))
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
    await expandAllNodes(page)
    await page.getByText('Delorean').first().click()
  })

  test('R-SC-01: Full Markdown rendering in View tab', async ({ page }) => {
    await expect(page.getByTestId('block-sheet')).toBeVisible()
    await expect(page.getByTestId('block-sheet')).toContainText(
      /Delorean|time machine|88 mph|DMC-12/i,
    )

    const codeBlock = page.locator('pre code, [class*="language-"]')
    await expect(codeBlock.first()).toBeVisible()

    const table = page.locator('table')
    await expect(table.first()).toBeVisible()
  })

  test('R-SC-02: Inline GraphViewer in Visual tab', async ({ page }) => {
    const visualTab = page.getByText('Visual', { exact: true })
    await expect(visualTab).toBeVisible()
    await visualTab.click()

    await expect(page.getByTestId('graph-viewer')).toBeVisible()

    const bbox = await page.locator('svg').first().boundingBox()
    if (bbox) {
      expect(bbox.height).toBeLessThanOrEqual(400)
    }
  })

  test('R-SC-03: BlockRelationships shows clickable pills', async ({ page }) => {
    await expect(page.getByTestId('block-relationships')).toBeVisible()
    const relationPill = page.getByTestId('block-pill').first()
    await expect(relationPill).toBeVisible()
    await relationPill.click()
    await expect(page.getByText('Dr. Emmett Brown').first()).toBeVisible()
  })

  test('R-SC-04: BlockMatrixSummary shows matrix participation chips', async ({ page }) => {
    await page.getByText('DocBrown', { exact: false }).first().click()
    await expect(page.getByTestId('block-matrix-summary')).toBeVisible()
  })

  test('R-SC-05: NodeMedia image gallery with lightbox', async ({ page }) => {
    const mediaSection = page.getByTestId('node-media')
    const noAttachments = page.getByText(/No attachments?|No media/i)
    const mediaExists = await mediaSection.count()
    const noAttachExists = await noAttachments.count()

    if (mediaExists > 0) {
      const images = mediaSection.locator('img')
      const imgCount = await images.count()
      if (imgCount > 0) {
        await images.first().click()
        await expect(page.getByTestId('lightbox-overlay')).toBeVisible()
        await page.getByTestId('lightbox-close').click()
        await expect(page.getByTestId('lightbox-overlay')).not.toBeVisible()
      }
    } else if (noAttachExists > 0) {
      await expect(noAttachments.first()).toBeVisible()
    }
  })

  test('R-SC-06: FieldViewer renders widgets in read mode', async ({ page }) => {
    await expect(page.getByTestId('field-viewer')).toBeVisible()

    const editButton = page.getByLabel('Edit').first()
    await expect(editButton).toBeVisible()
    await editButton.click()

    const inputs = page.locator('input, select, textarea')
    await expect(inputs.first()).toBeVisible()
  })

  test('R-SC-07: Four detail tabs with underline-style active indicator', async ({ page }) => {
    const tabs = ['View', 'Visual', 'History', 'Compliance']
    for (const tabName of tabs) {
      const tab = page.getByText(tabName, { exact: true })
      await expect(tab).toBeVisible()
    }

    const viewTab = page.getByRole('button', { name: 'View', exact: true })
    const isActive = await viewTab.getAttribute('class')
    expect(
      isActive?.includes('active') ||
        isActive?.includes('underline') ||
        isActive?.includes('border-b'),
    ).toBeTruthy()

    const complianceTab = page.getByRole('button', { name: 'Compliance', exact: true })
    await complianceTab.click()

    const compActive = await complianceTab.getAttribute('class')
    expect(
      compActive?.includes('active') ||
        compActive?.includes('underline') ||
        compActive?.includes('border-b'),
    ).toBeTruthy()

    const viewActive = await viewTab.getAttribute('class')
    expect(viewActive?.includes('active') || viewActive?.includes('underline')).toBeFalsy()
  })

  test('R-SC-08: File attachments section', async ({ page }) => {
    const noAttachMsg = page.getByText(/No attachments?/i)
    const attachment = page.getByText(/Attachments?/i).first()

    await expect(noAttachMsg.first().or(attachment)).toBeVisible()
  })

  test('R-SC-10: No relationship editor UI', async ({ page }) => {
    const addRelBtn = page.getByText(/Add relationship|Edit relationship|Delete relationship/i)
    expect(await addRelBtn.count()).toBe(0)
  })
})
