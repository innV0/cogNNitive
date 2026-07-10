<template>
  <header
    class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-6 py-3 shrink-0"
  >
    <!-- Left Section: Logo and Versions (Spec, Template, Model) -->
    <div class="flex items-center gap-4 flex-1 min-w-0 mr-4">
      <div class="flex items-center gap-2 shrink-0">
        <span class="font-mono text-lg font-black text-primary select-none leading-none">_NN</span>
        <h1 class="text-sm font-semibold tracking-tight">iNNfo Modeler</h1>
      </div>

      <!-- Versions Section (Now styled as unified gray badges with info icon trigger) -->
      <div
        v-if="hasRootNode"
        class="flex items-center gap-2 text-2xs text-slate-500 dark:text-slate-400 shrink-0"
      >
        <!-- Spec Badge -->
        <div class="font-mono bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded flex items-center gap-1 select-none">
          <span class="font-sans font-bold text-slate-400 dark:text-slate-505 text-3xs uppercase tracking-wider">Spec</span>
          <span class="text-slate-750 dark:text-slate-250 text-2xs font-semibold">{{ specFileName }}</span>
        </div>

        <!-- Template Badge -->
        <div class="font-mono bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded flex items-center gap-1 select-none">
          <span class="font-sans font-bold text-slate-400 dark:text-slate-505 text-3xs uppercase tracking-wider">Template</span>
          <span class="text-slate-750 dark:text-slate-250 text-2xs font-semibold">{{ fullTemplateName }}</span>
        </div>

        <!-- Model Badge -->
        <div class="font-mono bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded flex items-center gap-1 select-none">
          <span class="font-sans font-bold text-slate-400 dark:text-slate-505 text-3xs uppercase tracking-wider">Model</span>
          <span class="text-slate-750 dark:text-slate-250 text-2xs font-semibold">{{ modelFileName }}</span>
        </div>

        <!-- Details Info Trigger Button -->
        <button
          @click="infoModalOpen = true"
          class="p-1 rounded text-slate-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
          title="Show model details"
        >
          <Info class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Right Section Actions -->
    <div class="flex items-center gap-2.5 shrink-0">
      <!-- Save Button with integrated Saved status -->
      <div class="relative" ref="saveDropdownRef">
        <div class="relative inline-flex rounded-md shadow-xs">
          <button
            @click="handleSave"
            :disabled="!shouldShowSave"
            class="inline-flex items-center gap-1.5 rounded-l-md px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-all cursor-pointer"
            :class="
              shouldShowSave
                ? 'bg-primary text-primary-foreground ring-primary/20 hover:bg-primary/90'
                : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 ring-emerald-600/20 cursor-default'
            "
          >
            <component :is="shouldShowSave ? Save : CheckCircle" class="w-3.5 h-3.5" />
            <span>{{ shouldShowSave ? 'Save' : 'Saved' }}</span>
          </button>
          <button
            @click="toggleSaveDropdown"
            class="inline-flex items-center rounded-r-md px-2 py-1.5 text-xs font-semibold ring-1 ring-inset transition-all cursor-pointer border-l"
            :class="
              shouldShowSave
                ? 'bg-primary text-primary-foreground ring-primary/20 border-primary-foreground/10 hover:bg-primary/90'
                : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 ring-emerald-600/20 border-emerald-250 dark:border-emerald-850 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40'
            "
          >
            <ChevronDown class="w-3.5 h-3.5" />
          </button>

          <!-- Save Dropdown -->
          <div
            v-if="saveDropdownOpen"
            class="absolute right-0 top-full mt-1.5 w-72 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-600 py-2 z-50"
          >
            <div class="px-3 pt-1">
              <div class="flex items-center justify-between mb-1.5">
                <span
                  class="flex items-center gap-1 text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                >
                  Model Version
                </span>
                <span class="font-mono text-xs font-semibold text-primary">{{ modelVersion }}</span>
              </div>
              <p
                v-if="bumpError"
                class="text-2xs text-red-650 dark:text-red-400 mb-1.5 leading-tight"
              >
                {{ bumpError }}
              </p>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  v-for="lvl in ['major', 'minor', 'patch'] as const"
                  :key="lvl"
                  @click="bumpVersion(lvl)"
                  class="rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-1.5 text-2xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer capitalize"
                >
                  {{ lvl }}
                </button>
              </div>
              <p class="text-2xs text-slate-400 dark:text-slate-500 mt-1.5 leading-tight">
                Saves a new versioned file, keeping the current one.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Validation Status Badge/Link -->
      <button
        v-if="hasRootNode"
        @click="openValidationReport"
        class="inline-flex items-center gap-1 px-1.5 py-1 text-xs font-bold transition-all cursor-pointer"
        :class="statusClass"
        :title="statusTitle"
      >
        <component :is="statusIcon" class="w-4 h-4" />
        <span v-if="statusText" class="font-mono text-2xs font-bold">{{ statusText }}</span>
      </button>

      <!-- Info button -->
      <button
        @click="uiStore.setActiveView('info')"
        class="p-1.5 rounded transition-colors cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        :class="uiStore.activeView === 'info' ? 'bg-primary/10 text-primary' : ''"
        title="View Model Info"
      >
        <Info class="w-4 h-4" />
      </button>

      <!-- External links -->
      <div class="flex items-center gap-0.5 pl-1.5">
        <a
          href="https://format.innv0.com"
          target="_blank"
          rel="noopener noreferrer"
          class="px-2 py-1 rounded text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
          >Web</a
        >
        <a
          href="https://format.innv0.com/documentation/"
          target="_blank"
          rel="noopener noreferrer"
          class="px-2 py-1 rounded text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
          >Docs</a
        >
      </div>
    </div>

    <!-- Model Details Modal Dialog -->
    <Transition name="fade">
      <div
        v-if="infoModalOpen"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        @click.self="infoModalOpen = false"
      >
        <div
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-in"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/55">
            <div class="flex items-center gap-2">
              <Info class="w-5 h-5 text-primary" />
              <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Model File Details</h2>
            </div>
            <button
              @click="infoModalOpen = false"
              class="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-5 flex flex-col gap-4 text-xs overflow-y-auto max-h-[75vh]">
            <!-- Status Alert Card -->
            <div class="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-lg p-3.5">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-slate-850 dark:text-slate-200">Local Status:</span>
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-3xs font-semibold ring-1 ring-inset"
                  :class="workspaceStore.hasHandle
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 ring-amber-600/20'"
                >
                  {{ workspaceStore.hasHandle ? 'Downloaded & Synced' : 'Loaded from URL (Pending Save)' }}
                </span>
              </div>
              <p class="text-slate-505 dark:text-slate-400 leading-normal">
                {{ workspaceStore.hasHandle
                  ? `This model is loaded from your local directory: "${workspaceStore.handle?.name}". All changes are saved directly to your local file system.`
                  : 'This model is currently loaded directly from a remote GitHub repository URL. Any edits are only in memory and won\'t be saved permanently until you download it.' }}
              </p>
              
              <!-- Instructions for saving -->
              <div
                v-if="!workspaceStore.hasHandle"
                class="border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5 mt-2.5"
              >
                <span class="font-semibold text-slate-700 dark:text-slate-300 block mb-1">How to save the model:</span>
                <p class="text-slate-505 dark:text-slate-400 leading-normal">
                  Click the <strong class="text-slate-700 dark:text-slate-300">Save</strong> button (or <strong class="text-slate-700 dark:text-slate-300">Ctrl+S</strong>) in the top-right header. You will be prompted to choose a local directory on your device. The editor will then download and save all template and model files into that folder, setting up your offline workspace.
                </p>
              </div>
            </div>

            <!-- Locations Info list -->
            <div class="flex flex-col gap-3">
              <!-- 1. Spec Info -->
              <div class="border border-slate-100 dark:border-slate-850 rounded-lg p-3 bg-white dark:bg-slate-900">
                <span class="font-bold text-slate-800 dark:text-slate-200 block mb-1">1. Spec</span>
                <div class="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 mt-1.5 font-mono text-3xs text-slate-500">
                  <span class="font-sans font-medium text-slate-400">Filename:</span>
                  <span class="text-slate-750 dark:text-slate-300 break-all select-all font-semibold">{{ specFileName }}</span>
                  <span class="font-sans font-medium text-slate-400">Remote URL:</span>
                  <a
                    :href="`https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/iNNfo_${formatVersion}_NN.md`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline break-all select-all font-semibold"
                  >
                    https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/iNNfo_{{ formatVersion }}_NN.md
                  </a>
                </div>
              </div>

              <!-- 2. Template Info -->
              <div class="border border-slate-100 dark:border-slate-850 rounded-lg p-3 bg-white dark:bg-slate-900">
                <span class="font-bold text-slate-800 dark:text-slate-200 block mb-1">2. Template</span>
                <p class="text-3xs text-slate-500 dark:text-slate-400 leading-normal mb-2 mt-0.5 font-sans">
                  <span v-if="templateRemoteUrl" class="text-slate-500 dark:text-slate-400">
                    <span v-if="workspaceStore.hasHandle">
                      You are using a local template, downloaded from a remote URL. The model references it in the same folder to guarantee your technological sovereignty—ensuring you always own it and can always use it.
                    </span>
                    <span v-else>
                      You are currently using a remote template. When you save this model locally, the template will be downloaded to the same folder to guarantee your technological sovereignty—ensuring you always own it and can always use it.
                    </span>
                  </span>
                  <span v-else class="text-slate-500 dark:text-slate-400">
                    This document does not use an external template. Instead, it incorporates both the model and the template within the same file, making it 100% self-contained.
                  </span>
                </p>
                <div class="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 mt-1.5 font-mono text-3xs text-slate-500">
                  <span class="font-sans font-medium text-slate-400">Name:</span>
                  <span class="text-slate-750 dark:text-slate-300 break-all select-all font-semibold">{{ fullTemplateName || '—' }}</span>
                  <span class="font-sans font-medium text-slate-400">Remote URL:</span>
                  <template v-if="templateRemoteUrl">
                    <a
                      :href="templateRemoteUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary hover:underline break-all select-all font-semibold"
                    >
                      {{ templateRemoteUrl }}
                    </a>
                  </template>
                  <span v-else class="text-slate-750 dark:text-slate-300 break-all select-all">—</span>
                </div>
              </div>

              <!-- 3. Model Info -->
              <div class="border border-slate-100 dark:border-slate-850 rounded-lg p-3 bg-white dark:bg-slate-900">
                <span class="font-bold text-slate-800 dark:text-slate-200 block mb-1">3. Model</span>
                <div class="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 mt-1.5 font-mono text-3xs text-slate-500">
                  <span class="font-sans font-medium text-slate-400">Filename:</span>
                  <span class="text-slate-750 dark:text-slate-205 break-all select-all font-semibold">{{ modelFileName }}</span>
                  <span class="font-sans font-medium text-slate-400">{{ workspaceStore.hasHandle ? 'Local Path:' : 'Source URL:' }}</span>
                  <template v-if="workspaceStore.hasHandle">
                    <span class="text-slate-750 dark:text-slate-300 break-all select-all font-semibold">{{ displayLocalPath }}</span>
                  </template>
                  <template v-else>
                    <a
                      :href="filePath"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary hover:underline break-all select-all font-semibold"
                    >
                      {{ filePath }}
                    </a>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="flex items-center justify-end px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/55">
            <button
              @click="infoModalOpen = false"
              class="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-300 rounded-md font-semibold cursor-pointer transition-colors text-2xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Copy, Save, ChevronDown, Info, CheckCircle, AlertTriangle, XCircle, Check, X } from 'lucide-vue-next'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useModelStore } from '../../stores/modelStore'
