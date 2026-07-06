<template>
  <div data-testid="concept-tree-node" class="select-none">
    <!-- ── Node row ── -->
    <div
      class="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs group cursor-pointer"
      :class="rowClasses"
      :style="rowStyle"
      @click="onSelect"
    >
      <!-- Expand/collapse chevron or spacer -->
      <button
        v-if="hasChildren"
        @click.stop="toggleCollapse"
        class="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors flex items-center justify-center shrink-0"
        :title="isCollapsed ? 'Expand' : 'Collapse'"
      >
        <ChevronDown
          class="transition-transform duration-200 w-3.5 h-3.5"
          :class="{ '-rotate-90': isCollapsed }"
        />
      </button>
      <span v-else class="w-5 shrink-0"></span>

      <!-- BlockPill: colored pill with icon + name + YIQ text + markers + info popup -->
      <BlockPill
        :node-id="nodeId"
        :name="node?.name ?? '(unknown)'"
        :kind="isConceptLike ? 'concept' : 'instance'"
        :concept-type="node?.type"
        :selected="isSelected"
        :block-id="nodeId"
        :description="description"
        :fields="fields"
        :concept-fields="conceptFields"
        :instance-count="instanceCount"
        :show-markers="true"
        :interactive="false"
        :full-width="true"
        class="flex-1 min-w-0"
      />

      <!-- Instance counter badge -->
      <span
        v-if="instanceCount > 0"
        class="text-2xs px-1.5 py-0.5 rounded-full shrink-0 font-medium tabular-nums"
        :style="{
          backgroundColor: nodeColorHex + '18',
          color: nodeColorHex,
        }"
      >
        {{ instanceCount }}
      </span>

      <!-- Kind badge (only non-standard kinds) -->
      <span
        v-if="node?.kind && node.kind !== 'root' && node.kind !== 'element'"
        class="text-2xs px-1 py-0.5 rounded shrink-0 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600"
      >
        {{ node.kind }}
      </span>

      <!-- Move up -->
      <button
        v-if="depth !== undefined && depth > 0"
        @click.stop="$emit('move-up', nodeId)"
        class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all shrink-0"
        title="Move up"
      >
        <ChevronUp class="w-3 h-3" />
      </button>

      <!-- Move down -->
      <button
        v-if="depth !== undefined"
        @click.stop="$emit('move-down', nodeId)"
        class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all shrink-0"
        title="Move down"
      >
        <ChevronDown class="w-3 h-3" />
      </button>
    </div>

    <!-- ── Children (recursive, with optional virtual grouping) ── -->
    <div
      v-if="hasChildren && !isCollapsed"
      class="ml-3 pl-2 border-l border-slate-200 dark:border-slate-700 space-y-0.5"
    >
      <!-- When groupByConcept is set, group flat elements by their type -->
      <template v-if="props.groupByConcept">
        <template v-for="item in groupedChildren" :key="item.key">
          <VirtualGroupNode
            v-if="item.kind === 'vg'"
            :concept-name="item.name"
            :children="item.nodes"
            :selected-id="selectedId"
            :depth="(depth ?? 0) + 1"
            :expanded-generation="expandedGeneration"
            @select="(id: string) => $emit('select', id)"
            @move-up="(id: string) => $emit('move-up', id)"
            @move-down="(id: string) => $emit('move-down', id)"
          />
          <ConceptTreeNode
            v-else
            :node-id="item.nodeId"
            :selected-id="selectedId"
            :depth="(depth ?? 0) + 1"
            :expanded-generation="expandedGeneration"
            @select="(id: string) => $emit('select', id)"
            @move-up="(id: string) => $emit('move-up', id)"
            @move-down="(id: string) => $emit('move-down', id)"
          />
        </template>
      </template>

      <!-- Standard recursive children (no grouping) -->
      <ConceptTreeNode
        v-for="child in children"
        v-else
        :key="child.id"
        :node-id="child.id"
        :selected-id="selectedId"
        :depth="(depth ?? 0) + 1"
        :expanded-generation="expandedGeneration"
        @select="(id: string) => $emit('select', id)"
        @move-up="(id: string) => $emit('move-up', id)"
        @move-down="(id: string) => $emit('move-down', id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import { useModelStore } from '../../stores/modelStore'
import {
  useConceptVisuals,
  getHexColorMedium,
} from '../../composables/useConceptVisuals'
import BlockPill from '../editor/BlockPill.vue'
import VirtualGroupNode from './VirtualGroupNode.vue'
import type { ModelNode } from '../../model/types'

