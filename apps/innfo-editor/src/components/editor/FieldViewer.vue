<template>
  <div class="field-viewer space-y-3">
    <div
      v-for="entry in fieldEntries"
      :key="entry.def.name"
      class="flex flex-col gap-1"
    >
      <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {{ entry.def.name.replace(/_/g, ' ') }}
      </label>

      <!-- Edit mode: use WidgetField for interactive editing -->
      <WidgetField
        v-if="!readonly"
        :node-id="nodeId"
        :field-key="entry.def.name"
        :widget-type="entry.def.type"
        :field-definition="entry.def"
      />

      <!-- Read mode: display formatted value -->
      <div
        v-else
        class="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 min-h-[32px]"
      >
        <template v-if="entry.hasValue && entry.displayValue !== ''">
          <template v-if="entry.def.type === 'select' && entry.def.options">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700"
            >
              {{ entry.displayValue }}
            </span>
          </template>
          <template v-else-if="entry.def.type === 'reference'">
            <span class="text-indigo-600 dark:text-indigo-400 underline decoration-dotted cursor-default">
              [[{{ entry.displayValue }}]]
            </span>
          </template>
          <template v-else-if="entry.def.type === 'boolean'">
            <span :class="entry.displayValue ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'">
              {{ entry.displayValue ? 'Yes' : 'No' }}
            </span>
          </template>
          <template v-else>
            {{ entry.displayValue }}
          </template>
        </template>
        <span v-else class="text-slate-300 dark:text-slate-600 italic">—</span>
      </div>
    </div>

    <!-- Empty state -->
    <p v-if="fieldDefinitions.length === 0" class="text-xs text-slate-400 dark:text-slate-500 italic">
      No fields defined for this concept.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetField from '../../shared/widgets/WidgetField.vue'
import { useModelStore } from '../../stores/modelStore'

interface FieldEntry {
  def: {
    name: string
    type: string
    options?: string[]
    target_concepts?: string[]
  }
  hasValue: boolean
  displayValue: unknown
}

/**
 * FieldViewer renders node fields using the widget registry.
 *
 * In read mode, fields display as formatted labels/values.
 * In edit mode, fields render as interactive WidgetField instances
 * backed by the widget registry.
 */
const props = withDefaults(defineProps<{
  nodeId: string
  fieldDefinitions: Array<{
    name: string
    type: string
    options?: string[]
    target_concepts?: string[]
  }>
  readonly?: boolean
}>(), {
  readonly: true,
})

const modelStore = useModelStore()

/**
 * Computes an array of field entries pairing each field definition
 * with its current value from the store.
 */
const fieldEntries = computed<FieldEntry[]>(() => {
  const node = modelStore.getNode(props.nodeId)

  return props.fieldDefinitions.map(def => {
    const fv = node?.fields?.[def.name]
    const rawValue = fv?.value ?? fv ?? undefined
    const hasValue = rawValue !== undefined && rawValue !== null && rawValue !== ''

    return {
      def,
      hasValue,
      displayValue: rawValue ?? '',
    }
  })
})
</script>