import { useUiStore } from '../../stores/uiStore'
import {
  DEFAULT_INNFO_VERSION,
  DEFAULT_TEMPLATE_NAME,
  DEFAULT_TEMPLATE_VERSION,
} from '../../utils/constants'
import { useToast } from '../../shared/useToast'

const workspaceStore = useWorkspaceStore()
const { show } = useToast()
const modelStore = useModelStore()
const uiStore = useUiStore()

const hasErrors = computed(() => (modelStore.validationReport?.summary.errors ?? 0) > 0)
const hasWarnings = computed(
  () =>
    (modelStore.validationReport?.summary.warnings ?? 0) > 0 || modelStore.parseIssues.length > 0,
)
const isOk = computed(() => !hasErrors.value && !hasWarnings.value)
const totalErrors = computed(() => modelStore.validationReport?.summary.errors ?? 0)
const totalWarnings = computed(
  () => (modelStore.validationReport?.summary.warnings ?? 0) + modelStore.parseIssues.length,
)

const statusClass = computed(() => {
  if (hasErrors.value) {
    return 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
  }
  if (hasWarnings.value) {
    return 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'
  }
  return 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
})

const statusIcon = computed(() => {
  if (hasErrors.value) return XCircle
  if (hasWarnings.value) return AlertTriangle
  return CheckCircle
})

