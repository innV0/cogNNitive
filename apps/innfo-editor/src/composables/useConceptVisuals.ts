/**
 * useConceptVisuals
 *
 * Resolves the visual identity (icon + color) for any model node from the
 * effective metamodel (template-level concept definitions).
 *
 * Resolution strategy (two-pass):
 *   1. Walk the ancestor chain via resolveEffectiveMetamodel — works for
 *      FOLDER-mode concept nodes and any node whose ancestor chain carries
 *      a localMetamodel.
 *   2. If the ancestor chain yields no match, try peer template resolution:
 *      the current root's frontmatter declares `parent.name` (the template
 *      name). Search all root nodes for one whose `name` matches and that
 *      has localMetamodel.concepts — this handles FILE-mode level-3 models
 *      opened in a workspace that also contains the template spec.
 *
 * Color utility: `getHexColor(name)` mirrors GraphViewer.vue's palette.
 */

import { parseFrontmatter } from '@innv0/innfo-core'
import { resolveEffectiveMetamodel } from '../model/metamodel'
import { useModelStore } from '../stores/modelStore'
import type { MetamodelConcept, ModelNode } from '../model/types'

// ── Color palette ──────────────────────────────────────────────

export const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  grey: '#94a3b8',
  slate: '#94a3b8',
  orange: '#f97316',
  amber: '#f59e0b',
  purple: '#a855f7',
  teal: '#14b8a6',
  yellow: '#eab308',
  indigo: '#6366f1',
  pink: '#ec4899',
}

export function getHexColor(colorName?: string | null): string {
  return COLOR_HEX[colorName?.toLowerCase() ?? ''] ?? COLOR_HEX.slate
}

export function getHexColorLight(hex: string): string {
  return hex + '18' // 10% alpha background
}

export function getHexColorMedium(hex: string): string {
  return hex + '30' // 19% alpha
}

// ── YIQ Luminance & Contrast ───────────────────────────────────

/**
 * YIQ-based perceived luminance for a hex color.
 * Strips any alpha suffix (e.g., #a855f718 → #a855f7).
 * Returns a value between 0 (dark) and 1 (light).
 */
export function yiqLuminance(hex: string): number {
  const clean = hex.length > 7 ? hex.slice(0, 7) : hex
  const r = parseInt(clean.slice(1, 3), 16) / 255
  const g = parseInt(clean.slice(3, 5), 16) / 255
  const b = parseInt(clean.slice(5, 7), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * Returns a text color (dark or white) based on YIQ luminance of the background.
 * Threshold: 0.55 — above → dark text (#1e293b), below → white (#ffffff).
 */
export function textColor(hex: string): string {
  return yiqLuminance(hex) > 0.55 ? '#1e293b' : '#ffffff'
}

// ── Peer template cache (session-scoped, survives reactivity) ──

const _peerCache = new Map<string, string | null>()

function findTemplatePeer(
  rootId: string,
  rootIds: string[],
  nodes: Record<string, ModelNode>,
): string | null {
  if (_peerCache.has(rootId)) return _peerCache.get(rootId)!

  const root = nodes[rootId]
  if (!root?.rawContent) {
    _peerCache.set(rootId, null)
    return null
  }

  // Parse frontmatter to extract parent.name (the template name)
  const fm = parseFrontmatter(root.rawContent)
  const parentName: string | undefined = (fm as any)?.parent_spec?.name
  if (!parentName) {
    _peerCache.set(rootId, null)
    return null
  }

  // Search peer roots for matching name with concepts
  // parent_spec.name (e.g. "business_V_0-1-1") may lack the _NN suffix
  // that filename-derived node names carry (e.g. "business_V_0-1-1_NN").
  const normalizedParent = parentName.replace(/_NN$/, '')
  for (const rid of rootIds) {
    if (rid === rootId) continue
    const candidate = nodes[rid]
    if (!candidate?.localMetamodel?.concepts?.length) continue
    const candidateName = candidate.name?.replace(/_NN$/, '')
    if (candidateName === normalizedParent) {
      _peerCache.set(rootId, rid)
      return rid
    }
  }

  _peerCache.set(rootId, null)
  return null
}

// ── Composable ─────────────────────────────────────────────────

export function useConceptVisuals() {
  const modelStore = useModelStore()

  /**
   * Resolves the MetamodelConcept for any graph node.
   *
   * For elements (`kind === 'element'`):  `node.type` holds the concept name.
   * For concepts/roots:                   `conceptBinding.name ?? node.name`.
   */
  function getConceptForNode(node: ModelNode): MetamodelConcept | undefined {
    const conceptName =
      node.kind === 'element' ? node.type : (node.conceptBinding?.name ?? node.name)

    if (!conceptName) return undefined

    // Pass 1: walk ancestor chain
    const metamodel = resolveEffectiveMetamodel(node.id, modelStore.nodes)
    let match = metamodel.concepts.find((c) => c.name === conceptName)
    if (match) return match

    // Pass 2: peer template resolution
    // Walk up to the root for this node
    let root: ModelNode | null = node
    const seen = new Set<string>()
    while (root?.parentId && !seen.has(root.id)) {
      seen.add(root.id)
      root = modelStore.nodes[root.parentId] ?? null
    }
    if (root) {
      const peerId = findTemplatePeer(root.id, modelStore.rootIds, modelStore.nodes)
      if (peerId) {
        const peerMeta = resolveEffectiveMetamodel(peerId, modelStore.nodes)
        match = peerMeta.concepts.find((c) => c.name === conceptName)
        if (match) return match
      }
    }

    return undefined
  }

  /** Returns the icon identifier for a node, falling back to 'file-text'. */
  function resolveIcon(node: ModelNode): string {
    return getConceptForNode(node)?.icon ?? 'file-text'
  }

  /** Returns the color hex for a node, falling back to slate (#94a3b8). */
  function resolveColor(node: ModelNode): string {
    const concept = getConceptForNode(node)
    return concept?.color ? getHexColor(concept.color) : COLOR_HEX.slate
  }

  /** Returns the tailwind-compatible color name for a node. */
  function resolveColorName(node: ModelNode): string {
    const concept = getConceptForNode(node)
    return concept?.color ?? 'slate'
  }

  return { getConceptForNode, resolveIcon, resolveColor, resolveColorName }
}
