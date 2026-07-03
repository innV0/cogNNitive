<script setup lang="ts">
/**
 * DirectoryPickerModal — Welcome screen with workspace opening options.
 *
 * Provides three entry points:
 *   1. "Open Local Folder" — File System Access API directory picker
 *   2. "Load from URL" — fetch an iNNfo model from a remote URL
 *   3. "New Workspace" — folder init with template selector (V_0-2-0)
 *
 * Emits:
 *   - `open-handle` with a FileSystemDirectoryHandle
 *   - `load-url` with the URL string
 *   - `create` with frontmatter data for a new _NN.md
 *   - `close` when the user dismisses the modal
 */
import { ref, onMounted, computed } from 'vue'
import { isFileSystemAccessSupported } from '../../composables/useFileSystem'
import { loadHistory, removeFromHistory, formatTimestamp, getStoredHandle } from '../../stores/historyStore'
import type { DirectoryHandleLike } from '../../model/fs-types'
import { DEFAULT_INNFO_VERSION, DEFAULT_TEMPLATE_VERSION, buildSpecificationUrl } from '../../utils/constants'
import type { FolderHistoryEntry } from '../../shared/validation-types'

// ── Events ──
const emit = defineEmits<{
  (e: 'open-handle', handle: DirectoryHandleLike): void
  (e: 'load-url', url: string): void
  (e: 'create', frontmatter: Record<string, unknown>): void
  (e: 'close'): void
}>()

// ── State ──
const apiSupported = isFileSystemAccessSupported()
const error = ref<string | null>(null)
const busy = ref(false)
const history = ref<FolderHistoryEntry[]>([])
const reopenBusy = ref<string | null>(null)

// ── URL loading ──
const urlInput = ref('')
const showUrlInput = ref(false)

// ── Folder init (new workspace) ──
const showFolderInit = ref(false)

interface TemplateOption {
  name: string
  version: string
  specVersion: string
}

const availableTemplates: TemplateOption[] = [
  { name: 'business', version: 'V_1-0-0', specVersion: DEFAULT_INNFO_VERSION },
  { name: 'procedures', version: 'V_1-0-0', specVersion: DEFAULT_INNFO_VERSION },
  { name: 'catalog', version: 'V_1-0-0', specVersion: DEFAULT_INNFO_VERSION },
  { name: 'kb', version: 'V_0-1-1', specVersion: 'V_0-1-1' },
]

const selectedTemplate = ref<TemplateOption>(availableTemplates[0])
const modelName = ref('')
const modelDescription = ref('')

const createValid = computed(() => modelName.value.trim().length > 0)

// ── Lifecycle ──
onMounted(async () => {
  history.value = await loadHistory()
})

// ── Handlers ──