const statusText = computed(() => {
  if (hasErrors.value) return `${totalErrors.value}`
  if (hasWarnings.value) return `${totalWarnings.value}`
  return ''
})

const statusTitle = computed(() => {
  if (hasErrors.value) return 'Model is incorrect: click to view validation errors'
  if (hasWarnings.value) return 'Model loaded with warnings: click to view details'
  return 'Model is valid: click to view full report'
})

function openValidationReport(): void {
  uiStore.setActiveView('editor')
  uiStore.setShowValidationReport(true)
}

const saveDropdownOpen = ref(false)
const saveDropdownRef = ref<HTMLElement | null>(null)
const bumpError = ref('')

// ── Root node frontmatter extraction ────────────────────────────

const rootNode = computed(() => {
  const ids = modelStore.rootIds
  if (ids.length === 0) return null
  return modelStore.getNode(ids[0])
})

const hasRootNode = computed(() => rootNode.value !== null)

const filePath = computed(() => {
  const node = rootNode.value
  if (!node?.source?.path) return ''
  return node.source.path
})

const formatVersion = computed(() => {
  const node = rootNode.value
  return (node?.fields?.format_version?.value ??
    node?.fields?.spec_version?.value ??
    DEFAULT_INNFO_VERSION) as string
})

const templateName = computed(() => {
  const node = rootNode.value
  return (node?.fields?.template_name?.value ??
    (node?.fields?.parent_spec?.value as any)?.name ??
    (node?.fields?.parent?.value as any)?.name ??
    DEFAULT_TEMPLATE_NAME) as string
})

