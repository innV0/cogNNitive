<template>
  <component
    :is="as"
    :data-testid="'matrix-pill-' + name"
    :class="pillClasses"
    :title="tooltipText"
    v-bind="$attrs"
    @click="$emit('click', $event)"
  >
    <IconRenderer
      :icon="resolvedSourceIcon"
      custom-class="shrink-0 w-3.5 h-3.5"
      :class="sourceAccent"
    />
    <span
      v-if="showSourceTarget && source && target"
      class="truncate min-w-0 leading-tight flex items-center gap-1"
    >
      <span :class="sourceText">{{ source }}</span>
      <span v-if="label" class="text-xs text-slate-400 dark:text-slate-500 font-normal italic">{{
        label
      }}</span>
      <span class="text-slate-300 dark:text-slate-600 font-normal">&rarr;</span>
      <span :class="targetText">{{ target }}</span>
    </span>
    <span v-else class="truncate min-w-0 leading-tight">{{ name }}</span>
    <ChevronRight
      v-if="interactive"
      class="shrink-0 w-3.5 h-3.5 transition-colors"
      :class="chevronClasses"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { useModelStore } from '../../stores/modelStore'
import { getColorClasses } from '../../utils/colors'
import IconRenderer from './IconRenderer.vue'

const modelStore = useModelStore()

const props = withDefaults(
  defineProps<{
    name: string
    source?: string
    target?: string
    label?: string
    interactive?: boolean
    selected?: boolean
    fullWidth?: boolean
    showSourceTarget?: boolean
    as?: string
  }>(),
  {
    interactive: false,
    selected: false,
    fullWidth: false,
    showSourceTarget: false,
    label: '',
    as: 'div',
  },
)

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

// Resolve concept icon from modelStore nodes by type
function getConceptIcon(typeName: string | undefined): string {
  if (!typeName) return 'table-2'
  // Find first node with this type and check its localMetamodel
  for (const node of Object.values(modelStore.nodes)) {
    if (node.conceptBinding?.name === typeName) {
      return 'table-2'
    }
    if (node.type === typeName && node.localMetamodel?.concepts) {
      const match = node.localMetamodel.concepts.find((c) => c.name === typeName)
      if (match?.icon) return match.icon
    }
  }
  return 'table-2'
}

function getConceptColor(typeName: string | undefined): string | null {
  if (!typeName) return null
  // Check localMetamodel of root for concept color
  const rootId = modelStore.rootIds[0]
  if (!rootId) return null
  const root = modelStore.getNode(rootId)
  if (root?.localMetamodel?.concepts) {
    const match = root.localMetamodel.concepts.find((c) => c.name === typeName)
    if (match?.color) return match.color
  }
  return null
}

const resolvedSourceIcon = computed(() => {
  return getConceptIcon(props.source) || 'table-2'
})

const sourcePalette = computed(() => {
  const color = getConceptColor(props.source)
  return color ? getColorClasses(color) : null
})

const targetPalette = computed(() => {
  const color = getConceptColor(props.target)
  return color ? getColorClasses(color) : null
})

const sourceText = computed(() => sourcePalette.value?.text || 'text-slate-600 dark:text-slate-400')
const targetText = computed(() => targetPalette.value?.text || 'text-slate-600 dark:text-slate-400')
const sourceAccent = computed(
  () => sourcePalette.value?.accent || 'text-slate-400 dark:text-slate-500',
)

const chevronClasses = computed(() => {
  if (!props.interactive) return 'hidden'
  return sourcePalette.value?.accent
    ? `${sourcePalette.value.accent} opacity-0 group-hover:opacity-100`
    : 'text-slate-300 dark:text-slate-600 group-hover:text-primary'
})

const tooltipText = computed(() => {
  if (props.showSourceTarget && props.source && props.target) {
    let t = `${props.name} \u2014 ${props.source} \u2192 ${props.target}`
    if (props.label) t += ` (${props.label})`
    return t
  }
  return props.name
})

const pillClasses = computed(() => {
  const base = [
    'inline-flex items-center gap-2',
    'px-3 py-1.5 text-xs rounded-lg',
    'transition-all duration-200 select-none min-w-0',
    props.fullWidth ? 'w-full' : 'max-w-full',
  ]

  if (props.selected) {
    return [...base, 'bg-primary/10 text-primary border border-primary/30']
  }

  if (props.interactive) {
    return [
      ...base,
      'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
      'hover:bg-primary/5 hover:text-primary hover:border-primary/30',
      'cursor-pointer active:scale-[0.99] group',
    ]
  }

  return [...base, 'text-slate-500 dark:text-slate-400']
})
</script>