async function openFolderPicker(): Promise<void> {
  error.value = null

  if (!apiSupported) {
    error.value = 'File System Access API is not available. Use Chrome or Edge, or try "Load from URL" instead.'
    return
  }

  try {
    busy.value = true
    const picker = (window as unknown as {
      showDirectoryPicker?: () => Promise<DirectoryHandleLike>
    }).showDirectoryPicker

    if (!picker) {
      error.value = 'showDirectoryPicker is not available in this context.'
      return
    }

    const handle = await picker.call(window)
    emit('open-handle', handle)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}

async function reopenFolder(entry: FolderHistoryEntry): Promise<void> {
  error.value = null
  if (reopenBusy.value) return
  reopenBusy.value = entry.handleKey

  try {
    const handle = await getStoredHandle(entry.handleKey)
    if (!handle) {
      await removeFromHistory(entry.handleKey)
      history.value = await loadHistory()
      error.value = `"${entry.name}" is no longer accessible.`
      return
    }

    const perm = await (
      handle as unknown as { requestPermission?: (opts: { mode: string }) => Promise<string> }
    ).requestPermission?.({ mode: 'read' })

    if (perm === 'denied' || perm === 'prompt') {
      await removeFromHistory(entry.handleKey)
      history.value = await loadHistory()
      error.value = `Cannot open "${entry.name}" — permission was denied.`
      return
    }

    emit('open-handle', handle)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    reopenBusy.value = null
  }
}

function loadUrl(): void {
  error.value = null
  const url = urlInput.value.trim()
  if (!url) {
    error.value = 'Please enter a valid URL.'
    return
  }

  try {
    new URL(url)
  } catch {
    error.value = 'Invalid URL format.'
    return
  }

  emit('load-url', url)
}

function startUrlInput(): void {
  showUrlInput.value = true
  showFolderInit.value = false
  error.value = null
}

function startFolderInit(): void {
  showFolderInit.value = true
  showUrlInput.value = false
  error.value = null
  modelName.value = ''
  modelDescription.value = ''
  selectedTemplate.value = availableTemplates[0]
}

function cancelFolderInit(): void {
  showFolderInit.value = false
}

function onCreateFolder(): void {
  if (!createValid.value) return

  const frontmatter: Record<string, unknown> = {
    spec_version: selectedTemplate.value.specVersion,
    spec_url: buildSpecificationUrl(selectedTemplate.value.specVersion),
    model_version: DEFAULT_TEMPLATE_VERSION,
    title: modelName.value.trim(),
    description: modelDescription.value.trim() || undefined,
    template: {
      name: selectedTemplate.value.name,
      version: selectedTemplate.value.version,
    },
    concepts: [],
    markers: [],
  }

  emit('create', frontmatter)
}

function onBackdropClick(): void {
  if (!showUrlInput.value && !showFolderInit.value) {
    emit('close')
  } else {
    showUrlInput.value = false
    showFolderInit.value = false
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    if (showUrlInput.value || showFolderInit.value) {
      showUrlInput.value = false
      showFolderInit.value = false
    } else {
      emit('close')
    }
  }
}

/**
 * Generates a human-readable YAML preview of the frontmatter that
 * would be emitted by the "Create" button.
 */
function generatePreview(): string {
  return [
    `spec_version: "${selectedTemplate.value.specVersion}"`,
    `spec_url: "${buildSpecificationUrl(selectedTemplate.value.specVersion)}"`,
    `model_version: "${DEFAULT_TEMPLATE_VERSION}"`,
    `title: "${modelName.value.trim() || '<name>'}"`,
    `template:`,
    `  name: "${selectedTemplate.value.name}"`,
    `  version: "${selectedTemplate.value.version}"`,
    `concepts: []`,
    `markers: []`,
  ].join('\n')
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="dp-backdrop"
    @click.self="onBackdropClick"
    @keydown="onKeydown"
  >
    <!-- ── Main Welcome Panel ── -->
    <div v-if="!showUrlInput && !showFolderInit" class="dp-panel" role="dialog" aria-label="Open workspace">
      <button class="dp-close" @click="emit('close')" aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      <h2 class="dp-title">innfo-editor</h2>
      <p class="dp-subtitle">Open an iNNfo workspace to begin editing.</p>

      <!-- Error -->
      <p v-if="error" class="dp-error" role="alert">{{ error }}</p>

      <!-- Primary actions -->
      <div class="dp-actions">
        <button
          class="dp-action dp-action--primary"
          :disabled="busy"
          @click="openFolderPicker"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
          </svg>
          <span class="dp-action__label">
            {{ busy ? 'Opening\u2026' : 'Open Local Folder' }}
          </span>
          <span v-if="!apiSupported" class="dp-action__badge">Unavailable</span>
        </button>

        <button
          class="dp-action dp-action--secondary"
          @click="startUrlInput"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span class="dp-action__label">Load from URL</span>
        </button>

        <button
          class="dp-action dp-action--tertiary"
          @click="startFolderInit"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span class="dp-action__label">New Workspace</span>
        </button>
      </div>

      <!-- API fallback hint -->
      <p v-if="!apiSupported" class="dp-hint">
        Folder picker requires Chrome or Edge. Use "Load from URL" or enter a directory path manually in a supporting browser.
      </p>

      <!-- ── Recent directories ── -->
      <section v-if="history.length" class="dp-recent">
        <div class="dp-recent__header">
          <h3 class="dp-recent__title">Recent</h3>
        </div>
        <div class="dp-recent__list">
          <button
            v-for="entry in history"
            :key="entry.handleKey"
            class="dp-recent__item"
            :disabled="reopenBusy === entry.handleKey"
            @click="reopenFolder(entry)"
          >
            <svg class="dp-recent__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
            </svg>
            <span class="dp-recent__name">{{ entry.name }}</span>
            <span class="dp-recent__time">{{ formatTimestamp(entry.timestamp) }}</span>
          </button>
        </div>
      </section>
    </div>

    <!-- ── URL Input Panel ── -->
    <div v-else-if="showUrlInput" class="dp-panel" role="dialog" aria-label="Load model from URL">
      <button class="dp-close" @click="showUrlInput = false" aria-label="Back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>

      <h2 class="dp-title">Load from URL</h2>
      <p class="dp-subtitle">Enter the URL of an iNNfo <code>_NN.md</code> file to load it as a virtual workspace.</p>

      <p v-if="error" class="dp-error" role="alert">{{ error }}</p>

      <div class="dp-url-input">
        <input
          v-model="urlInput"
          type="url"
          placeholder="https://example.com/model_V_1-0-0_business_NN.md"
          class="dp-input"
          @keydown.enter="loadUrl"
        />
        <button class="dp-btn dp-btn--primary" @click="loadUrl">
          Load
        </button>
      </div>

      <p class="dp-hint">URL-loaded workspaces cannot be saved (no file system handle).</p>
    </div>

    <!-- ── Folder Init Panel (New Workspace) ── -->
    <div v-else-if="showFolderInit" class="dp-panel" role="dialog" aria-label="Create new workspace">
      <button class="dp-close" @click="cancelFolderInit" aria-label="Back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>

      <h2 class="dp-title">New Workspace</h2>
      <p class="dp-subtitle">Create a new iNNfo model directory from a template.</p>

      <p v-if="error" class="dp-error" role="alert">{{ error }}</p>

      <div class="dp-form">
        <div class="dp-field">
          <label class="dp-label" for="fi-template">Template</label>
          <select
            id="fi-template"
            v-model="selectedTemplate"
            class="dp-select"
          >
            <option
              v-for="tpl in availableTemplates"
              :key="tpl.name"
              :value="tpl"
            >
              {{ tpl.name }} ({{ tpl.version }})
            </option>
          </select>
        </div>

        <div class="dp-field">
          <label class="dp-label" for="fi-name">Model Name</label>
          <input
            id="fi-name"
            v-model="modelName"
            type="text"
            placeholder="My Model"
            class="dp-input"
          />
        </div>

        <div class="dp-field">
          <label class="dp-label" for="fi-desc">Description (optional)</label>
          <textarea
            id="fi-desc"
            v-model="modelDescription"
            class="dp-textarea"
            placeholder="Brief description of the model"
            rows="3"
          />
        </div>

        <div class="dp-form__actions">
          <button class="dp-btn dp-btn--ghost" @click="cancelFolderInit">
            Cancel
          </button>
          <button
            class="dp-btn dp-btn--primary"
            :disabled="!createValid"
            @click="onCreateFolder"
          >
            Create
          </button>
        </div>
      </div>

      <div class="dp-preview">
        <h4 class="dp-preview__title">Generated frontmatter preview</h4>
        <pre class="dp-preview__code" v-text="generatePreview()"></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Backdrop & Panel ── */

.dp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  font-family: system-ui, sans-serif;
}

.dp-panel {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  padding: 2rem 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.dp-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.15s;
}

.dp-close:hover {
  color: #333;
  background: #f0f0f0;
}

.dp-title {
  margin: 0 0 4px;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a1a;
}

.dp-subtitle {
  margin: 0 0 1rem;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.dp-subtitle code {
  font-family: monospace;
  font-size: 13px;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 3px;
}

.dp-error {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 13px;
  color: #b00020;
  background: #FFF0F0;
  border-radius: 6px;
  border: 1px solid #FFCDD2;
}

/* ── Action Buttons ── */

.dp-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.dp-action {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  font-family: system-ui, sans-serif;
  text-align: left;
}

.dp-action:hover:not(:disabled) {
  border-color: #4D0E4E;
  box-shadow: 0 1px 4px rgba(77, 14, 78, 0.06);
}

.dp-action:disabled {
  opacity: 0.6;
  cursor: default;
}

.dp-action--primary {
  border-color: #4D0E4E;
  color: #4D0E4E;
  font-weight: 600;
}

.dp-action--primary:hover:not(:disabled) {
  background: #4D0E4E;
  color: #fff;
}

.dp-action--primary:hover:not(:disabled) svg {
  stroke: #fff;
}

.dp-action--primary svg {
  stroke: #4D0E4E;
}

.dp-action__label {
  flex: 1;
  font-size: 15px;
}

.dp-action__badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: #FFEBEE;
  color: #C62828;
}

.dp-hint {
  margin: 0 0 1rem;
  font-size: 13px;
  color: #999;
  line-height: 1.5;
}

/* ── Recent Directories ── */

.dp-recent {
  border-top: 1px solid #eee;
  padding-top: 0.75rem;
}

.dp-recent__header {
  margin-bottom: 0.5rem;
}

.dp-recent__title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
}

