<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import SidebarTree from '../components/SidebarTree.vue'
import NodeForm from '../components/NodeForm.vue'
import ValidationReport from '../components/ValidationReport.vue'
import ToastMessage from '../components/ToastMessage.vue'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useModelStore } from '../stores/modelStore'
import { validateFormatContent } from '../shared/validator'
import type { ValidationReport as ValidationReportType } from '../shared/validation-types'
import { useToast } from '../shared/useToast'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const modelStore = useModelStore()
const { show } = useToast()

/**
 * Wires the unified navigation tree to the metamodel-driven form: selecting
 * any node in SidebarTree updates NodeForm to that node's resolved fields;
 * switching selection replaces stale prior-node fields (R14).
 */
const selectedNodeId = ref<string | null>(null)

// ── Validation state ──
const validationReport = ref<ValidationReportType | null>(null)
const validating = ref(false)

function onSelect(nodeId: string): void {
  selectedNodeId.value = nodeId
}

/** Runs FORMAT compliance validation on the selected node's raw content. */
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

    const mode = node.storageMode === 'FOLDER' ? 'FOLDER' : 'FILE'
    const fileName = node.source.path.split('/').pop() || node.source.path

    const report = validateFormatContent(rawContent, fileName, mode)
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
  router.push('/')
}
</script>

<template>
  <div class="workspace">
    <aside class="workspace__sidebar">
      <div class="workspace__sidebar-header">
        <SidebarTree @select="onSelect" />
      </div>
    </aside>
    <main class="workspace__main">
      <div class="workspace__toolbar">
        <button class="toolbar__btn" @click="closeWorkspace" title="Close workspace">
          &larr; Home
        </button>
        <button
          class="toolbar__btn toolbar__btn--validate"
          :disabled="!selectedNodeId || validating"
          @click="runValidation"
        >
          {{ validating ? 'Validating\u2026' : 'Validate' }}
        </button>
      </div>

      <div v-if="selectedNodeId && !validationReport" class="workspace__editor">
        <NodeForm :node-id="selectedNodeId" />
      </div>

      <div v-else-if="validationReport" class="workspace__validation">
        <div class="workspace__validation-header">
          <h3>Validation Report</h3>
          <button class="toolbar__btn" @click="validationReport = null">Back to editor</button>
        </div>
        <ValidationReport :report="validationReport" />
      </div>

      <p v-else class="workspace__empty-state">Select a node to edit or validate.</p>
    </main>
    <ToastMessage />
  </div>
</template>

<style scoped>
.workspace {
  display: flex;
  height: 100vh;
}

.workspace__sidebar {
  width: 280px;
  border-right: 1px solid var(--border-soft, #e0e0e0);
  overflow-y: auto;
}

.workspace__sidebar-header {
  padding: 0.5rem;
}

.workspace__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.workspace__toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-soft, #e0e0e0);
  background: var(--canvas-base, #fafafa);
}

.toolbar__btn {
  padding: 0.4rem 0.8rem;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  transition: all 0.15s;
}

.toolbar__btn:hover:not(:disabled) {
  border-color: #4D0E4E;
  color: #4D0E4E;
}

.toolbar__btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.toolbar__btn--validate {
  border-color: #4D0E4E;
  color: #4D0E4E;
}

.toolbar__btn--validate:hover:not(:disabled) {
  background: #4D0E4E;
  color: #fff;
}

.workspace__editor {
  flex: 1;
  padding: 1rem;
}

.workspace__validation {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.workspace__validation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.workspace__validation-header h3 {
  margin: 0;
  font-size: 16px;
}

.workspace__empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-muted, #999);
  font-size: 14px;
}
</style>
