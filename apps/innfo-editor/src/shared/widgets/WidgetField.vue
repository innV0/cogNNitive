<script setup lang="ts">
import { computed } from 'vue'
import { useModelStore } from '../../stores/modelStore'
import { commitFieldValue } from '../provenance'
import { resolveWidgetComponent, FallbackWidget } from './index'

/**
 * Binds one resolved field/marker to its widget: resolves the ported
 * component for `widgetType` via the registry, falling back to
 * `FallbackWidget` for any unported type (R15). Every commit from the
 * ported widget is stamped with provenance via `commitFieldValue` (R16).
 *
 * Enhanced in Phase 4 (rebuild-format-editor-ui) with:
 * - `fieldDefinition` prop for field-type widgets (options, target_concepts)
 * - Backward-compatible with concept-type widget dispatch
 */
const props = withDefaults(
  defineProps<{
    nodeId: string
    fieldKey: string
    widgetType: string
    authorId?: string
    /** Optional field definition for field-type widgets (provides options, target_concepts, etc.) */
    fieldDefinition?: {
      name: string
      type: string
      options?: string[]
      target_concepts?: string[]
      default?: unknown
    }
  }>(),
  { authorId: 'anonymous' },
)

const modelStore = useModelStore()

const currentValue = computed(() => modelStore.getNode(props.nodeId)?.fields[props.fieldKey]?.value)

const widgetComponent = computed(() => resolveWidgetComponent(props.widgetType))

function onCommit(value: unknown): void {
  commitFieldValue(modelStore, props.nodeId, props.fieldKey, value, { kind: 'user', id: props.authorId })
}
</script>

<template>
  <component
    :is="widgetComponent ?? FallbackWidget"
    :model-value="currentValue"
    :widget-type="widgetType"
    :field-definition="fieldDefinition"
    @update:model-value="onCommit"
  />
</template>
