<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '../stores/workspaceStore'
import type { DirectoryHandleLike } from '../model/fs-types'
import type { FolderHistoryEntry, SampleFolder } from '../shared/validation-types'
import {
  loadHistory,
  addToHistory,
  removeFromHistory,
  clearHistory,
  getStoredHandle,
  formatTimestamp,
} from '../stores/historyStore'

const router = useRouter()
const workspace = useWorkspaceStore()
const error = ref<string | null>(null)
const busy = ref(false)
const history = ref<FolderHistoryEntry[]>([])
const reopenBusy = ref<string | null>(null)

const samples: SampleFolder[] = [
  {
    id: 'sample-ghostbusters',
    name: 'Ghostbusters',
    description: 'FILE-mode business model for a fictional ghost-catching franchise: SWOT, risks, market segments, finance, legal, and operations in a single _NN.md.',
    mode: 'FILE',
    path: 'specs/business_V_0-1-1/samples/Ghostbusters_V_0-1-2_business_F.md',
    items: 1,
  },
  {
    id: 'sample-music-history',
    name: 'Music History',
    description: 'FOLDER-mode catalog with 4 genres, 6 artists, and 5 albums — each node is a folder with its own _NN.md, demonstrating the full nested tree.',
    mode: 'FOLDER',
    path: 'specs/catalog_V_0-1-2/samples/Music_History_V_1-0-0_catalog/',
    items: 15,
  },
  {
    id: 'sample-code-review',
    name: 'Code Review Process',
    description: 'FILE-mode procedure for PR-based code reviews: roles (Author, Reviewer, Maintainer), step-by-step workflow, tool bindings, and hotfix path.',
    mode: 'FILE',
    path: 'specs/procedures_V_0-1-1/samples/CodeReviewProcess_V_1-0-0_procedures_F.md',
    items: 1,
  },
  {
    id: 'sample-teamkb',
    name: 'Team Knowledge Base',
    description: 'FOLDER-mode KB root node ready for Persona, Topic, and Reference concept folders — the starting point for a team documentation base.',
    mode: 'FOLDER',
    path: 'archive/2026-07-02/models/TeamKB_V_0-1-1_kb/',
    items: 1,
  },
]

onMounted(async () => {
  history.value = await loadHistory()
})

// ── Drag-drop state (optional affordance, 2.5) ──
const isDragging = ref(false)
function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}
function onDragLeave() {
  isDragging.value = false
}
async function onDrop(_e: DragEvent) {
  isDragging.value = false
  // Drag-and-drop does not provide File System Access API handles.
  // Fall through to the picker flow.
  await openWorkspace()
}

/**
 * Entry point: prompts the user for a workspace directory via the File System
 * Access API, runs the single parse pass through workspaceStore.open(), and
 * navigates to the workspace view.
 */
