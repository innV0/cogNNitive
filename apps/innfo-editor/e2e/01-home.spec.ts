import { test, expect } from '@playwright/test'
import { injectMockFileSystem } from './helpers/setup'
import { ModelerPage } from './helpers/ModelerPage'

test.describe('Home Page — Landing & Workspace Entry', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
  })

  test('R-TN-00: Home page loads with all entry points', async ({ page }) => {
    const modeler = new ModelerPage(page)

    await test.step('Dado que el usuario navega a la página de inicio', async () => {
      await modeler.goto()
    })

    await test.step('Entonces se debe mostrar el título principal', async () => {
      await expect(modeler.heading).toBeVisible()
    })

    await test.step('Y el botón para abrir carpeta local debe estar disponible', async () => {
      await expect(modeler.openFolderButton).toBeVisible({ timeout: 10000 })
      await expect(modeler.openFolderButton).toBeEnabled()
    })

    await test.step('Y se deben mostrar los modelos de ejemplo', async () => {
      await expect(modeler.sampleModelsSection).toBeVisible()
      expect(await modeler.sampleCards.count()).toBeGreaterThanOrEqual(1)
    })
  })

  test('Open folder loads workspace with tree', async ({ page }) => {
    const modeler = new ModelerPage(page)

    await test.step('Dado que el usuario abrió la aplicación', async () => {
      await modeler.goto()
    })

    await test.step('Cuando hace clic en "Open folder" para cargar el espacio de trabajo', async () => {
      await modeler.openFolderButton.click()
    })

    await test.step('Entonces es redirigido a la vista de workspace y se cargan los nodos del árbol', async () => {
      await page.waitForURL('**/workspace', { timeout: 15000 })
      await expect(modeler.treeRootNode.first()).toBeVisible({ timeout: 15000 })
    })

    await test.step('Y puede ver la opción de volver a Home', async () => {
      await expect(modeler.homeButton).toBeVisible()
    })
  })

  test('Workspace layout shows panels', async ({ page }) => {
    const modeler = new ModelerPage(page)

    await test.step('Dado que el usuario abrió la aplicación y cargó el espacio de trabajo de prueba', async () => {
      await modeler.goto()
      await modeler.openMockFolder()
    })

    await test.step('Entonces se debe visualizar el panel del Modelo', async () => {
      await expect(modeler.modelHeading).toBeVisible()
    })

    await test.step('Y el selector de vistas del editor debe estar visible', async () => {
      await expect(modeler.viewSwitcherEditor).toBeVisible()
    })
  })
})
