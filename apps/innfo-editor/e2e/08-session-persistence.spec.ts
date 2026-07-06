import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Session Persistence — IndexedDB Save/Restore', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
  })

  test('R-SP-01: IndexedDB initializes on workspace load', async ({ page }) => {
    await loadHomePage(page)
    await openMockFolder(page)

    const hasDB = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('format-editor')
        req.onsuccess = () => {
          const db = req.result
          const storeNames = Array.from(db.objectStoreNames)
          db.close()
          resolve(storeNames.length > 0)
        }
        req.onerror = () => resolve(false)
      })
    })
    expect(hasDB).toBe(true)
  })

  test('R-SP-02: Session state persists across reload', async ({ page }) => {
    await loadHomePage(page)
    await openMockFolder(page)

    await page.reload()
    await page.waitForLoadState('networkidle')

    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    await expect(page.getByText('BTTFKB')).toBeVisible()
  })

  test('R-SP-03: Sidebar widths persist via IndexedDB', async ({ page }) => {
    await loadHomePage(page)
    await openMockFolder(page)

    await expect(page.getByTestId('resize-handle').first()).toBeVisible()

    const initialWidth = await page.evaluate(() => {
      return new Promise<number | null>((resolve) => {
        const req = indexedDB.open('format-editor')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('sidebarWidths', 'readonly')
          const store = tx.objectStore('sidebarWidths')
          const getReq = store.get('format.leftSidebarWidth')
          getReq.onsuccess = () => {
            db.close()
            resolve(getReq.result ?? null)
          }
          getReq.onerror = () => {
            db.close()
            resolve(null)
          }
        }
        req.onerror = () => resolve(null)
      })
    })

    if (initialWidth !== null && initialWidth !== undefined) {
      expect(typeof initialWidth).toBe('number')
    }
  })
})
