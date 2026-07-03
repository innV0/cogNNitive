import { watch, onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/uiStore'
import { useModelStore } from '../stores/modelStore'

/**
 * Synchronises the URL hash (`#conceptName.elementName`) with
 * `uiStore.selectedNodeId`.
 *
 * - **External hash change** (hashchange event, back/forward nav) → sync from
 *   hash to uiStore, finding the target node by walking the graph.
 * - **Internal navigation** (watch on uiStore.selectedNodeId) → sync from
 *   uiStore to hash using `replaceState` (never `pushState`, to avoid
 *   polluting browser history on every selection).
 * - **Guard**: a `updating` flag prevents infinite update loops when the watch
 *   triggers a hash write that in turn fires hashchange.
 */
export function useHashSync(): void {
  const uiStore = useUiStore()
  const modelStore = useModelStore()

  /** Re-entrancy guard — set to true while an update is in progress. */
  let updating = false

  // ── Hash → Store ──────────────────────────────────────────────

  function syncHashToStore(): void {
    if (updating) return
    updating = true

    const raw = window.location.hash.replace(/^#/, '')
    if (!raw) {
      updating = false
      return
    }

    // Parse "#conceptName.elementName" or "#nodeName"
    const parts = raw.split('.')
    const conceptName = parts[0]
    const elementName = parts.length > 1 ? parts[1] : undefined

    for (const nodeId of Object.keys(modelStore.nodes)) {
      const node = modelStore.getNode(nodeId)
      if (!node) continue

      if (elementName) {
        // Full match: conceptName.elementName
        if (node.name === elementName && node.parentId) {
          const parent = modelStore.getNode(node.parentId)
          if (
            parent?.conceptBinding?.name === conceptName ||
            parent?.name === conceptName
          ) {
            uiStore.selectNode(nodeId)
            break
          }
        }
      } else {
        // Single segment: try concept-binding first, then node name
        if (
          node.conceptBinding?.name === conceptName ||
          node.name === conceptName
        ) {
          uiStore.selectNode(nodeId)
          break
        }
      }
    }

    updating = false
  }

  // ── Store → Hash ──────────────────────────────────────────────

  function syncStoreToHash(nodeId: string | null): void {
    if (updating) return
    updating = true

    if (!nodeId) {
      window.history.replaceState(null, '', window.location.pathname)
      updating = false
      return
    }

    const node = modelStore.getNode(nodeId)
    if (!node) {
      updating = false
      return
    }

    let hash: string

    // Build a meaningful hash from the node's context
    if (node.conceptBinding?.name) {
      hash = node.conceptBinding.name
      if (node.kind === 'element' || node.parentId) {
        hash += `.${node.name}`
      }
    } else if (node.parentId) {
      const parent = modelStore.getNode(node.parentId)
      if (parent?.conceptBinding?.name) {
        hash = `${parent.conceptBinding.name}.${node.name}`
      } else {
        hash = node.name
      }
    } else {
      hash = node.name
    }

    window.history.replaceState(null, '', `#${hash}`)
    updating = false
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  onMounted(() => {
    window.addEventListener('hashchange', syncHashToStore)

    // Read initial hash on mount for deep-link support
    if (window.location.hash) {
      syncHashToStore()
    }
  })

  onUnmounted(() => {
    window.removeEventListener('hashchange', syncHashToStore)
  })

  // Watch uiStore selection changes → update hash
  watch(
    () => uiStore.selectedNodeId,
    (nodeId) => {
      syncStoreToHash(nodeId)
    },
  )
}
