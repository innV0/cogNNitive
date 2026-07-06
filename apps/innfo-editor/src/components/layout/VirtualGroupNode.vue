<template>
  <div data-testid="virtual-group-node" class="select-none">
    <!-- ── Virtual concept group header ── -->
    <div
      class="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs group cursor-pointer"
      :style="headerStyle"
      :class="headerClasses"
      @click="toggleCollapsed"
    >
      <!-- Expand/collapse -->
      <button
        v-if="children.length > 0"
        @click.stop="toggleCollapsed"
        class="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors flex items-center justify-center shrink-0"
      >
        <ChevronDown
          class="transition-transform duration-200 w-3.5 h-3.5"
          :class="{ '-rotate-90': isCollapsed }"
        />
      </button>
      <span v-else class="w-5 shrink-0"></span>

      <!-- Icon from concept definition -->
      <div class="relative shrink-0 flex items-center justify-center w-4 h-4">
        <IconRenderer
          :icon="conceptIcon"
          fallback="folder"
          custom-class="shrink-0"
          :style="{ color: conceptColorHex, width: '14px', height: '14px' }"
        />
      </div>

      <!-- Concept name (uppercase, subtle) -->
      <span
        class="flex-1 min-w-0 truncate text-[11px] font-bold uppercase tracking-wider"
        :style="{ color: conceptColorHex }"
      >
        {{ conceptName }}
      </span>

      <!-- Count badge -->
      <span
        class="text-2xs px-1.5 py-0.5 rounded-full shrink-0 font-medium tabular-nums"
        :style="{
          backgroundColor: conceptColorHex + '18',
          color: conceptColorHex,
        }"
      >
        {{ children.length }}
      </span>
    </div>

    <!-- ── Child elements ── -->
    <div
      v-if="children.length > 0 && !isCollapsed"
      class="ml-3 pl-2 border-l border-slate-200 dark:border-slate-700 space-y-0.5"
    >
      <ConceptTreeNode
        v-for="child in children"
        :key="child.id"
        :node-id="child.id"
        :selected-id="selectedId"
        :depth="depth + 1"
        :expanded-generation="expandedGeneration"
        @select="(id: string) => $emit('select', id)"
        @move-up="(id: string) => $emit('move-up', id)"
        @move-down="(id: string) => $emit('move-down', id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import {
  useConceptVisuals,
  getHexColor,
  getHexColorLight,
} from '../../composables/useConceptVisuals'
import IconRenderer from '../editor/IconRenderer.vue'
import ConceptTreeNode from './ConceptTreeNode.vue'
import type { ModelNode } from '../../model/types'

const props = withDefaults(
  defineProps<{
    conceptName: string
    children: ModelNode[]
    selectedId: string | null
    depth?: number
    expandedGeneration?: number
  }>(),
  {
    depth: 0,
    expandedGeneration: undefined,
  },
)

const _emit = defineEmits<{
  select: [nodeId: string]
  'move-up': [nodeId: string]
  'move-down': [nodeId: string]
}>()

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

function toggleCollapsed(): void {
  isCollapsed.value = !isCollapsed.value
}

// Resolve icon and color for this concept group
const conceptColorHex = computed(() => {
  const firstChild = props.children[0]
  if (firstChild) {
    const mc = visuals.getConceptForNode(firstChild)
    if (mc?.color) return getHexColor(mc.color)
  }
  return '#94a3b8'
})

const conceptIcon = computed(() => {
  const firstChild = props.children[0]
  if (firstChild) {
    return visuals.resolveIcon(firstChild)
  }
  return 'folder'
})

const headerStyle = computed(() => {
  const color = conceptColorHex.value
  return {
    borderLeft: `3px solid ${color}`,
    paddingLeft: 'calc(0.5rem - 2px)',
    backgroundColor: getHexColorLight(color),
  }
})

const headerClasses = computed(() => {
  return 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
})
</script>
