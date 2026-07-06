import type { LocalMetamodel, MetamodelConcept, MetamodelMarker, ModelNode } from './types'

/**
 * Builds the ancestor chain for `nodeId`, root-first (e.g. `[Root, Root/A,
 * Root/A/B]`), by walking `parentId` links in the graph. This mirrors
 * `innfo-core`'s `resolveParentChain` inherit/override walk, generalized
 * from the level-based spec chain (defiNNe -> FORMAT -> template ->
 * instance) to node-nesting (root node -> ... -> target node) — see
 * design.md "Metamodel resolution" decision. `resolveParentChain` itself
 * is not reused directly: it is fs+network based (`node:fs/promises`,
 * `fetch`) and is excluded from format-core's `browser` build condition
 * that this in-browser app resolves against (see recursiveParser.ts note
 * on the same constraint for FS drivers).
 */
function buildAncestorChain(nodeId: string, nodes: Record<string, ModelNode>): ModelNode[] {
  const chain: ModelNode[] = []
  let current: ModelNode | undefined = nodes[nodeId]
  while (current) {
    chain.unshift(current)
    current = current.parentId ? nodes[current.parentId] : undefined
  }
  return chain
}

/**
 * Resolves a node's effective metamodel by walking root -> node and merging
 * each ancestor's locally-declared `concepts`/`markers` (R9): a name
 * declared closer to the target node overrides the same name declared by
 * an ancestor further up the chain — mirroring `getSpecForLevel`'s
 * closest-wins resolution over the spec chain. Nodes without a local
 * metamodel (nested elements) contribute nothing and are transparent to
 * the walk.
 */
export function resolveEffectiveMetamodel(
  nodeId: string,
  nodes: Record<string, ModelNode>,
): LocalMetamodel {
  const chain = buildAncestorChain(nodeId, nodes)

  const conceptsByName = new Map<string, MetamodelConcept>()
  const markersByName = new Map<string, MetamodelMarker>()

  for (const ancestor of chain) {
    const local = ancestor.localMetamodel
    if (!local) continue
    for (const concept of local.concepts) {
      conceptsByName.set(concept.name, concept)
    }
    for (const marker of local.markers) {
      markersByName.set(marker.name, marker)
    }
  }

  return {
    concepts: [...conceptsByName.values()],
    markers: [...markersByName.values()],
  }
}
