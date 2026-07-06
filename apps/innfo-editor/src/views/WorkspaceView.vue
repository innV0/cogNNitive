<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import Header from '../components/layout/Header.vue'
import LeftSidebar from '../components/layout/LeftSidebar.vue'
import RightGuidanceSidebar from '../components/layout/RightGuidanceSidebar.vue'
import ValidationReport from '../components/ValidationReport.vue'
import ToastMessage from '../components/ToastMessage.vue'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useModelStore } from '../stores/modelStore'
import { useUiStore, type ActiveView } from '../stores/uiStore'
import type { ValidationReport as ValidationReportType } from '../shared/validation-types'
import { useToast } from '../shared/useToast'
import { useHashSync } from '../composables/useHashSync'
import { AlertTriangle, X } from 'lucide-vue-next'
import { ValidationService } from '../services/ValidationService'

// Dynamic sub-editors
const BlockFeed = defineAsyncComponent(() => import('../components/editor/BlockFeed.vue'))
const TextEditor = defineAsyncComponent(() => import('../components/editor/TextEditor.vue'))
const TreeEditor = defineAsyncComponent(() => import('../components/editor/TreeEditor.vue'))
const GraphViewer = defineAsyncComponent(() => import('../components/editor/GraphViewer.vue'))
const MatricesGrid = defineAsyncComponent(() => import('../components/editor/MatricesGrid.vue'))
const MetamatrixConfig = defineAsyncComponent(
  () => import('../components/editor/MetamatrixConfig.vue'),
)
const ModelInfoPanel = defineAsyncComponent(() => import('../components/editor/ModelInfoPanel.vue'))

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const modelStore = useModelStore()
const uiStore = useUiStore()
const { show } = useToast()
const validationService = new ValidationService(modelStore, show)

// ── Hash sync ──
// Syncs uiStore.selectedNodeId with the URL hash (#conceptName.elementName)
useHashSync()

// ── Toolbar / validation state ──
const validationReport = computed(() => modelStore.validationReport)
const validating = ref(false)

// Watch validation report to automatically show the report if errors are present on load
watch(
  () => modelStore.validationReport,
  (newReport) => {
    if (newReport && newReport.summary.errors > 0) {
      uiStore.setShowValidationReport(true)
    }
  },
  { immediate: true }
)

// ── Derived ──
const selectedNodeId = computed(() => uiStore.selectedNodeId)

const selectedNode = computed(() =>
  selectedNodeId.value ? modelStore.getNode(selectedNodeId.value) : null,
)

const selectedNodeName = computed(() => selectedNode.value?.name ?? '')
const selectedNodeType = computed(() => selectedNode.value?.type ?? 'text')
const conceptType = computed(() => {
  return selectedNode.value?.conceptBinding?.name ?? selectedNode.value?.type ?? null
})
const rootNode = computed(() => {
  const ids = modelStore.rootIds
  return ids.length > 0 ? modelStore.getNode(ids[0]) : null
})

/** Determines which editor sub-view to render based on node characteristics. */
const editorView = computed<'text' | 'tree' | 'sheet'>(() => {
  if (!selectedNode.value) return 'sheet'
  // Nodes with rawContent get the TextEditor (FILE-mode)
  if (selectedNode.value.rawContent) return 'text'
  // Nodes with children get the TreeEditor (structural)
  if (selectedNode.value.childIds.length > 0) return 'tree'
  // Everything else gets a BlockSheet view
  return 'sheet'
})

