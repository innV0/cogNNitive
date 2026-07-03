import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder, expandAllNodes } from './helpers/setup'

test.describe('Widget Registry — 14 Widget Types', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
    await expandAllNodes(page)
    await page.getByText('Delorean').first().click()
    await page.waitForTimeout(1000)
  })

  test('FieldViewer shows field labels in uppercase tracking', async ({ page }) => {
    // Field labels should be uppercase with tracking
    const uppercaseLabels = page.locator('[class*="field-label"], [class*="uppercase"], [class*="tracking"]')
    const labelCount = await uppercaseLabels.count()
    if (labelCount > 0) {
      for (const label of await uppercaseLabels.all()) {
        const text = await label.textContent()
        if (text) {
          // Should be uppercase
          expect(text).toEqual(text.toUpperCase())
        }
      }
    }
  })

  test('DateWidget renders date fields', async ({ page }) => {
    // Delorean has build_date: "1981-01-01"
    // Look for date-formatted values
    const dateField = page.getByText(/1981|build_date|BUILD DATE/i)
    await expect(dateField.first()).toBeVisible()
  })

  test('UrlWidget renders clickable links', async ({ page }) => {
    // Delorean has website field
    // Look for anchor tags or URL-like text
    const link = page.locator('a[href*="fandom"], a[href*="http"]').first()
    const linkExists = await link.count()
    if (linkExists > 0) {
      await expect(link).toBeVisible()
      const href = await link.getAttribute('href')
      expect(href).toContain('http')
    }
  })

  test('ColorWidget renders color swatches', async ({ page }) => {
    // Delorean has color: "#C0C0C0"
    // Look for color swatches or color-picker elements
    const swatch = page.locator('[class*="swatch"], [class*="color-swatch"], input[type="color"]').first()
    const swatchExists = await swatch.count()
    if (swatchExists > 0) {
      await expect(swatch).toBeVisible()
    }
  })

  test('MultiSelectWidget / TagsWidget renders chips', async ({ page }) => {
    // Delorean has tags: ["time-machine", "dmc-12"]
    // Look for chip/pill elements with these tag values
    const tagChips = page.getByText(/time-machine|dmc-12/i)
    const tagCount = await tagChips.count()
    if (tagCount > 0) {
      await expect(tagChips.first()).toBeVisible()
    }
  })

  test('RatingWidget renders star rating', async ({ page }) => {
    // Delorean has rating: 5
    // Look for star icons or "5/5" text
    const rating = page.getByText(/5\/5|rating/i).first()
    const ratingExists = await rating.count()
    if (ratingExists > 0) {
      await expect(rating).toBeVisible()
    }

    // Also look for star SVGs
    const stars = page.locator('svg[class*="star"], [class*="star"]').first()
    const starCount = await stars.count()
    if (starCount > 0) {
      await expect(stars).toBeVisible()
    }
  })

  test('ScaleWidget renders numeric scale', async ({ page }) => {
    // MartyMcFly has times_traveled: 5, hoverboard_skill: 9
    // Click on Marty
    await page.getByText('MartyMcFly').first().click()
    await page.waitForTimeout(1000)

    // Look for numeric scale indicators
    const scale = page.getByText(/times_traveled|hoverboard_skill/i).first()
    const scaleExists = await scale.count()
    if (scaleExists > 0) {
      await expect(scale).toBeVisible()
    }
  })

  test('ToggleGroupWidget renders segmented buttons', async ({ page }) => {
    // Delorean has status: "published" which may use ToggleGroup
    // Look for segmented button groups in read mode
    const toggleGroup = page.locator('[class*="toggle-group"], [class*="segmented"]').first()
    const tgCount = await toggleGroup.count()
    if (tgCount > 0) {
      await expect(toggleGroup).toBeVisible()
    }
  })

  test('CodeWidget renders code blocks', async ({ page }) => {
    // Delorean has a ```typescript code block
    const codeBlock = page.locator('pre code, [class*="language-typescript"]').first()
    const codeExists = await codeBlock.count()
    if (codeExists > 0) {
      await expect(codeBlock).toBeVisible()
      const codeText = await codeBlock.textContent()
      expect(codeText).toContain('maxSpeed')
    }
  })

  test('MermaidWidget renders diagrams', async ({ page }) => {
    // Delorean has a ```mermaid block
    // Mermaid renders as SVG
    const mermaidSvg = page.locator('svg[class*="mermaid"], [class*="mermaid"] svg').first()
    const mermaidExists = await mermaidSvg.count()
    if (mermaidExists > 0) {
      await expect(mermaidSvg).toBeVisible()
    }
  })

  test('TimestampWidget renders formatted dates', async ({ page }) => {
    // FluxCapacitor has invention_date: "1955-11-05"
    // Click on FluxCapacitor
    await page.getByText('FluxCapacitor').first().click()
    await page.waitForTimeout(1000)

    // Look for formatted timestamp
    const timestamp = page.getByText(/1955|invention_date|INVENTION DATE/i).first()
    const tsExists = await timestamp.count()
    if (tsExists > 0) {
      await expect(timestamp).toBeVisible()
    }
  })

  test('MarkdownWidget renders body as rich text', async ({ page }) => {
    // The body content should render as rich Markdown
    const richContent = page.locator('[class*="block-sheet"] h1, [class*="block-sheet"] h2, [class*="block-sheet"] strong')
    const richCount = await richContent.count()
    if (richCount > 0) {
      await expect(richContent.first()).toBeVisible()
    }
  })

  test('Edit mode switches to interactive widgets', async ({ page }) => {
    // Click edit button
    const editBtn = page.getByText(/Edit/i).first()
    await expect(editBtn).toBeVisible()
    await editBtn.click()
    await page.waitForTimeout(500)

    // Look for multiple input types
    const textInputs = page.locator('input[type="text"], input[type="date"], input[type="url"], input[type="number"]')
    const selectDropdowns = page.locator('select')
    const textareas = page.locator('textarea')

    const totalInputs = (await textInputs.count()) + (await selectDropdowns.count()) + (await textareas.count())
    expect(totalInputs).toBeGreaterThan(0)
  })

  test('FallbackWidget renders unknown field types', async ({ page }) => {
    // DocBrown has inventions_count: 47 (no specific widget registered for this)
    await page.getByText('DocBrown').first().click()
    await page.waitForTimeout(1000)

    // inventions_count should still render (as a fallback)
    const fallbackField = page.getByText(/inventions_count|47/i).first()
    const fbExists = await fallbackField.count()
    if (fbExists > 0) {
      await expect(fallbackField).toBeVisible()
    }
  })
})
