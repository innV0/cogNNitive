import { defineStore } from 'pinia'
import { useModelStore } from './modelStore'
import { recursiveSerialize } from '../model/recursiveSerializer'
import { parseFormatFilename, buildFormatFilename, bumpVersion, formatVersionString } from '../utils/version'
import type { DirectoryHandleLike } from '../model/fs-types'
import type { BumpLevel } from '../utils/version'
import type { ModelDriver } from '@innv0/format-core'

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
  driver: ModelDriver | null
  hasHandle: boolean
  isParsing: boolean
  hasParsed: boolean
  parseCount: number
  saving: boolean
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
    driver: null,
    hasHandle: false,
    isParsing: false,
    hasParsed: false,
    parseCount: 0,
    saving: false,
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
        await modelStore.parseFromHandle(handle, this.driver ?? undefined)
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
      this.driver = null
      this.hasHandle = false
      this.isParsing = false
      this.hasParsed = false
      this.parseCount = 0
      this.saving = false
      this.error = null
    },

    /**
     * Serializes all dirty nodes and writes them back to disk via
     * recursiveSerialize. Clears dirty flags on success.
     */
    async saveActiveFile(): Promise<void> {
      if (!this.handle) throw new Error('No workspace handle')
      this.saving = true
      try {
        const modelStore = useModelStore()
        await recursiveSerialize(modelStore.nodes, modelStore.dirtyIds, this.driver ?? undefined)
        // Clear dirty flags after successful write
        for (const id of Array.from(modelStore.dirtyIds)) {
          modelStore.clearDirty(id)
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        throw err
      } finally {
        this.saving = false
      }
    },

    /**
     * Saves the active file under a new version-bumped filename, then
     * persists all dirty nodes. The original file is NOT deleted.
     */
    async saveActiveFileWithVersionBump(level: BumpLevel): Promise<void> {
      if (!this.handle) throw new Error('No workspace handle')

      const modelStore = useModelStore()
      const rootId = modelStore.rootIds[0]
      const rootNode = modelStore.getNode(rootId)
      if (!rootNode) throw new Error('No root node found for version bump')

      const parsed = parseFormatFilename(rootNode.source.path)
      if (!parsed) throw new Error('Could not parse filename for version bump')

      const newVersion = bumpVersion(parsed.version, level)
      const newFilename = buildFormatFilename(parsed.baseName, parsed.templateName, newVersion)
      const versionStr = formatVersionString(newVersion)

      // Create the new file and write current content
      const newFileHandle = await this.handle.getFileHandle(newFilename, { create: true })
      if (!newFileHandle.createWritable) {
        throw new Error(`New file handle "${newFilename}" does not support writing`)
      }
      const writable = await newFileHandle.createWritable()
      await writable.write(rootNode.rawContent ?? '')
      await writable.close()

      // Update the root node's in-memory frontmatter version
      if (rootNode.rawContent) {
        rootNode.rawContent = rootNode.rawContent.replace(
          /^(model_version|version):\s*"V_\d+-\d+-\d+"/m,
          `$1: "${versionStr}"`,
        )
      }

      // Update the root node's source path
      rootNode.source.path = newFilename

      // Mark root node dirty so saveActiveFile persists changes
      modelStore.markDirty(rootId)

      // Persist all dirty nodes (including the updated root)
      await this.saveActiveFile()
    },
  },
})
