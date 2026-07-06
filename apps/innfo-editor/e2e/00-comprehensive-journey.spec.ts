import { test, expect } from '@playwright/test'
import { injectMockFileSystem } from './helpers/setup'
import { ModelerPage } from './helpers/ModelerPage'

test.describe('Flujo de Negocio Completo: Edición, Guardado y Validación', () => {
  // Configura este grupo en modo serial: si un paso intermedio falla,
  // todas las pruebas posteriores que dependen de este paso se marcarán como omitidas (skipped).
  test.describe.configure({ mode: 'serial' })

  let pageInstance: any
  let modeler: ModelerPage

  let ctx: any

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext()
    pageInstance = await ctx.newPage()
    modeler = new ModelerPage(pageInstance)
    await injectMockFileSystem(pageInstance, ctx)
  })

  test.afterAll(async () => {
    await pageInstance.close()
    await ctx.close()
  })

  test('Paso 1: Abrir la aplicación y cargar el espacio de trabajo de prueba', async () => {
    await test.step('Dado que el usuario navega a la página principal', async () => {
      await modeler.goto()
    })

    await test.step('Cuando hace clic en "Open folder" para cargar la carpeta mockeada', async () => {
      await modeler.openFolderButton.click()
    })

    await test.step('Entonces es redirigido a la vista de workspace y se cargan los nodos', async () => {
      await pageInstance.waitForURL('**/workspace', { timeout: 15000 })
      await expect(modeler.treeRootNode.first()).toBeVisible({ timeout: 15000 })
    })
  })

  test('Paso 2: Navegar por el árbol y seleccionar el elemento "Delorean"', async () => {
    // Depende del Paso 1. Si no hay nodos cargados o el Paso 1 falló, este test se omite.
    await test.step('Dado que el árbol de conceptos está cargado', async () => {
      // Hacemos clic en Expand All
      const expandBtn = pageInstance.getByTitle('Expand All').first()
      await expect(expandBtn).toBeVisible({ timeout: 5000 })
      await expandBtn.click()
    })

    await test.step('Cuando el usuario hace clic en el elemento "Delorean" del árbol', async () => {
      const deloreanNode = pageInstance.getByText('Delorean').first()
      await expect(deloreanNode).toBeVisible({ timeout: 5000 })
      await deloreanNode.click()
    })

    await test.step('Entonces se debe abrir el panel BlockSheet mostrando la información del elemento', async () => {
      const blockSheet = pageInstance.getByTestId('block-sheet')
      await expect(blockSheet).toBeVisible()
      await expect(blockSheet).toContainText(/DeLorean/i)
    })
  })

  test('Paso 3: Entrar en modo edición, modificar la descripción y guardar los cambios', async () => {
    // Depende del Paso 2.
    await test.step('Dado que el BlockSheet de "Delorean" está visible', async () => {
      await expect(pageInstance.getByTestId('block-sheet')).toBeVisible()
    })

    await test.step('Cuando el usuario hace clic en el botón de edición (lápiz)', async () => {
      const editBtn = pageInstance.getByTestId('block-sheet').getByRole('button', { name: 'Edit' })
      await expect(editBtn).toBeVisible()
      await editBtn.click()
    })

    await test.step('Y modifica la descripción del elemento', async () => {
      const textarea = pageInstance.locator('textarea')
      await expect(textarea).toBeVisible()
      await textarea.fill('DeLorean DMC-12 time machine updated.')
    })

    await test.step('Y hace clic en el botón de confirmación (check) para guardar', async () => {
      const saveBtn = pageInstance.getByTestId('block-sheet').getByRole('button', { name: 'Edit' }) // El mismo botón cambia de lápiz a check
      await saveBtn.click()
    })

    await test.step('Entonces los cambios deben ser guardados y reflejarse en la vista de lectura', async () => {
      const blockSheet = pageInstance.getByTestId('block-sheet')
      await expect(blockSheet).toContainText('DeLorean DMC-12 time machine updated.')
    })
  })

  test('Paso 4: Abrir la pestaña de Compliance y verificar el estado de validación', async () => {
    // Depende del Paso 3.
    await test.step('Dado que el usuario guardó los cambios y sigue visualizando el elemento', async () => {
      await expect(pageInstance.getByTestId('block-sheet')).toBeVisible()
    })

    await test.step('Cuando hace clic en la pestaña "Compliance"', async () => {
      const complianceTabBtn = pageInstance.getByText('Compliance', { exact: true })
      await expect(complianceTabBtn).toBeVisible()
      await complianceTabBtn.click()
    })

    await test.step('Entonces se debe visualizar el reporte de cumplimiento y validaciones', async () => {
      const complianceTab = pageInstance.locator('[class*="compliance"], [id*="compliance"]')
      await expect(complianceTab.first()).toBeVisible()
    })
  })
})