const props = withDefaults(
  defineProps<{
    nodeId: string
    selectedId: string | null
    depth?: number
    expandedGeneration?: number
    /** When true, flat element children are grouped by type (concept name)
     *  under virtual concept group headers instead of rendered directly. */
    groupByConcept?: boolean
    /** Field definitions for the current concept (used for popup field chips). */
    conceptFields?: any[]
  }>(),
  {
    depth: 0,
    expandedGeneration: undefined,
    groupByConcept: false,
    conceptFields: () => [],
  },
)

const emit = defineEmits<{
  select: [nodeId: string]
  'move-up': [nodeId: string]
  'move-down': [nodeId: string]
}>()

const modelStore = useModelStore()
const visuals = useConceptVisuals()

const isCollapsed = ref(false)

watch(
  () => props.expandedGeneration,
  (gen) => {
    if (gen !== undefined) {
      isCollapsed.value = gen < 0
    }
  },
  { immediate: true },
)

const node = computed<ModelNode | undefined>(() => modelStore.getNode(props.nodeId))

const children = computed<ModelNode[]>(() => modelStore.getChildren(props.nodeId))

const hasChildren = computed(() => children.value.length > 0)

const instanceCount = computed(() => children.value.length)

const isSelected = computed(() => props.nodeId === props.selectedId)

function toggleCollapse(): void {
  isCollapsed.value = !isCollapsed.value
}

function onSelect(): void {
  emit('select', props.nodeId)
}

// ── Ghost state detection ──────────────────────────────────────
const description = computed(() => node.value?.rawContent ?? '')

const fields = computed(() => node.value?.fields ?? {})

/** True when node has no content, no fields, and no children. */
const isGhost = computed(() => {
  const n = node.value
  if (!n) return false
  const hasDesc = !!n.rawContent && n.rawContent.trim().length > 0
  const hasFields = Object.values(n.fields).some(
    (f: any) =>
      f?.value !== undefined && f?.value !== null && f?.value !== '' && f?.value !== false,
  )
  return !hasDesc && !hasFields && children.value.length === 0
})

// ── Virtual grouping (for FILE mode) ──

type RenderItem =
  | { kind: 'node'; key: string; nodeId: string }
  | { kind: 'vg'; key: string; name: string; nodes: ModelNode[] }

const groupedChildren = computed<RenderItem[]>(() => {
  const kids = children.value

  // Check if grouping is needed: flat elements under a FILE parent
  const needsGrouping =
    props.groupByConcept &&
    kids.length > 0 &&
    !kids.some((c) => c.kind === 'concept' || c.kind === 'root')

  if (!needsGrouping) {
    return kids.map((c) => ({ kind: 'node' as const, key: c.id, nodeId: c.id }))
  }

  // Group element children by their type (concept name)
  const groups = new Map<string, ModelNode[]>()
  const ungrouped: ModelNode[] = []

  for (const child of kids) {
    if (child.kind !== 'concept' && child.type) {
      const key = child.type
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(child)
    } else {
      ungrouped.push(child)
    }
  }

  // Sort groups by name (alphabetically)
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  const result: RenderItem[] = []

  // Ungrouped first
  for (const n of ungrouped) {
    result.push({ kind: 'node', key: n.id, nodeId: n.id })
  }

  // Virtual groups
  for (const [name, members] of sortedGroups) {
    result.push({ kind: 'vg', key: `vg:${name}`, name, nodes: members })
  }

  return result
})

// ── Visual resolution ──

const isConceptLike = computed(() => {
  const n = node.value
  if (!n) return false
  return n.kind === 'concept' || n.kind === 'root' || n.kind === undefined
})

const nodeColorHex = computed(() => {
  const n = node.value
  if (!n) return '#94a3b8'
  return visuals.resolveColor(n)
})

// ── Row styling ──

const rowClasses = computed(() => {
  const base = 'text-slate-700 dark:text-slate-300'
  if (isSelected.value) return `${base} font-semibold`
  return `${base} hover:bg-slate-50 dark:hover:bg-slate-800/60`
})

const rowStyle = computed(() => {
  const color = nodeColorHex.value
  const sel = isSelected.value
  const isConcept = isConceptLike.value

  const style: Record<string, string> = {}

  if (sel) {
    style.backgroundColor = getHexColorMedium(color)
    style.borderColor = color
    style.borderWidth = '1px'
    style.borderStyle = 'solid'
  }

  if (isConcept) {
    style.borderLeft = `3px solid ${color}`
    style.paddingLeft = 'calc(0.5rem - 2px)'
  } else {
    // Elements: thin transparent left border for alignment
    style.paddingLeft = '0.75rem'
    // Small accent via box-shadow instead
    if (sel) {
      style.boxShadow = `inset 3px 0 0 0 ${color}`
    }
  }

  // Ghost state: reduced opacity on the entire row
  if (isGhost.value) {
    style.opacity = '0.45'
  }

  return style
})
</script>
