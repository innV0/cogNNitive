import { type Page, type Locator } from '@playwright/test'

export class ModelerPage {
  readonly page: Page
  readonly heading: Locator
  readonly openFolderButton: Locator
  readonly newFromTemplateButton: Locator // Hypothetical button for template creation
  readonly sampleModelsSection: Locator
  readonly sampleCards: Locator
  readonly treeRootNode: Locator
  readonly homeButton: Locator
  readonly modelHeading: Locator
  readonly viewSwitcherEditor: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /format-editor|innfo/i })
    this.openFolderButton = page.locator('button', { hasText: /Open folder/i }).first()
    this.newFromTemplateButton = page
      .locator('button', { hasText: /New from template|Crear modelo/i })
      .first()
    this.sampleModelsSection = page.getByText('Example models').or(page.getByText('Sample models'))
    this.sampleCards = page.locator('button').filter({ hasText: /items/i })
    this.treeRootNode = page.getByText('BTTFKB')
    this.homeButton = page.getByText('← Home').or(page.getByText(/Home/i))
    this.modelHeading = page.getByRole('heading', { name: 'Model', exact: true })
    this.viewSwitcherEditor = page.getByTestId('view-switcher-editor')
  }

  async goto() {
    await this.page.goto('/app/')
    await this.page.waitForLoadState('networkidle')
    await this.openFolderButton.waitFor({ state: 'visible', timeout: 10000 })
  }

  async openMockFolder() {
    await this.openFolderButton.click()
    await this.page.waitForURL('**/workspace', { timeout: 15000 })
    await this.treeRootNode.first().waitFor({ state: 'visible', timeout: 15000 })
  }
}
