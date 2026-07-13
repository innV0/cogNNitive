import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ActiveView =
  'editor' | 'graph' | 'matrices' | 'info' | 'ai-guide' | 'exports' | 'import' | 'export'

export type AiTab = 'guide' | 'import' | 'export'

export type GhostFilterMode = 'model' | 'all'

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
  const showMetamatrixConfig = ref(false)
  const showSaveWorkspaceModal = ref(false)
  const showAiModal = ref(false)
  const activeAiTab = ref<AiTab>('guide')
  const ghostFilterMode = ref<GhostFilterMode>('all')

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

  function setShowSaveWorkspaceModal(val: boolean): void {
    showSaveWorkspaceModal.value = val
  }

  function setGhostFilterMode(mode: GhostFilterMode): void {
    ghostFilterMode.value = mode
  }

  function setShowAiModal(val: boolean): void {
    showAiModal.value = val
  }

  function setActiveAiTab(tab: AiTab): void {
    activeAiTab.value = tab
  }

  return {
    activeConcept,
    activePerspective,
    activeView,
    selectedNodeId,
    selectedInstanceId,
    activeMatrixIndex,
    showValidationReport,
    showMetamatrixConfig,
    showSaveWorkspaceModal,
    showAiModal,
    activeAiTab,
    ghostFilterMode,
    setActiveConcept,
    setActivePerspective,
    setActiveView,
    selectNode,
    selectInstance,
    setActiveMatrixIndex,
    setShowValidationReport,
    setShowSaveWorkspaceModal,
    setShowAiModal,
    setActiveAiTab,
    setGhostFilterMode,
  }
})