async function openWorkspace(): Promise<void> {
  error.value = null
  const picker = (window as unknown as {
    showDirectoryPicker?: () => Promise<DirectoryHandleLike>
  }).showDirectoryPicker
  if (!picker) {
    error.value = 'This browser does not support the File System Access API. Use Chrome or Edge.'
    return
  }
  try {
    busy.value = true
    const handle = await picker.call(window)
    await workspace.open(handle)
    // Persist to recent-folders history
    await addToHistory(handle.name, handle)
    history.value = await loadHistory()
    router.push('/workspace')
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}

/**
 * Reopens a recent folder: retrieves the stored handle from IndexedDB,
 * verifies the permission, and navigates to the workspace view.
 */
async function reopenFolder(entry: FolderHistoryEntry): Promise<void> {
  if (reopenBusy.value) return
  reopenBusy.value = entry.handleKey
  try {
    const handle = await getStoredHandle(entry.handleKey)
    if (!handle) {
      // Stale entry — handle may have been garbage-collected by the browser
      await removeFromHistory(entry.handleKey)
      history.value = await loadHistory()
      error.value = `"${entry.name}" is no longer accessible. It has been removed from your recent list.`
      return
    }

    // Verify permission; request it if needed
    const perm = await (handle as unknown as { requestPermission?: (opts: { mode: string }) => Promise<string> }).requestPermission?.({ mode: 'read' })
    if (perm === 'denied' || perm === 'prompt') {
      // User has denied or we can't request — remove from history as stale
      await removeFromHistory(entry.handleKey)
      history.value = await loadHistory()
      error.value = `Cannot open "${entry.name}" — permission was denied.`
      return
    }

    await workspace.open(handle)
    router.push('/workspace')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    reopenBusy.value = null
  }
}

/**
 * Tries to resolve a relative directory path from any previously stored handle
 * in the workspace history. This lets us navigate to a sample's parent folder
 * from a previously-opened workspace root without knowing the absolute path.
 *
 * Iterates each history handle and attempts to walk through the path segments
 * via getDirectoryHandle(). Returns the first handle that fully resolves, or
 * undefined if none of the stored handles contain the full path.
 */
async function resolveAncestorHandle(
  segments: string[],
): Promise<FileSystemDirectoryHandle | undefined> {
  for (const entry of history.value) {
    try {
      const handle = await getStoredHandle(entry.handleKey)
      if (!handle) continue

      // At runtime, stored handles are real FileSystemDirectoryHandle instances.
      let dir: FileSystemDirectoryHandle = handle as unknown as FileSystemDirectoryHandle
      for (const seg of segments) {
        const next = await dir.getDirectoryHandle(seg).catch(() => null)
        if (!next) {
          dir = null!
          break
        }
        dir = next
      }
      if (dir) return dir
    } catch {
      // Stale handle or permission issue — try the next history entry
      continue
    }
  }
  return undefined
}

/** Removes a single history entry. */
async function removeEntry(handleKey: string): Promise<void> {
  await removeFromHistory(handleKey)
  history.value = await loadHistory()
}

/** Clears all history. */
async function clearAllHistory(): Promise<void> {
  await clearHistory()
  history.value = await loadHistory()
}

/**
 * Handles a sample card click — resolves the sample's parent directory from
 * workspace history and opens the folder picker starting at that location so
 * the user can quickly select the sample folder without browsing from scratch.
 */
async function onSampleClick(sample: SampleFolder): Promise<void> {
  error.value = null
  const picker = (window as unknown as {
    showDirectoryPicker?: (opts?: { startIn?: FileSystemHandle }) => Promise<DirectoryHandleLike>
  }).showDirectoryPicker
  if (!picker) {
    error.value = 'This browser does not support the File System Access API. Use Chrome or Edge.'
    return
  }
  try {
    busy.value = true

    // Resolve the sample's parent directory from stored workspace history
    // FILE-mode: parent = directory that contains the file (what user selects)
    // FOLDER-mode: parent = directory that contains the sample folder
    const parentSegments = sample.path.replace(/\/+$/, '').split('/').slice(0, -1)
    const ancestorHandle = parentSegments.length > 0
      ? await resolveAncestorHandle(parentSegments)
      : undefined

    const pickerOpts = ancestorHandle
      ? { startIn: ancestorHandle as FileSystemHandle }
      : undefined

    const dirHandle = pickerOpts
      ? await picker.call(window, pickerOpts)
      : await picker.call(window)

    await workspace.open(dirHandle)
    await addToHistory(dirHandle.name, dirHandle)
    history.value = await loadHistory()
    router.push('/workspace')
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="home">
    <h1 class="home__title">format-editor</h1>
    <p class="home__hint">Open a workspace folder to begin.</p>

    <!-- ── Drag-drop / open zone ── -->
    <div
      class="drop-zone"
      :class="{ 'drop-zone--active': isDragging }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div class="drop-zone__icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
        </svg>
      </div>
      <p class="drop-zone__text">
        Drop a folder here, or click to browse
      </p>
      <div class="drop-zone__actions">
        <button class="home__open" :disabled="busy" @click="openWorkspace">
          {{ busy ? 'Opening\u2026' : 'Open folder\u2026' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="home__error" role="alert">{{ error }}</p>

    <!-- ── Recent folders ── -->
    <section v-if="history.length" class="recent">
      <div class="recent__header">
        <h3 class="recent__title">Recent</h3>
        <button class="recent__clear" @click="clearAllHistory">Clear</button>
      </div>
      <div class="recent__list">
        <button
          v-for="entry in history"
          :key="entry.handleKey"
          class="recent__item"
          :disabled="reopenBusy === entry.handleKey"
          @click="reopenFolder(entry)"
        >
          <svg class="recent__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
          </svg>
          <span class="recent__name">{{ entry.name }}</span>
          <span class="recent__time">{{ formatTimestamp(entry.timestamp) }}</span>
          <span class="recent__remove" role="button" tabindex="0" @click.stop="removeEntry(entry.handleKey)" @keydown.enter.prevent="removeEntry(entry.handleKey)" @keydown.space.prevent="removeEntry(entry.handleKey)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </span>
        </button>
      </div>
    </section>

    <!-- ── Sample models ── -->
    <section class="samples">
      <h3 class="samples__title">Example models</h3>
      <p class="samples__sub">Open an iNNfo folder to explore, or try one of these samples from the repository.</p>
      <div class="samples__grid">
        <button
          v-for="s in samples"
          :key="s.id"
          class="sample-card"
          @click="onSampleClick(s)"
        >
          <div class="sample-card__head">
            <svg class="sample-card__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
            </svg>
            <div class="sample-card__info">
              <span class="sample-card__name">{{ s.name }}</span>
              <span class="sample-card__meta">{{ s.mode }} &middot; {{ s.items }} items</span>
            </div>
            <span class="sample-card__badge">{{ s.mode }}</span>
          </div>
          <p class="sample-card__desc">{{ s.description }}</p>
          <span class="sample-card__action">Open folder &rarr;</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 1rem;
  font-family: system-ui, sans-serif;
}

.home__title {
  margin: 0;
  font-size: 1.5rem;
}

.home__hint {
  margin: 0;
  color: #555;
}

/* ── Drag-drop zone ── */

.drop-zone {
  width: 100%;
  max-width: 480px;
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 2rem 1rem;
  text-align: center;
  transition: border-color 0.2s, background 0.2s;
}

.drop-zone--active {
  border-color: #4D0E4E;
  background: #F8F0F8;
}

.drop-zone__icon {
  color: #999;
  margin-bottom: 0.75rem;
}

.drop-zone__text {
  margin: 0 0 1rem;
  color: #666;
  font-size: 14px;
}

.drop-zone__actions {
  display: flex;
  justify-content: center;
}

.home__open {
  padding: 0.6rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  border: 2px solid #4D0E4E;
  border-radius: 6px;
  background: #fff;
  color: #4D0E4E;
  font-weight: 600;
  transition: all 0.15s;
}

.home__open:hover {
  background: #4D0E4E;
  color: #fff;
}

.home__open:disabled {
  opacity: 0.6;
  cursor: default;
}

.home__error {
  color: #b00020;
  max-width: 32rem;
  text-align: center;
}

/* ── Recent folders ── */

.recent {
  width: 100%;
  max-width: 480px;
  margin-top: 0.5rem;
}

.recent__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.recent__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
}

.recent__clear {
  font-size: 12px;
  color: #888;
  background: none;
  border: none;
  cursor: pointer;
  font-family: system-ui, sans-serif;
}

.recent__clear:hover {
  color: #4D0E4E;
}

.recent__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  font-family: system-ui, sans-serif;
  width: 100%;
  text-align: left;
  font-size: 14px;
}

.recent__item:hover:not(:disabled) {
  border-color: #4D0E4E;
  box-shadow: 0 1px 4px rgba(77, 14, 78, 0.06);
}

.recent__item:disabled {
  opacity: 0.5;
  cursor: default;
}

.recent__icon {
  flex-shrink: 0;
  color: #4D0E4E;
}

.recent__name {
  flex: 1;
  font-weight: 600;
  color: #333;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent__time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.recent__remove {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  border-radius: 4px;
}

.recent__item:hover .recent__remove {
  opacity: 1;
}

.recent__remove:hover {
  color: #C62828;
  background: #FFEBEE;
}

/* ── Sample models ── */

.samples {
  width: 100%;
  max-width: 480px;
  margin-top: 0.5rem;
}

.samples__title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
}

.samples__sub {
  margin: 0 0 0.75rem;
  font-size: 14px;
  color: #888;
}

.samples__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

@media (max-width: 600px) {
  .samples__grid {
    grid-template-columns: 1fr;
  }
}

.sample-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  font-family: system-ui, sans-serif;
  width: 100%;
}

.sample-card:hover {
  border-color: #4D0E4E;
  box-shadow: 0 2px 8px rgba(77, 14, 78, 0.08);
}

.sample-card__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sample-card__icon {
  flex-shrink: 0;
  color: #4D0E4E;
}

.sample-card__info {
  flex: 1;
  min-width: 0;
}

.sample-card__name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #333;
}

.sample-card__meta {
  display: block;
  font-size: 12px;
  color: #999;
  font-family: monospace;
  margin-top: 1px;
}

.sample-card__badge {
  font-family: monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 4px;
  background: #F3E5F5;
  color: #4D0E4E;
  flex-shrink: 0;
}

.sample-card__desc {
  margin: 0;
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

.sample-card__action {
  font-size: 13px;
  font-weight: 600;
  color: #4D0E4E;
}
</style>
