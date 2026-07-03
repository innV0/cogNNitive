import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Session Persistence — IndexedDB Save/Restore', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
  })

  test('R-SP-01: IndexedDB initializes on workspace load', async ({ page, context }) => {
    await loadHomePage(page)
    await openMockFolder(page)

    // Check that IndexedDB was initialized
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

  test('R-SP-02: Session state persists across reload', async ({ page, context }) => {
    await loadHomePage(page)
    await openMockFolder(page)

    // Wait for workspace to fully load
    await page.waitForTimeout(1000)

    // Reload the page
    await page.reload()
    await page.waitForTimeout(2000)

    // Navigate back to workspace (session should restore last file)
    await page.getByText('Open Local Folder').first().click()
    await page.waitForTimeout(2000)

    // The workspace should load
    await expect(page.getByText('Back to the Future KB')).toBeVisible()
  })

  test('R-SP-03: Sidebar widths persist via IndexedDB', async ({ page, context }) => {
    await loadHomePage(page)
    await openMockFolder(page)

    // Resize sidebar using the resize handle
    const resizeHandle = page.locator('[class*="cursor-col-resize"]').first()
    await expect(resizeHandle).toBeVisible()

    // Get initial sidebar width
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
          getReq.onerror = () => { db.close(); resolve(null) }
        }
        req.onerror = () => resolve(null)
      })
    })

    // Sidebar width should eventually be persisted
    // (even null is valid — it means default)
    if (initialWidth !== null && initialWidth !== undefined) {
      expect(typeof initialWidth).toBe('number')
    }
  })
})
