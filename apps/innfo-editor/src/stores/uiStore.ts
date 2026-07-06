import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ActiveView = 'editor' | 'graph' | 'matrices' | 'info'

/**
 * UI-only state that does not belong in modelStore.
 *
 * Following the design decision: modelStore stays a clean data graph with zero
 * UI state. All view-only state (selected node, active perspective, active
 * view) lives in uiStore.
 */
export const useUiStore = defineStore('ui', () => {
  const activeConcept = ref<string | null>(null)
  const activePerspective = ref<string>('default')
  const activeView = ref<ActiveView>('editor')
  const selectedNodeId = ref<string | null>(null)
  const selectedInstanceId = ref<string | null>(null)
  const activeMatrixIndex = ref<number>(-1)
  const showValidationReport = ref(false)

  function setActiveConcept(name: string | null): void {
    activeConcept.value = name
  }

  function setActivePerspective(id: string): void {
    activePerspective.value = id
  }

  function setActiveView(view: ActiveView): void {
    activeView.value = view
  }

  function selectNode(id: string | null): void {
    selectedNodeId.value = id
  }

  function selectInstance(id: string | null): void {
    selectedInstanceId.value = id
  }

  function setActiveMatrixIndex(index: number): void {
    activeMatrixIndex.value = index
  }

  function setShowValidationReport(val: boolean): void {
    showValidationReport.value = val
  }

  return {
    activeConcept,
    activePerspective,
    activeView,
    selectedNodeId,
    selectedInstanceId,
    activeMatrixIndex,
    showValidationReport,
    setActiveConcept,
    setActivePerspective,
    setActiveView,
    selectNode,
    selectInstance,
    setActiveMatrixIndex,
    setShowValidationReport,
  }
})
