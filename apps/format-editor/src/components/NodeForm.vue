<script setup lang="ts">
import { computed } from 'vue'
import { useModelStore } from '../stores/modelStore'
import { resolveEffectiveMetamodel } from '../model/metamodel'
import WidgetField from '../shared/widgets/WidgetField.vue'

/**
 * On node selection, resolves the node's effective metamodel (Phase 5) and
 * renders fields/markers using the ported widget system (Phase 6) — not
 * from a hardcoded or per-mode schema (R10, R14). Switching `nodeId`
 * (selection change) replaces stale prior-node fields entirely, since the
 * resolved fields list is a computed derived straight from the new
 * `nodeId`/`modelStore` state.
 */
const props = defineProps<{
  nodeId: string
}>()

const modelStore = useModelStore()

const node = computed(() => modelStore.getNode(props.nodeId))

/**
 * Fields to render: only concepts declared in the node's resolved
 * metamodel that the node actually has data for (present-fields-shown,
 * absent-fields-omitted per R10). A node's own field data key matches the
 * resolved concept's `name`.
 */
const resolvedFields = computed(() => {
  const currentNode = node.value
  if (!currentNode) return []
  const metamodel = resolveEffectiveMetamodel(props.nodeId, modelStore.nodes)
  return metamodel.concepts
    .filter((concept) => concept.name in currentNode.fields)
    .map((concept) => ({ key: concept.name, widgetType: concept.type }))
})
</script>

<template>
  <div v-if="node" class="node-form">
    <h2 class="node-form__title">{{ node.name }}</h2>
    <div v-for="field in resolvedFields" :key="field.key" class="node-form__field">
      <label class="node-form__label">{{ field.key }}</label>
      <WidgetField :node-id="nodeId" :field-key="field.key" :widget-type="field.widgetType" />
    </div>
  </div>
</template>
