<template>
  <aside
    data-testid="left-sidebar"
    class="relative border-r border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 flex flex-col overflow-y-auto shrink-0"
    :style="{ width: width + 'px' }"
  >
    <!-- Resize handle (right edge) -->
    <div
      @pointerdown="startResize"
      class="absolute top-0 right-0 z-30 h-full w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
      title="Drag to resize"
      data-testid="resize-handle"
    ></div>

    <div class="px-3 py-4 space-y-4">
      <!-- Graph View button -->
      <button
        class="w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-all text-left cursor-pointer text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent"
        @click="uiStore.setActiveView('graph')"
      >
        <LayoutDashboard class="w-4 h-4" />
        <span>Graph View</span>
      </button>

      <!-- Header with expand/collapse all -->
      <div class="flex items-center justify-between px-2">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Model
        </h2>
        <div class="flex items-center gap-2">
          <button
            @click="expandAll"
            class="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-2xs text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors flex items-center justify-center"
            title="Expand All"
            data-testid="expand-all"
          >
            <ChevronsDown class="w-3.5 h-3.5" />
          </button>
          <button
            @click="collapseAll"
            class="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-2xs text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors flex items-center justify-center"
            title="Collapse All"
            data-testid="collapse-all"
          >
            <ChevronsUp class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Ghost filter toggle (always visible) -->
      <div
        class="flex items-center gap-0.5 px-2 py-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-md mx-2"
        data-testid="ghost-filter-toggle"
      >
        <button
          v-for="opt in filterOptions"
          :key="opt.value"
          @click="uiStore.setGhostFilterMode(opt.value)"
          class="flex-1 text-2xs px-1.5 py-1 rounded transition-colors font-medium"
          :class="
            ghostFilterMode === opt.value
              ? 'bg-white dark:bg-slate-700 text-primary dark:text-primary-100 shadow-sm'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          "
          :data-testid="`filter-${opt.value}`"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Tree section: model-only, template-only, or merged all -->
      <div class="space-y-0.5">
        <!-- Model mode: only real tree -->
        <template v-if="ghostFilterMode === 'model'">
          <ConceptTreeNode
            v-for="root in roots"
            :key="root.id"
            :node-id="root.id"
            :selected-id="selectedId"
            :depth="0"
            :expanded-generation="expandedGeneration"
            group-by-concept
            @select="(id: string) => $emit('select-node', id)"
            @move-up="(id: string) => $emit('move-up', id)"
            @move-down="(id: string) => $emit('move-down', id)"
          />
          <p
            v-if="roots.length === 0"
            class="px-2 py-4 text-xs text-slate-400 dark:text-slate-500 italic text-center"
          >
            No nodes loaded
          </p>
        </template>

        <!-- Template mode: only ghost concepts -->
        <template v-else-if="ghostFilterMode === 'template'">
          <VirtualGroupNode
            v-for="ghost in metamodelStore.ghostConcepts"
            :key="`ghost:${ghost.name}`"
            :concept-name="ghost.name"
            :children="[]"
            :selected-id="selectedId"
            :ghost="true"
            @click-ghost="handleClickGhost"
          />
          <p
            v-if="metamodelStore.ghostConcepts.length === 0"
            class="px-2 py-4 text-xs text-slate-400 dark:text-slate-500 italic text-center"
          >
            All template concepts are present
          </p>
        </template>

        <!-- All mode: present + ghost concepts merged into a single sorted list -->
        <template v-else>
          <div
            v-for="item in mergedConcepts"
            :key="item.name"
          >
            <VirtualGroupNode
              :concept-name="item.name"
              :children="item.children"
              :selected-id="selectedId"
              :depth="0"
              :expanded-generation="expandedGeneration"
              :ghost="item.ghost"
              @select="(id: string) => $emit('select-node', id)"
              @click-ghost="handleClickGhost"
            />
          </div>
        </template>
      </div>

      <!-- Relations Section -->
      <div class="space-y-1">
        <div
          @click="relationsOpen = !relationsOpen"
          class="flex items-center justify-between px-2 py-1 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div class="flex items-center gap-2">
            <ChevronRight
              class="w-3.5 h-3.5 transition-transform duration-200"
              :class="{ 'rotate-90': relationsOpen }"
            />
            <Table2 class="w-3.5 h-3.5" />
            <h2
              class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Relations
            </h2>
          </div>
          <button
            @click.stop="navigateToConfig"
            class="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-primary transition-colors"
            title="Metamatrix Config"
          >
            <Settings class="w-3.5 h-3.5" />
          </button>
        </div>

        <div v-if="relationsOpen" class="space-y-0.5 pl-1">
          <MatrixPill
            v-for="(matrix, idx) in matrixDefs"
            :key="matrix.name"
            :name="matrix.name"
            :source="matrix.source"
            :target="matrix.target"
            :label="matrix.label"
            :selected="uiStore.activeMatrixIndex === idx"
            :full-width="true"
            interactive
            show-source-target
            as="button"
            @click="selectMatrix(idx)"
          />
          <p
            v-if="matrixDefs.length === 0"
            class="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic"
          >
            No relations defined.
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ModelNode } from '../../model/types'
import {
  ChevronsDown,
  ChevronsUp,
  LayoutDashboard,
  ChevronRight,
  Table2,
  Settings,
} from 'lucide-vue-next'
import { useModelStore } from '../../stores/modelStore'
import { useMetamodelStore } from '../../stores/metamodelStore'
import { useUiStore } from '../../stores/uiStore'
import type { GhostFilterMode } from '../../stores/uiStore'
import { useResizablePanel } from '../../composables/useResizablePanel'
import ConceptTreeNode from './ConceptTreeNode.vue'
import VirtualGroupNode from './VirtualGroupNode.vue'
import MatrixPill from '../editor/MatrixPill.vue'

