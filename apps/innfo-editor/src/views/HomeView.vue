<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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
import { useUrlDocLoader } from '../composables/useUrlDocLoader'
import { useToast } from '../shared/useToast'
import SetupWizard from '../components/layout/SetupWizard.vue'

const router = useRouter()
const route = useRoute()
const workspace = useWorkspaceStore()
const { show: showToast } = useToast()
const error = ref<string | null>(null)
const busy = ref(false)
const urlInput = ref('')
const urlBusy = ref(false)
const history = ref<FolderHistoryEntry[]>([])
const reopenBusy = ref<string | null>(null)
const showAdvanced = ref(false)

const samples: SampleFolder[] = [
  {
    id: 'sample-ghostbusters',
    name: 'Ghostbusters',
    description:
      'FILE-mode business model for a fictional ghost-catching franchise: SWOT, risks, market segments, finance, legal, and operations in a single _NN.md.',
    mode: 'FILE',
    path: 'specs/v0.2.0/level2/business/samples/Ghostbusters_V_0-1-2_business_NN.md',
    items: 1,
  },
  {
    id: 'sample-code-review',
    name: 'Code Review Process',
    description:
      'FILE-mode procedure for PR-based code reviews: roles (Author, Reviewer, Maintainer), step-by-step workflow, tool bindings, and hotfix path.',
    mode: 'FILE',
    path: 'specs/v0.2.0/level2/procedures/samples/CodeReviewProcess_V_1-0-0_procedures_NN.md',
    items: 1,
  },
]

interface StarterTemplate {
  id: string
  name: string
  description: string
  icon: string
  url: string
  templateName: string
  sampleUrl?: string
  sampleName?: string
}

const starterBase = `${import.meta.env.BASE_URL}starter/`

const starters: StarterTemplate[] = [
  {
    id: 'starter-business',
    name: 'Business',
    description: 'Model your business idea: market, team, finance, operations, and strategy.',
    icon: '🏢',
    url: `${starterBase}Business_V_1-0-0_starter_NN.md`,
    templateName: 'business',
    sampleUrl:
      'https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/latest/level2/business/samples/Ghostbusters_V_0-1-2_business_NN.md',
    sampleName: 'Ghostbusters',
  },
  {
    id: 'starter-procedures',
    name: 'Procedures',
    description: 'Define step-by-step workflows, roles, artifacts, and decision points.',
    icon: '📋',
    url: `${starterBase}Procedures_V_1-0-0_starter_NN.md`,
    templateName: 'procedures',
    sampleUrl:
      'https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/latest/level2/procedures/samples/CodeReviewProcess_V_1-0-0_procedures_NN.md',
    sampleName: 'Code Review Process',
  },
  {
    id: 'starter-organization',
    name: 'Organization',
    description: 'Structure your organization: define positions, roles, members, and relations.',
    icon: '👥',
    url: `${starterBase}Organization_V_1-0-0_starter_NN.md`,
    templateName: 'organization',
    sampleUrl:
      'https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/latest/level2/organization/samples/EngineeringTeam_V_1-0-0_organization_NN.md',
    sampleName: 'Engineering Team',
  },
]

onMounted(async () => {
  history.value = await loadHistory()
})

