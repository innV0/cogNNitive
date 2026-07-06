<template>
  <div data-testid="block-matrix-summary" class="block-matrix-summary">
    <template v-if="chips.length > 0">
      <div class="flex flex-wrap gap-2">
        <div
          v-for="chip in chips"
          :key="chip.matrixName"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          :style="{
            backgroundColor: chip.accentColor + '18',
            color: chip.accentColor,
            borderColor: chip.accentColor + '30',
          }"
          :class="'border'"
        >
          <svg
            class="w-3 h-3 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          <span>{{ chip.matrixName }}</span>
          <span class="opacity-70">·</span>
          <span class="opacity-80">{{ chip.position }}</span>
          <span class="opacity-50">({{ chip.count }})</span>
        </div>
      </div>
    </template>
    <p v-else class="text-xs text-slate-400 dark:text-slate-500 italic">No matrix participation.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModelStore } from '../../stores/modelStore'
import { parseFrontmatter } from '@innv0/innfo-core'
import { getHexColor } from '../../composables/useConceptVisuals'
import type { MatrixDecl } from '@innv0/innfo-core'

const props = defineProps<{
  rootNodeId: string
  nodeConcept: string
  nodeId: string
}>()

const modelStore = useModelStore()

interface MatrixChip {
  matrixName: string
  position: 'row' | 'col'
  count: number
  accentColor: string
}

const chips = computed<MatrixChip[]>(() => {
  const root = modelStore.getNode(props.rootNodeId)
  if (!root?.rawContent) return []

  // Parse frontmatter to get matrix definitions
  const fm = parseFrontmatter(root.rawContent)
  const rawMatrices = (fm as any)?.matrices
  const matrices: MatrixDecl[] = Array.isArray(rawMatrices) ? rawMatrices : []
  if (matrices.length === 0) return []

  const result: MatrixChip[] = []

  // Helper: count non-dash/empty cells for a matrix + concept instance
  // Cell keys are formatted as `{matrixName}||{rowInstance}||{colInstance}`.
  // The node can appear as a row (parts[1]) or column (parts[2]) participant.
  function countNonDashCells(
    matrixName: string,
    rootNodeId: string,
    conceptInstanceName: string,
  ): number {
    const rn = modelStore.getNode(rootNodeId)
    if (!rn?.fields) return 0

    let count = 0
    for (const [key, fv] of Object.entries(rn.fields)) {
      const parts = key.split('||')
      if (parts.length >= 3 && parts[0] === matrixName) {
        // Row: matrix||nodeName||*   Col: matrix||*||nodeName
        if (parts[1] === conceptInstanceName || parts[2] === conceptInstanceName) {
          const val = fv?.value
          if (val !== undefined && val !== null && val !== '' && val !== '-' && val !== false) {
            count++
          }
        }
      }
    }
    return count
  }

  for (const m of matrices) {
    const node = modelStore.getNode(props.nodeId)
    if (!node) continue

    // Resolve concept color for accent
    const conceptColor = (() => {
      // Look up concept definition from metamodel or use node's type
      const rootNode = modelStore.getNode(props.rootNodeId)
      if (rootNode?.rawContent) {
        const fmData = parseFrontmatter(rootNode.rawContent)
        const concepts: Array<{ name: string; color?: string }> = (fmData as any)?.concepts ?? []
        const found = concepts.find((c) => c.name === props.nodeConcept)
        if (found?.color) return getHexColor(found.color)
      }
      // Fall back to the node's type-based color
      return getHexColor(undefined)
    })()

    if (m.source === props.nodeConcept) {
      // Node is a row participant
      const count = countNonDashCells(m.name, props.rootNodeId, node.name)
      result.push({ matrixName: m.name, position: 'row', count, accentColor: conceptColor })
    }

    if (m.target === props.nodeConcept) {
      // Node is a column participant
      const count = countNonDashCells(m.name, props.rootNodeId, node.name)
      if (!result.some((r) => r.matrixName === m.name && r.position === 'row')) {
        result.push({ matrixName: m.name, position: 'col', count, accentColor: conceptColor })
      }
    }
  }

  return result
})
</script>
