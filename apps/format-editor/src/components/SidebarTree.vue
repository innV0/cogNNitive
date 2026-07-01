<script setup lang="ts">
import { ref } from 'vue'
import { useModelStore } from '../stores/modelStore'
import SidebarTreeNode from './SidebarTreeNode.vue'

/**
 * Single tree deriving hierarchy from modelStore parentId/childIds,
 * mixing file-type and folder-type nodes with no mode-based split (R13).
 * There is no separate FILE tree and FOLDER tree.
 */
const emit = defineEmits<{
  select: [nodeId: string]
}>()

const modelStore = useModelStore()
const selectedId = ref<string | null>(null)

function onSelect(nodeId: string): void {
  selectedId.value = nodeId
  emit('select', nodeId)
}
</script>

<template>
  <ul class="sidebar-tree">
    <SidebarTreeNode
      v-for="root in modelStore.getRoots()"
      :key="root.id"
      :node-id="root.id"
      :selected-id="selectedId"
      @select="onSelect"
    />
  </ul>
</template>