// Watch for empty folder detection and notify the user
watch(
  () => workspace.emptyFolderError,
  (val) => {
    if (val) {
      showToast('No iNNfo models found in this folder. Try the examples below to get started.', 'warning')
      workspace.emptyFolderError = false
      // Scroll to samples section
      const el = document.querySelector('.samples')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  },
)

const sandboxUrl = `${import.meta.env.BASE_URL}starter/Sandbox_V_1-0-0_starter_NN.md`
const sandboxBusy = ref(false)
const showSandbox = ref(!localStorage.getItem('nn_hide_sandbox'))

function closeSandbox(): void {
  localStorage.setItem('nn_hide_sandbox', 'true')
  showSandbox.value = false
}

const docsUrl = 'https://format.innv0.com/documentation/'

/**
 * Entry point: prompts the user for a workspace directory via the File System
 * Access API, runs the single parse pass through workspaceStore.open(), and
 * navigates to the workspace view.
 */
async function openWorkspace(): Promise<void> {
  error.value = null
  const picker = (
    window as unknown as {
      showDirectoryPicker?: () => Promise<DirectoryHandleLike>
    }
  ).showDirectoryPicker
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
 * Loads a model from a remote URL into a virtual workspace.
 */
async function loadFromUrl(): Promise<void> {
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
  urlBusy.value = true
  try {
    await workspace.loadFromUrl(url)
    await addToHistory(url, null as unknown as any)
    history.value = await loadHistory()
    router.push('/workspace')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    urlBusy.value = false
  }
}

/**
 * Creates a new empty workspace from a default template and navigates to it.
 */
async function createFromTemplate(): Promise<void> {
  error.value = null
  busy.value = true
  try {
    const loader = useUrlDocLoader()
    const frontmatter = {
      spec_version: 'V_0-1-5',
      model_version: 'V_1-0-0',
      title: 'Untitled Model',
      template: { name: 'business', version: 'V_1-0-0' },
      concepts: [{ name: 'Topic', type: 'topic', icon: 'wrench', color: '#059669' }],
      markers: [],
    }
    await loader.loadFromFrontmatter(frontmatter, 'Untitled_NN.md')
    workspace.hasParsed = true
    workspace.hasHandle = true
    workspace.parseCount += 1
    await addToHistory('Untitled', null as unknown as any)
    history.value = await loadHistory()
    router.push('/workspace')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}

async function loadSandbox(): Promise<void> {
  error.value = null
  sandboxBusy.value = true
  try {
    await workspace.loadFromUrl(sandboxUrl)
    await addToHistory('Sandbox', null as unknown as any)
    history.value = await loadHistory()
    router.push('/workspace')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    sandboxBusy.value = false
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
    const perm = await (
      handle as unknown as { requestPermission?: (opts: { mode: string }) => Promise<string> }
    ).requestPermission?.({ mode: 'read' })
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
 * Loads a starter model from its raw GitHub URL into a virtual workspace.
 * The model can be explored and edited in memory, but cannot be saved
 * because there's no local folder handle. Use createFromStarter() if you
 * need full save support.
 */
async function previewSample(starter: StarterTemplate): Promise<void> {
  if (!starter.sampleUrl) return
  error.value = null
  urlBusy.value = true
  try {
    await workspace.loadFromUrl(starter.sampleUrl, starter.templateName)
    await addToHistory(`${starter.name} Sample`, null as unknown as any)
    history.value = await loadHistory()
    router.push('/workspace')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    urlBusy.value = false
  }
}

/**
 * Creates a new model from a starter template by:
 * 1. Asking the user to pick a folder via File System Access API
 * 2. Fetching the starter model content from the raw URL
 * 3. Writing it as a new _NN.md file in the selected folder
 * 4. Opening the folder as a workspace (full save support)
 */
async function createFromStarter(starter: StarterTemplate): Promise<void> {
  error.value = null
  const picker = (
    window as unknown as {
      showDirectoryPicker?: () => Promise<DirectoryHandleLike>
    }
  ).showDirectoryPicker
  if (!picker) {
    error.value = 'This browser does not support the File System Access API. Use Chrome or Edge.'
    return
  }
  try {
    busy.value = true
    const handle = await picker.call(window)

    // Fetch starter content from raw GitHub URL
    const response = await window.fetch(starter.url)
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    let content = await response.text()

    // Customise the model title so the user gets a fresh copy
    const modelName = `My${starter.name.replace(/\s/g, '')}`
    content = content.replace(/^title:.*$/m, `title: "${modelName}"`)

    const filename = `${modelName}_V_1-0-0_${starter.templateName}_NN.md`

    // Write the file into the chosen folder
    const fileHandle = await handle.getFileHandle(filename, { create: true })
    if (!fileHandle.createWritable) throw new Error('File handle does not support writing')
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()

    await workspace.open(handle)
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
 * Creates a new model from a starter template looked up by name.
 * Used by the SampleBanner CTA ("Crear mi propio modelo").
 */
async function createFromStarterByName(templateName: string): Promise<void> {
  const starter = starters.find(
    (s) => s.templateName.toLowerCase() === templateName.toLowerCase(),
  )
  if (!starter) {
    error.value = `Template "${templateName}" not found.`
    return
  }
  await createFromStarter(starter)
}

/**
 * Handles a sample card click — resolves the sample's parent directory from
 * workspace history and opens the folder picker starting at that location so
 * the user can quickly select the sample folder without browsing from scratch.
 */
async function onSampleClick(sample: SampleFolder): Promise<void> {
  error.value = null
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (opts?: { startIn?: FileSystemHandle }) => Promise<DirectoryHandleLike>
    }
  ).showDirectoryPicker
  if (!picker) {
    error.value = 'This browser does not support the File System Access API. Use Chrome or Edge.'
    return
  }
  try {
    busy.value = true

    // Resolve the sample's parent directory from stored workspace history
    const parentSegments = sample.path.replace(/\/+$/, '').split('/').slice(0, -1)
    const ancestorHandle =
      parentSegments.length > 0 ? await resolveAncestorHandle(parentSegments) : undefined

    const pickerOpts = ancestorHandle ? { startIn: ancestorHandle as FileSystemHandle } : undefined

    const dirHandle = pickerOpts ? await picker.call(window, pickerOpts) : await picker.call(window)

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
    <!-- ── Setup Wizard (primary entry point) ── -->
    <SetupWizard />

    <!-- ── Advanced / Quick access ── -->
    <button class="home__toggle-advanced" @click="showAdvanced = !showAdvanced">
      {{ showAdvanced ? 'Hide advanced options' : 'Open existing workspace or browse samples' }}
      <span class="home__toggle-arrow">{{ showAdvanced ? '▲' : '▼' }}</span>
    </button>

    <template v-if="showAdvanced">
    <!-- ── Sandbox ── -->
    <section v-if="showSandbox" class="sandbox">
      <div class="sandbox__card">
        <button class="sandbox__close" aria-label="Close" @click="closeSandbox">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div class="sandbox__icon">🧪</div>
        <h2 class="sandbox__title">TRY THE SANDBOX</h2>
        <p class="sandbox__desc">
          Never used iNNfo before? This tiny example model teaches you how the editor works as you
          explore. Each element explains what you're looking at — the tree, the views, and the
          concepts. No files needed, just click and learn.
        </p>
        <button class="sandbox__btn" :disabled="sandboxBusy" @click="loadSandbox">
          {{ sandboxBusy ? 'Loading\u2026' : 'Launch Sandbox' }}
        </button>
      </div>
    </section>

    <!-- ── Two-column layout: open existing / start new ── -->
    <div class="cols">
      <!-- Left column: open existing -->
      <div class="col">
        <h2 class="col__title">Open existing</h2>
        <p class="col__desc">Select a folder that already contains iNNfo model files.</p>

        <div class="open-action">
          <button class="home__open" :disabled="busy" @click="openWorkspace">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="home__open-icon"
            >
              <path
                d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"
              />
            </svg>
            {{ busy ? 'Opening\u2026' : 'Open folder\u2026' }}
          </button>
        </div>

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
              <svg
                class="recent__icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"
                />
              </svg>
              <span class="recent__name">{{ entry.name }}</span>
              <span class="recent__time">{{ formatTimestamp(entry.timestamp) }}</span>
              <span
                class="recent__remove"
                role="button"
                tabindex="0"
                @click.stop="removeEntry(entry.handleKey)"
                @keydown.enter.prevent="removeEntry(entry.handleKey)"
                @keydown.space.prevent="removeEntry(entry.handleKey)"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </span>
            </button>
          </div>
        </section>
      </div>

      <!-- Right column: official templates -->
      <div class="col">
        <h2 class="col__title">Official templates</h2>
        <p class="col__desc">
          Choose a template to start a new model. Preview a sample or create a full copy in a
          folder.
        </p>

        <div class="starters">
          <div v-for="s in starters" :key="s.id" class="starter-card">
            <div class="starter-card__head">
              <span class="starter-card__icon">{{ s.icon }}</span>
              <strong class="starter-card__name">{{ s.name }}</strong>
            </div>
            <p class="starter-card__desc">{{ s.description }}</p>
            <div class="starter-card__actions">
              <button
                v-if="s.sampleUrl"
                class="starter-card__sample"
                :disabled="urlBusy"
                @click="previewSample(s)"
              >
                {{ urlBusy ? 'Loading\u2026' : 'Preview Sample' }}
              </button>
              <button class="starter-card__create" :disabled="busy" @click="createFromStarter(s)">
                {{ busy ? 'Creating\u2026' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-if="error" class="home__error" role="alert">{{ error }}</p>

    <!-- ── Community templates ── -->
    <section class="community">
      <h3 class="community__title">Community templates</h3>
      <p class="community__desc">
        You can also load any iNNfo model from a URL — including templates created by the community
        or your own custom models hosted anywhere.
      </p>

      <div class="community__url">
        <input
          v-model="urlInput"
          type="url"
          placeholder="https://example.com/model_V_1-0-0_business_NN.md"
          class="community__input"
          @keydown.enter="loadFromUrl"
        />
        <button class="community__btn" :disabled="urlBusy || !urlInput.trim()" @click="loadFromUrl">
          {{ urlBusy ? 'Loading\u2026' : 'Load' }}
        </button>
      </div>

      <p class="community__docs">
        📖 Learn how to use existing templates or create your own in the
        <a :href="docsUrl" target="_blank" rel="noopener noreferrer">documentation</a>.
      </p>
    </section>

    <!-- ── Two-column layout: open existing / start new ── -->
    <div class="cols">
      <!-- Left column: open existing -->
      <div class="col">
        <h2 class="col__title">Open existing</h2>
        <p class="col__desc">Select a folder that already contains iNNfo model files.</p>

        <div class="open-action">
          <button class="home__open" :disabled="busy" @click="openWorkspace">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="home__open-icon"
            >
              <path
                d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"
              />
            </svg>
            {{ busy ? 'Opening\u2026' : 'Open folder\u2026' }}
          </button>
        </div>

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
              <svg
                class="recent__icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"
                />
              </svg>
              <span class="recent__name">{{ entry.name }}</span>
              <span class="recent__time">{{ formatTimestamp(entry.timestamp) }}</span>
              <span
                class="recent__remove"
                role="button"
                tabindex="0"
                @click.stop="removeEntry(entry.handleKey)"
                @keydown.enter.prevent="removeEntry(entry.handleKey)"
                @keydown.space.prevent="removeEntry(entry.handleKey)"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </span>
            </button>
          </div>
        </section>
      </div>

      <!-- Right column: official templates -->
      <div class="col">
        <h2 class="col__title">Official templates</h2>
        <p class="col__desc">
          Choose a template to start a new model. Preview a sample or create a full copy in a folder.
        </p>

        <div class="starters">
          <div v-for="s in starters" :key="s.id" class="starter-card">
            <div class="starter-card__head">
              <span class="starter-card__icon">{{ s.icon }}</span>
              <strong class="starter-card__name">{{ s.name }}</strong>
            </div>
            <p class="starter-card__desc">{{ s.description }}</p>
            <div class="starter-card__actions">
              <button
                v-if="s.sampleUrl"
                class="starter-card__sample"
                :disabled="urlBusy"
                @click="previewSample(s)"
              >
                {{ urlBusy ? 'Loading\u2026' : 'Preview Sample' }}
              </button>
              <button class="starter-card__create" :disabled="busy" @click="createFromStarter(s)">
                {{ busy ? 'Creating\u2026' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Community templates ── -->
    <section class="community">
      <h3 class="community__title">Community templates</h3>
      <p class="community__desc">
        You can also load any iNNfo model from a URL — including templates created by the community
        or your own custom models hosted anywhere.
      </p>

      <div class="community__url">
        <input
          v-model="urlInput"
          type="url"
          placeholder="https://example.com/model_V_1-0-0_business_NN.md"
          class="community__input"
          @keydown.enter="loadFromUrl"
        />
        <button class="community__btn" :disabled="urlBusy || !urlInput.trim()" @click="loadFromUrl">
          {{ urlBusy ? 'Loading\u2026' : 'Load' }}
        </button>
      </div>

      <p class="community__docs">
        📖 Learn how to use existing templates or create your own in the
        <a :href="docsUrl" target="_blank" rel="noopener noreferrer">documentation</a>.
      </p>
    </section>

    <!-- ── Sample models ── -->
    <section class="samples">
      <h3 class="samples__title">Explore example models</h3>
      <p class="samples__sub">
        See how iNNfo models work before creating your own. Open a sample to explore in read-only
        mode.
      </p>
      <div class="samples__grid">
        <button v-for="s in samples" :key="s.id" class="sample-card" @click="onSampleClick(s)">
          <div class="sample-card__head">
            <svg
              class="sample-card__icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"
              />
            </svg>
            <div class="sample-card__info">
              <span class="sample-card__name">{{ s.name }}</span>
              <span class="sample-card__meta">{{ s.mode }} &middot; {{ s.items }} items</span>
            </div>
            <span class="sample-card__badge">{{ s.mode }}</span>
          </div>
          <p class="sample-card__desc">{{ s.description }}</p>
          <span class="sample-card__action">Explore &rarr;</span>
        </button>
      </div>
    </section>
    </template>
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

/* ── Hero ── */

.hero {
  text-align: center;
  max-width: 600px;
}

.hero__title {
  margin: 0;
  font-size: 1.5rem;
  color: #4d0e4e;
}

.hero__desc {
  margin: 0.5rem 0 0;
  color: #555;
  font-size: 14px;
  line-height: 1.6;
}

/* ── Two-column layout ── */

.cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  width: 100%;
  max-width: 860px;
  align-items: start;
}

@media (max-width: 700px) {
  .cols {
    grid-template-columns: 1fr;
  }
}

.col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.col__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
}

.col__desc {
  margin: 0;
  font-size: 14px;
  color: #888;
  line-height: 1.5;
}

/* ── Open Folder Action Card ── */

.open-action {
  margin-top: 1.25rem;
}

.home__open {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  border: 1px solid #4d0e4e;
  border-radius: 8px;
  background: #4d0e4e;
  color: #fff;
  font-weight: 600;
  transition: all 0.15s;
  box-shadow: 0 2px 4px rgba(77, 14, 78, 0.15);
}

.home__open:hover:not(:disabled) {
  background: #3a0b3b;
  border-color: #3a0b3b;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(77, 14, 78, 0.25);
}

.home__open:disabled {
  opacity: 0.6;
  cursor: default;
}

.home__open-icon {
  flex-shrink: 0;
}

/* ── Starter cards ── */

.starters {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.starter-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s;
}

.starter-card:hover {
  border-color: #4d0e4e;
}

.starter-card__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.starter-card__icon {
  font-size: 1.2rem;
  line-height: 1;
}

.starter-card__name {
  font-size: 14px;
  color: #333;
}

.starter-card__desc {
  margin: 0;
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

.starter-card__actions {
  display: flex;
  gap: 0.4rem;
}

.starter-card__preview,
.starter-card__create {
  padding: 0.35rem 0.75rem;
  font-size: 12px;
  font-weight: 600;
  border-radius: 5px;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  transition: all 0.15s;
}

.starter-card__preview {
  border: 1px solid #4d0e4e;
  background: #fff;
  color: #4d0e4e;
}

.starter-card__preview:hover:not(:disabled) {
  background: #f8f0f8;
}

.starter-card__preview:disabled {
  opacity: 0.5;
  cursor: default;
}

.starter-card__create {
  border: 1px solid #4d0e4e;
  background: #4d0e4e;
  color: #fff;
}

.starter-card__create:hover:not(:disabled) {
  background: #3a0b3b;
}

.starter-card__create:disabled {
  opacity: 0.5;
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
  margin-top: 0.25rem;
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
  color: #4d0e4e;
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
  border-color: #4d0e4e;
  box-shadow: 0 1px 4px rgba(77, 14, 78, 0.06);
}

.recent__item:disabled {
  opacity: 0.5;
  cursor: default;
}

.recent__icon {
  flex-shrink: 0;
  color: #4d0e4e;
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
  color: #c62828;
  background: #ffebee;
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
  border-color: #4d0e4e;
  box-shadow: 0 2px 8px rgba(77, 14, 78, 0.08);
}

.sample-card__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sample-card__icon {
  flex-shrink: 0;
  color: #4d0e4e;
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
  background: #f3e5f5;
  color: #4d0e4e;
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
  color: #4d0e4e;
}

/* ── Load from URL ── */

.home-url {
  width: 100%;
  text-align: center;
}

.home-url__label {
  margin: 0 0 0.5rem;
  font-size: 14px;
  color: #888;
}

.home-url__row {
  display: flex;
  gap: 0.5rem;
}

.home-url__input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 14px;
  font-family: system-ui, sans-serif;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #333;
  outline: none;
  transition: border-color 0.15s;
}

.home-url__input:focus {
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}

.home-url__btn {
  padding: 0.5rem 1rem;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  background: #4d0e4e;
  color: #fff;
  border: 1px solid #4d0e4e;
  transition: all 0.15s;
  font-family: system-ui, sans-serif;
}

.home-url__btn:hover:not(:disabled) {
  background: #3a0b3b;
}

.home-url__btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* ── Sandbox ── */

.sandbox {
  width: 100%;
  max-width: 860px;
}

.sandbox__card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  border: 2px solid #4d0e4e;
  border-radius: 16px;
  background: linear-gradient(135deg, #f8f0f8 0%, #fff 100%);
  text-align: center;
}

.sandbox__close {
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.sandbox__close:hover {
  color: #4d0e4e;
}

.sandbox__icon {
  font-size: 2.5rem;
  line-height: 1;
}

.sandbox__title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #4d0e4e;
}

.sandbox__desc {
  margin: 0;
  max-width: 480px;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.sandbox__btn {
  padding: 0.7rem 2rem;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  background: #4d0e4e;
  color: #fff;
  border: none;
  font-family: system-ui, sans-serif;
  transition: all 0.15s;
}

.sandbox__btn:hover:not(:disabled) {
  background: #3a0b3b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(77, 14, 78, 0.25);
}

.sandbox__btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* ── Toggle advanced ── */

.home__toggle-advanced {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: none;
  color: #888;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  padding: 0.5rem 1rem;
  margin-top: 0.5rem;
  transition: color 0.15s;
}

.home__toggle-advanced:hover {
  color: #4d0e4e;
}

.home__toggle-arrow {
  font-size: 10px;
}

/* ── Starter sample button ── */

.starter-card__sample {
  padding: 0.35rem 0.75rem;
  font-size: 12px;
  font-weight: 600;
  border-radius: 5px;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  transition: all 0.15s;
  border: 1px solid #7c3aed;
  background: #f5f3ff;
  color: #7c3aed;
}

.starter-card__sample:hover:not(:disabled) {
  background: #ede9fe;
}

.starter-card__sample:disabled {
  opacity: 0.5;
  cursor: default;
}

/* ── Community templates ── */

.community {
  width: 100%;
  max-width: 860px;
  padding: 1.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: #fafafa;
}

.community__title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
}

.community__desc {
  margin: 0 0 1rem;
  font-size: 14px;
  color: #888;
  line-height: 1.5;
}

.community__url {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.community__input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 14px;
  font-family: system-ui, sans-serif;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #333;
  outline: none;
  transition: border-color 0.15s;
}

.community__input:focus {
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}

.community__btn {
  padding: 0.5rem 1rem;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  background: #4d0e4e;
  color: #fff;
  border: 1px solid #4d0e4e;
  transition: all 0.15s;
  font-family: system-ui, sans-serif;
  white-space: nowrap;
}

.community__btn:hover:not(:disabled) {
  background: #3a0b3b;
}

.community__btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.community__docs {
  margin: 0;
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

.community__docs a {
  color: #4d0e4e;
  font-weight: 600;
  text-decoration: none;
}

.community__docs a:hover {
  text-decoration: underline;
}
</style>