.dp-recent__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dp-recent__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  font-family: system-ui, sans-serif;
  text-align: left;
  font-size: 14px;
}

.dp-recent__item:hover:not(:disabled) {
  border-color: #e0e0e0;
  background: #fafafa;
}

.dp-recent__item:disabled {
  opacity: 0.5;
  cursor: default;
}

.dp-recent__icon {
  flex-shrink: 0;
  color: #4D0E4E;
}

.dp-recent__name {
  flex: 1;
  font-weight: 600;
  color: #333;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dp-recent__time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

/* ── URL Input Panel ── */

.dp-url-input {
  display: flex;
  gap: 0.5rem;
}

.dp-url-input .dp-input {
  flex: 1;
}

/* ── Form (Folder Init) ── */

.dp-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.dp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dp-label {
  font-size: 13px;
  font-weight: 600;
  color: #444;
}

.dp-input,
.dp-select,
.dp-textarea {
  padding: 0.5rem 0.75rem;
  font-size: 14px;
  font-family: system-ui, sans-serif;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #333;
  transition: border-color 0.15s;
  outline: none;
}

.dp-input:focus,
.dp-select:focus,
.dp-textarea:focus {
  border-color: #4D0E4E;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}

.dp-textarea {
  resize: vertical;
  min-height: 60px;
}

.dp-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

/* ── Shared Buttons ── */

.dp-btn {
  padding: 0.5rem 1rem;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: system-ui, sans-serif;
  border: 1px solid transparent;
}

.dp-btn--primary {
  background: #4D0E4E;
  color: #fff;
  border-color: #4D0E4E;
}

.dp-btn--primary:hover:not(:disabled) {
  background: #3a0b3b;
}

.dp-btn--primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.dp-btn--ghost {
  background: transparent;
  color: #666;
  border-color: #ccc;
}

.dp-btn--ghost:hover {
  background: #f5f5f5;
  color: #333;
}

/* ── Preview ── */

.dp-preview {
  border-top: 1px solid #eee;
  padding-top: 0.75rem;
}

.dp-preview__title {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
}

.dp-preview__code {
  margin: 0;
  padding: 0.6rem;
  background: #f8f8f8;
  border: 1px solid #eee;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #444;
  overflow-x: auto;
  white-space: pre;
}
</style>