const activeConceptFields = computed(() => {
  const node = selectedNode.value
  if (!node?.fields) return []
  return Object.keys(node.fields).map((key) => {
    const val = node.fields[key].value
    const rawType = typeof val
    let type = rawType === 'boolean' ? 'boolean' : 'string'
    if (rawType === 'number') {
      type = Number.isInteger(val) && val >= 1 && val <= 5 ? 'rating' : 'number'
    } else if (rawType === 'string') {
      if (/^#[0-9a-fA-F]{6}$/.test(val)) type = 'color'
      else if (/^https?:\/\//.test(val)) type = 'url'
      else if (/^\d{4}-\d{2}-\d{2}$/.test(val)) type = 'date'
    }
    return { name: key, type }
  })
})

const conceptBlock = computed(() => {
  const node = selectedNode.value
  if (!node) return { id: '', name: '', description: '' }
  return {
    id: node.id,
    name: node.name,
    description: node.rawSections?.description || '',
    fields: Object.fromEntries(Object.entries(node.fields).map(([k, fv]) => [k, fv.value])),
  }
})

const activeEditorComponent = computed(() => {
  if (editorView.value === 'text') return TextEditor
  if (editorView.value === 'tree') return TreeEditor
  return BlockFeed
})

const activeEditorProps = computed(() => {
  if (editorView.value === 'text') {
    return {
      nodeId: selectedNodeId.value,
      conceptName: selectedNodeName.value,
      conceptType: selectedNodeType.value,
    }
  }
  if (editorView.value === 'tree') {
    return {
      nodeId: selectedNodeId.value,
      conceptName: selectedNodeName.value,
    }
  }
  return {
    conceptName: selectedNodeName.value,
    conceptType: selectedNodeType.value,
    conceptBlock: conceptBlock.value,
    conceptFields: activeConceptFields.value,
    items: [],
    isListConcept: false,
  }
})

const activeEditorEvents = computed(() => {
  if (editorView.value === 'text') {
    return {
      change: onEditorChange,
    }
  }
  if (editorView.value === 'tree') {
    return {
      'navigate-to-node': onNavigateToNode,
    }
  }
  return {
    'change-concept': onEditorChange,
  }
})

// ── Event handlers ──

function onSelectNode(nodeId: string): void {
  uiStore.selectNode(nodeId)
}

function onMoveUp(nodeId: string): void {
  const node = modelStore.getNode(nodeId)
  if (!node?.parentId) return
  modelStore.reorderChild(node.parentId, nodeId, -1)
}

function onMoveDown(nodeId: string): void {
  const node = modelStore.getNode(nodeId)
  if (!node?.parentId) return
  modelStore.reorderChild(node.parentId, nodeId, 1)
}

function onEditorChange(): void {
  // Editor changes are tracked through provenance — nothing extra needed
}

function onNavigateToNode(nodeId: string): void {
  uiStore.selectNode(nodeId)
}

/** Switches the active view (editor / graph / matrices / info). */
function setActiveView(view: ActiveView): void {
  uiStore.setActiveView(view)
  if (view === 'matrices' && uiStore.activeMatrixIndex < 0) {
    for (const id of modelStore.rootIds) {
      const root = modelStore.getNode(id)
      if (!root) continue
      const defs = root.fields?.__matrix_defs?.value ?? root.fields?.matrices?.value
      if (Array.isArray(defs) && defs.length > 0) {
        uiStore.setActiveMatrixIndex(0)
        break
      }
    }
  }
}

function onSelectMatrix(idx: number): void {
  uiStore.setActiveMatrixIndex(idx)
  uiStore.setActiveView('matrices')
}

function onSelectView(view: string): void {
  if (view === 'metamatrix-config') {
    uiStore.setActiveView('matrices')
    // We stay in matrices view which already shows MetamatrixConfig above MatricesGrid
  }
}

// ── Validation ──

async function runValidation(): Promise<void> {
  if (!selectedNodeId.value) return

  validating.value = true

  try {
    const report = await validationService.runValidation(selectedNodeId.value)
    modelStore.validationReport = report
    if (report) {
      uiStore.setShowValidationReport(true)
    }
  } catch (err) {
    show(err instanceof Error ? err.message : 'Validation failed', 'error')
  } finally {
    validating.value = false
  }
}

/** Resets the workspace and returns to home. */
function closeWorkspace(): void {
  workspaceStore.reset()
  modelStore.setGraph({}, [])
  uiStore.selectNode(null)
  router.push('/')
}

// ── Keyboard shortcuts ──

  async function onKeydown(e: KeyboardEvent): Promise<void> {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      try {
        await workspaceStore.saveActiveFile()
        show('Saved successfully.', 'success')
      } catch {
        show('Save failed.', 'error')
      }
    }
  }

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="flex flex-col h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
    <Header />

    <div class="flex flex-1 overflow-hidden">
      <LeftSidebar
        @select-node="onSelectNode"
        @move-up="onMoveUp"
        @move-down="onMoveDown"
        @select-matrix="onSelectMatrix"
        @select-view="onSelectView"
      />

      <main class="flex-1 flex flex-col overflow-y-auto min-w-0">
        <!-- Toolbar -->
        <div
          class="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60"
        >
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            @click="closeWorkspace"
          >
            &larr; Home
          </button>

          <!-- View switcher -->
          <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
            <button
              v-for="view in ['editor', 'graph', 'matrices', 'info'] as const"
              :key="view"
              :data-testid="'view-switcher-' + view"
              class="px-2.5 py-1 text-xs font-medium rounded transition-all cursor-pointer capitalize"
              :class="
                uiStore.activeView === view
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              "
              @click="setActiveView(view)"
            >
              {{ view }}
            </button>
          </div>

          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-primary bg-white dark:bg-slate-800 text-primary hover:bg-primary hover:text-white dark:hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!selectedNodeId || validating"
            @click="runValidation"
          >
            {{ validating ? 'Validating\u2026' : 'Validate' }}
          </button>

          <span class="text-xs text-slate-400 dark:text-slate-500 ml-auto">
            {{
              selectedNodeId
                ? `Selected: ${modelStore.getNode(selectedNodeId)?.name ?? selectedNodeId}`
                : 'No node selected'
            }}
          </span>
        </div>

        <!-- ── Editor View ── -->
        <template v-if="uiStore.activeView === 'editor'">
          <div v-if="selectedNodeId && !uiStore.showValidationReport" class="flex-1 p-4 overflow-y-auto">
            <component
              :is="activeEditorComponent"
              v-bind="activeEditorProps"
              v-on="activeEditorEvents"
            />
          </div>

          <div v-else-if="uiStore.showValidationReport && validationReport" class="flex-1 p-4 overflow-y-auto">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold">Validation Report</h3>
              <button
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                @click="uiStore.setShowValidationReport(false)"
              >
                Back to editor
              </button>
            </div>
            <ValidationReport :report="validationReport" />
          </div>

          <p
            v-else
            class="flex-1 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500"
          >
            Select a node to edit or validate.
          </p>
        </template>

        <!-- ── Graph View ── -->
        <template v-else-if="uiStore.activeView === 'graph'">
          <div class="flex-1 flex flex-col min-h-0">
            <GraphViewer
              :local-node-id="selectedNodeId ?? ''"
              :auto-select-concept="selectedNodeType"
              @select-node="onNavigateToNode"
            />
          </div>
        </template>

        <!-- ── Matrices View ── -->
        <template v-else-if="uiStore.activeView === 'matrices'">
          <div class="flex-1 flex flex-col min-h-0 p-4 overflow-y-auto">
            <MetamatrixConfig class="mb-6" />
            <MatricesGrid
              :matrix-index="uiStore.activeMatrixIndex"
              @cell-change="(_key, _val) => {}"
            />
          </div>
        </template>

        <!-- ── Info View ── -->
        <template v-else-if="uiStore.activeView === 'info'">
          <div class="flex-1 p-4 overflow-y-auto">
            <ModelInfoPanel v-if="rootNode" :root-node-id="rootNode.id" />
            <p
              v-else
              class="flex items-center justify-center h-full text-sm text-slate-400 dark:text-slate-500"
            >
              No model loaded.
            </p>
          </div>
        </template>
      </main>

      <RightGuidanceSidebar
        :concept-name="selectedNodeId ? modelStore.getNode(selectedNodeId)?.name : null"
        :concept-type="conceptType"
      />

      <ToastMessage />
    </div>
  </div>
</template>
