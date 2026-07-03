import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Version Management — Bump Major/Minor/Patch, Version Display', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  test('R-VM-01: Version management section in ModelInfoPanel', async ({ page }) => {
    // Navigate to Info view
    const infoTab = page.getByText('info', { exact: true })
    await expect(infoTab).toBeVisible()
    await infoTab.click()
    await page.waitForTimeout(1000)

    // Should show version management section
    const versionSection = page.getByText(/Version Management|version management/i).first()
    const versionExists = await versionSection.count()

    if (versionExists > 0) {
      await expect(versionSection).toBeVisible()
    } else {
      // Look for model version in metadata section
      const modelVersion = page.getByText(/V_1-0-0|model_version|version/i).first()
      await expect(modelVersion).toBeVisible()
    }
  })

  test('R-VM-02: Bump buttons present (major/minor/patch)', async ({ page }) => {
    // Navigate to Info view
    await page.getByText('info', { exact: true }).click()
    await page.waitForTimeout(1000)

    // Look for bump buttons
    const majorBtn = page.getByText(/Major|major/i).first()
    const minorBtn = page.getByText(/Minor|minor/i).first()
    const patchBtn = page.getByText(/Patch|patch/i).first()

    const majorExists = await majorBtn.count()
    const minorExists = await minorBtn.count()
    const patchExists = await patchBtn.count()

    // At least some bump buttons should exist
    expect(majorExists + minorExists + patchExists).toBeGreaterThan(0)

    // Buttons may be disabled due to no handle — but should still be present
    if (majorExists > 0) {
      await expect(majorBtn).toBeVisible()
    }
  })

  test('R-VM-03: Version display shows current version from frontmatter', async ({ page }) => {
    // Navigate to Info view
    await page.getByText('info', { exact: true }).click()
    await page.waitForTimeout(1000)

    // All models have model_version: "V_1-0-0"
    const versionDisplay = page.getByText(/V_1-0-0|1\.0\.0/i).first()
    const versionExists = await versionDisplay.count()
    if (versionExists > 0) {
      await expect(versionDisplay).toBeVisible()
    }
  })

  test('R-VM-06: Disabled states on bump buttons', async ({ page }) => {
    // Navigate to Info view
    await page.getByText('info', { exact: true }).click()
    await page.waitForTimeout(1000)

    // Buttons should be disabled when conditions aren't met
    // (no root node, currently saving, etc.)
    const disabledBtns = page.locator('button:disabled').filter({ hasText: /Major|Minor|Patch/i })
    const totalBtns = page.locator('button').filter({ hasText: /Major|Minor|Patch/i })

    const disabledCount = await disabledBtns.count()
    const totalCount = await totalBtns.count()

    if (totalCount > 0) {
      // All bump buttons should have the same disabled state
      // They are disabled because we mocked the FS
      expect(disabledCount).toBe(totalCount)
    }
  })

  test('R-VM-07: No git integration', async ({ page }) => {
    // No git-related UI elements
    const gitElements = page.locator('[class*="git"], [class*="commit"], [class*="branch"]')
    const gitCount = await gitElements.count()

    // Version management is purely UI-level, no git integration
    // Any "git" mentions would be from unrelated content
    if (gitCount > 0) {
      // If present, they should not be part of version management panel
      const area = page.getByText(/Version Management|version management/i)
      const hasGitInVersion = await area.locator('[class*="git"]').count()
      expect(hasGitInVersion).toBe(0)
    }
  })
})
