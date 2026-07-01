<script setup lang="ts">
import { ref } from 'vue'
import SidebarTree from '../components/SidebarTree.vue'
import NodeForm from '../components/NodeForm.vue'

/**
 * Wires the unified navigation tree to the metamodel-driven form: selecting
 * any node in SidebarTree updates NodeForm to that node's resolved fields;
 * switching selection replaces stale prior-node fields (R14).
 */
const selectedNodeId = ref<string | null>(null)

function onSelect(nodeId: string): void {
  selectedNodeId.value = nodeId
}
</script>

<template>
  <div class="workspace">
    <aside class="workspace__sidebar">
      <SidebarTree @select="onSelect" />
    </aside>
    <main class="workspace__main">
      <NodeForm v-if="selectedNodeId" :node-id="selectedNodeId" />
      <p v-else class="workspace__empty-state">Select a node to edit.</p>
    </main>
  </div>
</template>