const templateVersion = computed(() => {
  const node = rootNode.value
  const tVal =
    node?.fields?.template_version?.value ??
    (node?.fields?.parent?.value as any)?.version ??
    DEFAULT_TEMPLATE_VERSION
  return ((node?.fields?.template?.value as any)?.version ?? tVal) as string
})

const cleanTemplateName = (name: string): string => {
  if (!name) return ''
  return name.replace(/_V_?\d+[-_]\d+[-_]\d+.*$/i, '').replace(/_NN$/i, '')
}

const fullTemplateName = computed(() => {
  const name = templateName.value || ''
  if (!name || name.toLowerCase() === 'template') {
    return templateVersion.value || DEFAULT_TEMPLATE_VERSION
  }
  const hasVersion = /_V_?\d+/i.test(name)
  if (hasVersion || !templateVersion.value) {
    return name
  }
  return `${name}_${templateVersion.value}`
})

const modelFileName = computed(() => {
  const path = filePath.value || ''
  if (!path) return 'model.md'
  return path.split('/').pop()?.split('\\').pop() || path
})

const specFileName = computed(() => {
  return `iNNfo_${formatVersion.value}_NN.md`
})

const templateRemoteUrl = computed(() => {
  const node = rootNode.value
  return ((node?.fields?.parent_spec?.value as any)?.url ??
    (node?.fields?.parent?.value as any)?.url ??
    '') as string
})

