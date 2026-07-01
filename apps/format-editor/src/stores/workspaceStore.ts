import { defineStore } from 'pinia'
import { useModelStore } from './modelStore'
import type { DirectoryHandleLike } from '../model/fs-types'

export type { DirectoryHandleLike }

const DB_NAME = 'format-editor'
const DB_VERSION = 1
const STORE_NAME = 'handles'
const HANDLE_KEY = 'workspaceRoot'

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolveDb, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolveDb(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function storeHandle(handle: DirectoryHandleLike): Promise<void> {
  const db = await openHandleDb()
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY)
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
  db.close()
}

async function loadStoredHandle(): Promise<DirectoryHandleLike | null> {
  const db = await openHandleDb()
  const handle = await new Promise<DirectoryHandleLike | null>((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY)
    req.onsuccess = () => res((req.result as DirectoryHandleLike) ?? null)
    req.onerror = () => rej(req.error)
  })
  db.close()
  return handle
}

export interface WorkspaceState {
  handle: DirectoryHandleLike | null
  hasHandle: boolean
  isParsing: boolean
  hasParsed: boolean
  parseCount: number
  error: string | null
}

/**
 * workspaceStore owns the FS directory handle, permission verification,
 * and IndexedDB handle recovery. `open()` is the single entry point that
 * triggers exactly one parse pass into modelStore (R1) — repeated calls
 * or route navigation must not re-parse.
 */
export const useWorkspaceStore = defineStore('workspace', {
  state: (): WorkspaceState => ({
    handle: null,
    hasHandle: false,
    isParsing: false,
    hasParsed: false,
    parseCount: 0,
    error: null,
  }),
  actions: {
    /**
     * Opens a workspace from a directory handle and runs exactly one parse
     * pass into modelStore. Calling this again with hasParsed already true
     * is a no-op unless `force` is explicitly passed.
     */
    async open(handle: DirectoryHandleLike, options: { force?: boolean } = {}): Promise<void> {
      this.handle = handle
      this.hasHandle = true
      this.error = null

      if (this.hasParsed && !options.force) {
        return
      }
      if (this.isParsing) {
        return
      }

      this.isParsing = true
      try {
        await storeHandle(handle)
        const modelStore = useModelStore()
        await modelStore.parseFromHandle(handle)
        this.hasParsed = true
        this.parseCount += 1
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        throw err
      } finally {
        this.isParsing = false
      }
    },

    /** Attempts to recover a previously granted handle from IndexedDB on boot. */
    async recoverHandle(): Promise<DirectoryHandleLike | null> {
      const handle = await loadStoredHandle()
      if (handle) {
        this.handle = handle
        this.hasHandle = true
      }
      return handle
    },

    reset(): void {
      this.handle = null
      this.hasHandle = false
      this.isParsing = false
      this.hasParsed = false
      this.parseCount = 0
      this.error = null
    },
  },
})
