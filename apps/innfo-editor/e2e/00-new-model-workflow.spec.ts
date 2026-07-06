import { test, expect } from '@playwright/test'
import { injectMockFileSystem } from './helpers/setup'
import { ModelerPage } from './helpers/ModelerPage'

test.describe('Flujo de Creación y Configuración de Nuevos Modelos', () => {
  // Configura este grupo en modo serial: si una prueba falla,
  // todas las siguientes pruebas dependientes se marcan como omitidas (skipped) automáticamente.
  test.describe.configure({ mode: 'serial' })

  let pageInstance: any
  let modeler: ModelerPage

  let ctx: any

  test.beforeAll(async ({ browser }) => {
    // Compartimos la misma página y estado a lo largo del flujo serial
    ctx = await browser.newContext()
    pageInstance = await ctx.newPage()
    modeler = new ModelerPage(pageInstance)
    await injectMockFileSystem(pageInstance, ctx)
  })

  test.afterAll(async () => {
    await pageInstance.close()
    await ctx.close()
  })

  test('Paso 1: Verificar la existencia del botón de creación por template y crear modelo vacío', async () => {
    await test.step('Dado que el usuario navega a la página principal', async () => {
      await modeler.goto()
    })

    await test.step('Cuando busca el botón "New from template" para iniciar un nuevo modelo', async () => {
      // Intentamos verificar que el botón existe y está visible.
      // Esta prueba va a fallar intencionalmente porque esta interfaz aún no está implementada en HomeView.vue.
      await expect(modeler.newFromTemplateButton).toBeVisible({ timeout: 5000 })
    })

    await test.step('Y hace clic en el botón para generar el espacio de trabajo basado en el template', async () => {
      await modeler.newFromTemplateButton.click()
      await pageInstance.waitForURL('**/workspace', { timeout: 10000 })
    })
  })

  test('Paso 2: Añadir un elemento al concepto recién creado en el nuevo modelo', async () => {
    // Esta prueba depende del paso 1. Al fallar el paso 1, Playwright no ejecutará este código.
    await test.step('Dado que el usuario está dentro del espacio de trabajo del nuevo modelo', async () => {
      await expect(modeler.modelHeading).toBeVisible()
    })

    await test.step('Cuando agrega el elemento "Delorean" al concepto "Vehículos"', async () => {
      // Simulación de interacción
      await pageInstance.click('[data-testid="add-element-button"]')
      await pageInstance.fill('[data-testid="element-name-input"]', 'Delorean')
    })
  })

  test('Paso 3: Guardar y verificar la persistencia y vista del block sheet', async () => {
    // Esta prueba también se omitirá automáticamente.
    await test.step('Cuando el usuario presiona guardar', async () => {
      await pageInstance.click('button:has-text("Save")')
    })

    await test.step('Entonces se debe visualizar el block sheet mostrando la descripción del elemento recién creado', async () => {
      const blockSheetTitle = pageInstance.locator('[data-testid="block-sheet-title"]')
      await expect(blockSheetTitle).toHaveText('Delorean')
    })
  })
})