const modelVersion = computed(() => {
  const node = rootNode.value
  return (node?.fields?.version?.value ?? node?.fields?.model_version?.value ?? '—') as string
})

const displayLocalPath = computed(() => {
  if (!workspaceStore.hasHandle) return ''
  const wsName = workspaceStore.handle?.name || ''
  const fullPath = filePath.value || ''
  
  if (!wsName) return fullPath
  
  // Find the workspace name in the absolute path
  const wsIndex = fullPath.indexOf('/' + wsName + '/')
  const wsBackslashIndex = fullPath.indexOf('\\' + wsName + '\\')
  
  if (wsIndex !== -1) {
    return '... / ' + wsName + fullPath.slice(wsIndex + wsName.length + 1)
  } else if (wsBackslashIndex !== -1) {
    const rel = fullPath.slice(wsBackslashIndex + wsName.length + 1).replace(/\\/g, '/')
    return '... / ' + wsName + '/' + rel
  }
  
  const parts = fullPath.replace(/\\/g, '/').split('/')
  if (parts.length > 2) {
    return '... / ' + parts.slice(-2).join('/')
  }
  return '... / ' + fullPath
})

const unsavedChanges = computed(() => modelStore.dirtyIds.size > 0)
const shouldShowSave = computed(() => unsavedChanges.value || !workspaceStore.hasHandle)

const infoModalOpen = ref(false)

// ── Save flow ───────────────────────────────────────────────────

async function handleSave(): Promise<void> {
  if (!hasRootNode.value) return
  if (!workspaceStore.hasHandle) {
    uiStore.setShowSaveWorkspaceModal(true)
    saveDropdownOpen.value = false
    return
  }
  try {
    await workspaceStore.saveActiveFile()
    saveDropdownOpen.value = false
    show('Saved successfully.', 'success')
  } catch (err) {
    bumpError.value = err instanceof Error ? err.message : 'Save failed'
  }
}

async function bumpVersion(level: 'major' | 'minor' | 'patch'): Promise<void> {
  bumpError.value = ''
  if (!hasRootNode.value) return
  if (!workspaceStore.hasHandle) {
    uiStore.setShowSaveWorkspaceModal(true)
    saveDropdownOpen.value = false
    return
  }
  try {
    await workspaceStore.saveActiveFileWithVersionBump(level)
    saveDropdownOpen.value = false
    show('Version bumped to ' + modelVersion.value, 'success')
  } catch (err) {
    bumpError.value = err instanceof Error ? err.message : 'Version bump failed'
  }
}

// ── Dropdown ────────────────────────────────────────────────────

function toggleSaveDropdown(): void {
  bumpError.value = ''
  saveDropdownOpen.value = !saveDropdownOpen.value
}

function closeDropdown(e: MouseEvent): void {
  if (saveDropdownRef.value && !saveDropdownRef.value.contains(e.target as Node)) {
    saveDropdownOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown)
})

// ── Clipboard ───────────────────────────────────────────────────

const copied = ref(false)

async function copyFilePath(): Promise<void> {
  if (filePath.value) {
    try {
      await navigator.clipboard.writeText(filePath.value)
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch {
      // clipboard not available
    }
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes scale-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
