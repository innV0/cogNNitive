import { parseModel, serializeModel } from '@innv0/format-core'
import type { ModelNode } from './types'
import type { ModelDriver } from '@innv0/format-core'

export interface WriteReport {
  path: string
  fidelity: 'exact' | 'canonical'
  nodeId: string
}

/**
 * Rebuilds the serialized text for a root node. Returns the content and
 * fidelity indicator:
 * - 'exact': rawContent was preserved (no edit, byte-identical write)
 * - 'canonical': content was re-serialized through serializeModel (lossy path)
 */
function serializeNodeContent(node: ModelNode): { content: string; fidelity: 'exact' | 'canonical' } {
  if (node.rawContent === undefined) {
    throw new Error(`Node "${node.id}" has no rawContent to serialize from`)
  }
  const parsed = parseModel(node.rawContent)
  const serialized = serializeModel(parsed)
  const fidelity: 'exact' | 'canonical' = serialized === node.rawContent ? 'exact' : 'canonical'
  if (fidelity === 'canonical') {
    console.warn(`[fidelity] Node "${node.id}" serialized through lossy canonical path`)
  }
  return { content: serialized, fidelity }
}

/**
 * Serializes dirty nodes back to disk. No tree walk — iterates nodes directly.
 * When `driver` is provided, writes go through `driver.writeModel()`.
 * Without a driver, returns a report of what would be written (caller must
 * handle actual file writes).
 */
export async function recursiveSerialize(
  nodes: Record<string, ModelNode>,
  dirtyIds: Set<string>,
  driver?: ModelDriver,
): Promise<WriteReport[]> {
  if (dirtyIds.size === 0) return []
  const report: WriteReport[] = []

  for (const node of Object.values(nodes)) {
    if (!dirtyIds.has(node.id) || node.rawContent === undefined) continue

    const { content, fidelity } = serializeNodeContent(node)

    if (driver) {
      const parsed = parseModel(content)
      await driver.writeModel(node.source.path, parsed)
    }

    report.push({ path: node.source.path, fidelity, nodeId: node.id })
  }

  return report
}
