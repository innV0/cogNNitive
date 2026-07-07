<template>
  <div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
    <table class="w-full caption-bottom text-sm border-separate border-spacing-0 min-w-[600px]">
      <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/95">
        <tr>
          <th
            class="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800/95 text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 min-w-[200px]"
          >
            Element
          </th>
          <th
            v-for="field in conceptFields"
            :key="field.name"
            class="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 min-w-[140px]"
          >
            {{ field.name.replace(/_/g, ' ') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(child, idx) in children"
          :key="child.id"
          @click="navigateTo(child.id)"
          class="group transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
          :class="idx === children.length - 1 ? 'border-b-0' : ''"
        >
          <td
            class="sticky left-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/30 px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-700/50"
          >
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500 shrink-0">
                {{ child.name.charAt(0).toUpperCase() }}
              </span>
              <span class="truncate">{{ child.name }}</span>
            </div>
          </td>
          <td
            v-for="field in conceptFields"
            :key="field.name"
            class="px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
          >
            <WidgetField
              :node-id="child.id"
              :field-key="field.name"
              :widget-type="field.type || 'string'"
              :field-definition="field"
            />
          </td>
        </tr>
        <tr v-if="children.length === 0">
          <td
            :colspan="1 + (conceptFields?.length || 0)"
            class="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500 italic"
          >
            No elements for this concept.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModelStore } from '../../stores/modelStore'
import { useUiStore } from '../../stores/uiStore'
import WidgetField from '../../shared/widgets/WidgetField.vue'

const props = defineProps<{
  nodeId: string
  conceptType?: string
  conceptFields?: any[]
}>()

const modelStore = useModelStore()
const uiStore = useUiStore()

const children = computed(() => modelStore.getChildren(props.nodeId))

function navigateTo(nodeId: string): void {
  uiStore.selectNode(nodeId)
}
</script>