const emit = defineEmits<{
  'select-node': [nodeId: string]
  'move-up': [nodeId: string]
  'move-down': [nodeId: string]
  'select-matrix': [idx: number]
  'select-view': [view: string]
}>()

const modelStore = useModelStore()
const metamodelStore = useMetamodelStore()
const uiStore = useUiStore()

const { width, startResize } = useResizablePanel({
  storageKey: 'format.leftSidebarWidth',
  defaultWidth: 384,
  minWidth: 240,
  maxWidth: 640,
  side: 'right',
})

const roots = computed(() => modelStore.getRoots())

const ghostFilterMode = computed(() => uiStore.ghostFilterMode)

const filterOptions: { value: GhostFilterMode; label: string }[] = [
  { value: 'model', label: 'Model' },
  { value: 'template', label: 'Template' },
  { value: 'all', label: 'All' },
]

interface MergedConceptItem {
  name: string
  ghost: boolean
  children: ModelNode[]
}

const mergedConcepts = computed<MergedConceptItem[]>(() => {
  const items: MergedConceptItem[] = []
  const seen = new Set<string>()

  // Collect children per concept type from all model nodes
  const childrenByType = new Map<string, ModelNode[]>()
  for (const node of Object.values(modelStore.nodes)) {
    if (node.type && node.kind === 'element') {
      const list = childrenByType.get(node.type)
      if (list) list.push(node)
      else childrenByType.set(node.type, [node])
    }
  }

  for (const concept of metamodelStore.concepts) {
    if (seen.has(concept.name)) continue
    seen.add(concept.name)
    const children = childrenByType.get(concept.name) ?? []
    const isPresent = children.length > 0 || (concept.type === 'text' && (
      // text concepts: check rawSections on root nodes
      modelStore.rootIds.some((rid) => {
        const root = modelStore.getNode(rid)
        return root?.rawSections && Object.keys(root.rawSections).some(
          (k) => k.toLowerCase() === concept.name.toLowerCase(),
        )
      })
    ))
    items.push({ name: concept.name, ghost: !isPresent, children })
  }

  // Sort by template declaration order (from metamodelStore.concepts)
  const orderIndex = new Map(metamodelStore.concepts.map((c, i) => [c.name, i]))
  items.sort((a, b) => (orderIndex.get(a.name) ?? 999) - (orderIndex.get(b.name) ?? 999))
  return items
})

function handleClickGhost(conceptName: string): void {
  const concept = metamodelStore.getConceptByName(conceptName)
  const type = concept?.type ?? 'text'
  if (type === 'text') {
    modelStore.addTextSection(conceptName)
    uiStore.selectNode(modelStore.rootIds[0])
  } else {
    const id = modelStore.addConceptElement(conceptName, `New ${conceptName}`)
    if (id) uiStore.selectNode(id)
  }
}

// Expand/collapse all via generation counter
const expandedGeneration = ref(-1)

function expandAll(): void {
  expandedGeneration.value = Math.max(0, expandedGeneration.value) + 1
}

function collapseAll(): void {
  expandedGeneration.value = Math.min(-1, expandedGeneration.value) - 1
}

// Selected node for highlighting — driven by uiStore in Phase 6
const selectedId = computed(() => uiStore.selectedNodeId)

// Relations section
const MATRIX_DEFS_KEY = '__matrix_defs'
const relationsOpen = ref(true)

function extractMatrixDefs(root: any): any[] {
  const defs = root.fields?.[MATRIX_DEFS_KEY]?.value
  if (Array.isArray(defs) && defs.length > 0) return defs
  const raw = root.fields?.matrices?.value
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((m: any) => ({
      name: m.name,
      source: m.source,
      target: m.target,
      widgetType: m.widgetType || 'text',
      params: m.params || '',
    }))
  }
  return []
}

const matrixDefs = computed(() => {
  const rootIds = modelStore.rootIds
  for (const id of rootIds) {
    const root = modelStore.getNode(id)
    if (!root) continue
    const defs = extractMatrixDefs(root)
    if (defs.length > 0) return defs
  }
  return []
})

function selectMatrix(idx: number): void {
  emit('select-matrix', idx)
  emit('select-view', 'matrices')
}

function navigateToConfig(): void {
  emit('select-view', 'metamatrix-config')
}
</script>
