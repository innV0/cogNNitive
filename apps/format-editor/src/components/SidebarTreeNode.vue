<script setup lang="ts">
import { useModelStore } from '../stores/modelStore'

/**
 * Renders one node and recurses into its children. Mixes file-type and
 * folder-type nodes with no mode-based split (R13) — the only thing that
 * varies visually is a mode badge, not the tree structure or component
 * used.
 */
const props = defineProps<{
  nodeId: string
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [nodeId: string]
}>()

const modelStore = useModelStore()

function onSelect(): void {
  emit('select', props.nodeId)
}

function onChildSelect(childId: string): void {
  emit('select', childId)
}
</script>

<template>
  <li class="sidebar-tree-node">
    <div
      class="sidebar-tree-node__row"
      :data-node-id="nodeId"
      :class="{ 'sidebar-tree-node__row--selected': nodeId === selectedId }"
      @click="onSelect"
    >
      <span class="sidebar-tree-node__mode">{{ modelStore.getNode(nodeId)?.storageMode }}</span>
      <span class="sidebar-tree-node__name">{{ modelStore.getNode(nodeId)?.name }}</span>
    </div>
    <ul v-if="modelStore.getChildren(nodeId).length > 0" class="sidebar-tree-node__children">
      <SidebarTreeNode
        v-for="child in modelStore.getChildren(nodeId)"
        :key="child.id"
        :node-id="child.id"
        :selected-id="selectedId"
        @select="onChildSelect"
      />
    </ul>
  </li>
</template>
