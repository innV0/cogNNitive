import { defineStore } from 'pinia'
import { useModelStore } from './modelStore'
import { useUiStore } from './uiStore'
import { recursiveSerialize } from '../model/recursiveSerializer'
import {
  parseFormatFilename,
  buildFormatFilename,
  bumpVersion,
  formatVersionString,
} from '../utils/version'
import { IndexedDbWorkspaceRepository } from '../repositories/IndexedDbWorkspaceRepository'
import type { IWorkspaceRepository } from '../repositories/IWorkspaceRepository'
import { useUrlDocLoader } from '../composables/useUrlDocLoader'
import type { DirectoryHandleLike } from '../model/fs-types'
import type { BumpLevel } from '../utils/version'
import type { ModelDriver } from '@innv0/innfo-core'
import type { ActiveView } from './uiStore'

export type { DirectoryHandleLike }

export interface WorkspaceState {
  handle: DirectoryHandleLike | null
  driver: ModelDriver | null
  hasHandle: boolean
  isParsing: boolean
  hasParsed: boolean
  parseCount: number
  saving: boolean
  error: string | null
  /** URL from which the current document was loaded (null when loaded via handle). */
  sourceUrl: string | null
  /** Whether auto-backup is enabled before saveActiveFile writes. Default true. */
  backupEnabled: boolean
  repository: IWorkspaceRepository
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
    sourceUrl: null,
    backupEnabled: true,
    repository: new IndexedDbWorkspaceRepository(),
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
        await this.repository.storeHandle(handle)
        const modelStore = useModelStore()
        await modelStore.parseFromHandle(handle, this.driver ?? undefined)
        this.hasParsed = true
        this.parseCount += 1

        // Persist session state after successful parse
        const rootId = modelStore.rootIds[0]
        if (rootId) {
          const rootNode = modelStore.getNode(rootId)
          if (rootNode?.source.path) {
            this.repository.setSessionState('lastFile', rootNode.source.path).catch(() => {})
          }
        }
        this.repository.setSessionState('lastOpenedAt', new Date().toISOString()).catch(() => {})
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        throw err
      } finally {
        this.isParsing = false
      }
    },

    /**
     * Loads a FORMAT model document from a URL into modelStore as a virtual
     * workspace (no File System handle — save is disabled).
     *
     * Sets `handle` to null and `hasHandle` to false; the router guard will
     * block navigation to /workspace unless the caller sets hasHandle or
     * bypasses the guard.
     */
    async loadFromUrl(url: string): Promise<void> {
      this.error = null
      this.sourceUrl = url

      // Reset handle so router guards know this is a virtual workspace
      this.handle = null
      this.hasHandle = false

      if (this.isParsing) return
      this.isParsing = true

      try {
        const { loadIntoStore } = useUrlDocLoader()
        const result = await loadIntoStore(url)

        if (result.error) {
          this.error = result.error
          throw new Error(result.error)
        }

        this.hasParsed = true
        this.parseCount += 1
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        throw err
      } finally {
        this.isParsing = false
      }
    },

    /** Enables or disables the auto-backup behaviour on save. */
    enableBackup(val: boolean): void {
      this.backupEnabled = val
    },

    /** Shorthand for `enableBackup(false)`. */
    disableBackup(): void {
      this.backupEnabled = false
    },

    /** Attempts to recover a previously granted handle from IndexedDB on boot. */
    async recoverHandle(): Promise<DirectoryHandleLike | null> {
      const handle = await this.repository.loadStoredHandle()
      if (handle) {
        this.handle = handle
        this.hasHandle = true

        // Restore uiStore state from persisted session
        try {
          const session = await this.repository.getSessionState()
          const uiStore = useUiStore()
          if (session.selectedNodeId && typeof session.selectedNodeId === 'string') {
            uiStore.selectNode(session.selectedNodeId)
          }
          if (session.activeView && typeof session.activeView === 'string') {
            uiStore.setActiveView(session.activeView as ActiveView)
          }
        } catch {
          // Session restoration is best-effort
        }
      }
      return handle
    },

    /**
     * Persists a single tree node's expansion state to IndexedDB.
     */
    async persistTreeState(nodeId: string, collapsed: boolean): Promise<void> {
      await this.repository.setTreeState(nodeId, collapsed)
    },

    /**
     * Restores the full tree state map from IndexedDB.
     * Returns a Map<nodeId, collapsed> — nodes not present default to expanded.
     */
    async restoreTreeState(): Promise<Map<string, boolean>> {
      return await this.repository.getTreeState()
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
      this.sourceUrl = null
      this.backupEnabled = true
    },

    /**
     * Creates a backup of the root node's content before saving.
     * Writes to `backups/{YYYY-MM-DD_HHmmss}_{original-basename}.md`.
     * Non-blocking: failure is logged but does NOT prevent the save.
     *
     * Marked with `_` prefix (not `#`) because esbuild/vitest does not
     * transpile JavaScript private fields in Pinia option-store targets.
     */
    async _createBackup(): Promise<void> {
      if (!this.handle) return

      const modelStore = useModelStore()
      const rootId = modelStore.rootIds[0]
      if (!rootId) return

      const rootNode = modelStore.getNode(rootId)
      if (!rootNode?.rawContent) return

      // Only backup when dirty
      if (!modelStore.dirtyIds.has(rootId)) return

      try {
        const now = new Date()
        const ts =
          `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_` +
          `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

        const basename = rootNode.source.path.split('/').pop() ?? 'document'
        const backupName = `${ts}_${basename}`

        // Ensure backups/ subdirectory exists
        let backupsDir: DirectoryHandleLike
        try {
          backupsDir = await this.handle.getDirectoryHandle('backups', { create: true })
        } catch {
          console.warn('[backup] Could not create backups/ directory')
          return
        }

        const fileHandle = await backupsDir.getFileHandle(backupName, { create: true })
        if (!fileHandle.createWritable) {
          console.warn('[backup] File handle does not support writing')
          return
        }

        const writable = await fileHandle.createWritable()
        await writable.write(rootNode.rawContent)
        await writable.close()
      } catch (err) {
        // Non-blocking: backup failure must not prevent the save
        console.warn('[backup] Failed to create backup:', err)
      }
    },

    /**
     * Serializes all dirty nodes and writes them back to disk via
     * recursiveSerialize. Clears dirty flags on success.
     *
     * When `backupEnabled` is true (default), creates a timestamped backup
     * of the root node before writing.
     */
    async saveActiveFile(): Promise<void> {
      if (!this.handle) throw new Error('No workspace handle')
      this.saving = true
      try {
        // Non-blocking backup before write
        if (this.backupEnabled) {
          await this._createBackup()
        }

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
