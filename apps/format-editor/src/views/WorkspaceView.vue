<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from '../components/layout/Header.vue'
import LeftSidebar from '../components/layout/LeftSidebar.vue'
import RightGuidanceSidebar from '../components/layout/RightGuidanceSidebar.vue'
import BlockFeed from '../components/editor/BlockFeed.vue'
import TextEditor from '../components/editor/TextEditor.vue'
import TreeEditor from '../components/editor/TreeEditor.vue'
import GraphViewer from '../components/editor/GraphViewer.vue'
import MatricesGrid from '../components/editor/MatricesGrid.vue'
import MetamatrixConfig from '../components/editor/MetamatrixConfig.vue'
import ModelInfoPanel from '../components/editor/ModelInfoPanel.vue'
import ValidationReport from '../components/ValidationReport.vue'
import ToastMessage from '../components/ToastMessage.vue'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useModelStore } from '../stores/modelStore'
import { useUiStore, type ActiveView } from '../stores/uiStore'
import { validateFormatContent } from '../shared/validator'
import type { ValidationReport as ValidationReportType } from '../shared/validation-types'
import { useToast } from '../shared/useToast'
import { useHashSync } from '../composables/useHashSync'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const modelStore = useModelStore()
const uiStore = useUiStore()
const { show } = useToast()

// ── Hash sync ──
// Syncs uiStore.selectedNodeId with the URL hash (#conceptName.elementName)
useHashSync()

// ── Toolbar / validation state ──
const validationReport = ref<ValidationReportType | null>(null)
const validating = ref(false)

// ── Derived ──
const selectedNodeId = computed(() => uiStore.selectedNodeId)

const selectedNode = computed(() =>
  selectedNodeId.value ? modelStore.getNode(selectedNodeId.value) : null
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

const conceptBlock = computed(() => {
  const node = selectedNode.value
  if (!node) return { id: '', name: '', description: '' }
  return {
    id: node.id,
    name: node.name,
    description: '',
    fields: Object.fromEntries(
      Object.entries(node.fields).map(([k, fv]) => [k, fv.value])
    ),
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
  validationReport.value = null

  try {
    const node = modelStore.getNode(selectedNodeId.value)
    if (!node) {
      show('Selected node not found in model store.', 'error')
      return
    }

    const rawContent = node.rawContent
    if (!rawContent) {
      show('No raw content available for this node (it may be a nested element without its own file).', 'warning')
      return
    }

    const fileName = node.source.path.split('/').pop() || node.source.path

    const report = validateFormatContent(rawContent, fileName)
    validationReport.value = report

    const { errors, warnings, total, passed } = report.summary
    if (errors === 0 && warnings === 0) {
      show(`Validation passed (${passed}/${total} checks).`, 'success')
    } else if (errors > 0) {
      show(`Validation found ${errors} error(s), ${warnings} warning(s).`, 'error')
    } else {
      show(`Validation passed with ${warnings} warning(s).`, 'warning')
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

function onKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    workspaceStore.saveActiveFile().catch(() => {
      show('Save failed.', 'error')
    })
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
        <div class="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60">
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            @click="closeWorkspace"
          >
            &larr; Home
          </button>

          <!-- View switcher -->
          <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
            <button
              v-for="view in (['editor', 'graph', 'matrices', 'info'] as const)"
              :key="view"
              class="px-2.5 py-1 text-xs font-medium rounded transition-all cursor-pointer capitalize"
              :class="uiStore.activeView === view
                ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
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
            {{ selectedNodeId ? `Selected: ${modelStore.getNode(selectedNodeId)?.name ?? selectedNodeId}` : 'No node selected' }}
          </span>
        </div>

        <!-- ── Editor View ── -->
        <template v-if="uiStore.activeView === 'editor'">
          <div v-if="selectedNodeId && !validationReport" class="flex-1 p-4 overflow-y-auto">
            <!-- Text content node → TextEditor -->
            <TextEditor
              v-if="editorView === 'text'"
              :node-id="selectedNodeId"
              :concept-name="selectedNodeName"
              :concept-type="selectedNodeType"
              @change="onEditorChange"
            />

            <!-- Structural node with children → TreeEditor -->
            <TreeEditor
              v-else-if="editorView === 'tree'"
              :node-id="selectedNodeId"
              :concept-name="selectedNodeName"
              @navigate-to-node="onNavigateToNode"
            />

            <!-- Concept/simple node → BlockFeed with BlockSheet -->
            <BlockFeed
              v-else
              :concept-name="selectedNodeName"
              :concept-type="selectedNodeType"
              :concept-block="conceptBlock"
              :items="[]"
              :is-list-concept="false"
              @change-concept="onEditorChange"
            />
          </div>

          <div v-else-if="validationReport" class="flex-1 p-4 overflow-y-auto">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold">Validation Report</h3>
              <button
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                @click="validationReport = null"
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
            <ModelInfoPanel
              v-if="rootNode"
              :root-node-id="rootNode.id"
            />
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
