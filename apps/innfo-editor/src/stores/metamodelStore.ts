import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useModelStore } from './modelStore'
import { useWorkspaceStore } from './workspaceStore'
import { resolveEffectiveMetamodel } from '../model/metamodel'
import { parseMetamodelDocumentation } from '../utils/documentationParser'
import { parseFormatFilename } from '../utils/version'
import { parseFrontmatter } from '@innv0/innfo-core'
import type { MetamodelConcept, MetamodelMarker } from '../model/types'
import type { DocumentationEntry } from '../utils/documentationParser'
import type { DirectoryHandleLike } from './workspaceStore'
import type { PerspectiveEdge, PerspectiveNeighborhood } from './types'

/**
 * A single node in the taxonomy concept tree.
 * Built from `PerspectiveEdge` parent→child relationships.
 */
export interface ConceptTreeNode {
  name: string
  children: ConceptTreeNode[]
}

/**
 * Thin Pinia adapter over `resolveEffectiveMetamodel()`. Replaces
 * file-format's `metamodelStore` imports: exposes `concepts`, `markers`,
 * `getConceptByName`, and `getConceptFields` by resolving the effective
 * metamodel from the root node (or active node) in `modelStore`.
 *
 * Phase H additions: `taxonomyEdges`, `conceptTree`, `getNeighborhood`
 * — parses `taxonomy` from the root node's frontmatter and provides
 * perspective neighborhood navigation (parents / children / siblings).
 */
export const useMetamodelStore = defineStore('metamodel', () => {
  const modelStore = useModelStore()

  const rootId = computed(() => modelStore.rootIds[0])

  const concepts = computed<MetamodelConcept[]>(() => {
    if (!rootId.value) return []
    const metamodel = resolveEffectiveMetamodel(rootId.value, modelStore.nodes)
    return metamodel.concepts
  })

  const markers = computed<MetamodelMarker[]>(() => {
    if (!rootId.value) return []
    const metamodel = resolveEffectiveMetamodel(rootId.value, modelStore.nodes)
    return metamodel.markers
  })

  function getConceptByName(name: string): MetamodelConcept | undefined {
    return concepts.value.find((c) => c.name === name)
  }

  function getConceptFields(name: string): MetamodelConcept['fields'] {
    const concept = getConceptByName(name)
    return concept?.fields ?? []
  }

  /* ── Taxonomy perspectives (Phase H) ── */

  /**
   * Parsed taxonomy edges from the root node's frontmatter `taxonomy` field.
   * Each edge is a `{ parent, child }` record. Returns an empty array when
   * no taxonomy is declared (no crash).
   */
  const taxonomyEdges = computed<PerspectiveEdge[]>(() => {
    if (!rootId.value) return []
    const root = modelStore.getNode(rootId.value)
    if (!root?.rawContent) return []
    const fm = parseFrontmatter(root.rawContent)
    if (!fm) return []
    const rawTaxonomy = (fm as Record<string, unknown>).taxonomy
    if (!Array.isArray(rawTaxonomy)) return []
    return rawTaxonomy
      .filter(
        (e: unknown): e is { parent: string; child: string } =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as Record<string, unknown>).parent === 'string' &&
          typeof (e as Record<string, unknown>).child === 'string',
      )
      .map((e) => ({ parent: e.parent, child: e.child }))
  })

  /**
   * Hierarchical concept tree built from `taxonomyEdges`.
   * Root concepts are those that appear as `parent` but never as `child`.
   * Complexity O(n) where n = number of edges.
   */
  const conceptTree = computed<ConceptTreeNode[]>(() => {
    return buildConceptTree(taxonomyEdges.value)
  })

  /**
   * Returns the perspective neighborhood for a given concept name:
   * parents, children, and the Perspective descriptor.
   *
   * The perspective `id` is `taxonomy-{conceptName}`. The `icon` is
   * resolved from the concept's effective metamodel definition (or
   * defaults to `"layers"`).
   */
  function getNeighborhood(conceptName: string): PerspectiveNeighborhood {
    const edges = taxonomyEdges.value
    const parents = edges.filter((e) => e.child === conceptName).map((e) => e.parent)
    const children = edges.filter((e) => e.parent === conceptName).map((e) => e.child)
    const concept = getConceptByName(conceptName)

    return {
      perspective: {
        id: `taxonomy-${conceptName}`,
        name: conceptName,
        icon: concept?.icon ?? 'layers',
        edges,
      },
      parents,
      children,
    }
  }

  /* ── Documentation state ── */

  const documentation = ref<Record<string, DocumentationEntry>>({})
  const docsLoading = ref(false)
  const docsError = ref<string | null>(null)

  async function loadDocumentation(
    handle: DirectoryHandleLike,
    templateName: string,
    templateVersion: string,
  ): Promise<void> {
    if (Object.keys(documentation.value).length > 0) return
    docsLoading.value = true
    docsError.value = null
    try {
      const fileHandle = await handle.getFileHandle(
        `docs/documentation/templates/${templateName}/${templateVersion}/documentation.md`,
      )
      const file = await fileHandle.getFile()
      const markdown = await file.text()
      documentation.value = parseMetamodelDocumentation(markdown)
    } catch (err) {
      docsError.value = err instanceof Error ? err.message : String(err)
    } finally {
      docsLoading.value = false
    }
  }

  /* ── Guidance accessors ── */

  function getConceptGuidance(conceptName: string): DocumentationEntry | null {
    const key = conceptName.toLowerCase()
    if (documentation.value[key]) return documentation.value[key]

    // Lazy load if documentation is empty and not currently loading
    if (Object.keys(documentation.value).length === 0 && !docsLoading.value) {
      const ws = useWorkspaceStore()
      if (ws.handle) {
        const rootNode = modelStore.getNode(modelStore.rootIds[0])
        if (rootNode) {
          const parsed = parseFormatFilename(rootNode.source.path)
          const templateName = parsed?.templateName ?? ''
          // Extract template version from frontmatter raw content
          const templateVersion = extractTemplateVersionFromRaw(rootNode.rawContent ?? '')
          if (templateName && templateVersion) {
            loadDocumentation(ws.handle, templateName, templateVersion)
          }
        }
      }
    }

    return documentation.value[key] ?? null
  }

  function getCleanPrompts(conceptName: string): string[] {
    return getConceptGuidance(conceptName)?.prompts ?? []
  }

  function getMatrixGuidance(matrixDef: { name: string; source: string; target: string }): {
    sourceEntry: DocumentationEntry | null
    targetEntry: DocumentationEntry | null
  } {
    return {
      sourceEntry: getConceptGuidance(matrixDef.source),
      targetEntry: getConceptGuidance(matrixDef.target),
    }
  }

  /**
   * Extracts the template version string from a FORMAT document's raw frontmatter.
   * Tries `template.version` first, then falls back to `model_version`.
   */
  function extractTemplateVersionFromRaw(rawContent: string): string {
    // Try template: { name: ..., version: ... } block
    const templateSection = rawContent.match(/^template:\s*\n((?:\s+[^\n]+\n)*)/m)
    if (templateSection) {
      const versionMatch = templateSection[1].match(/version:\s*["']([^"'\n]+)["']/)
      if (versionMatch) return versionMatch[1]
    }
    // Fallback to top-level model_version
    const modelVersionMatch = rawContent.match(/^model_version:\s*["']([^"'\n]+)["']/m)
    if (modelVersionMatch) return modelVersionMatch[1]
    return ''
  }

  return {
    concepts,
    markers,
    getConceptByName,
    getConceptFields,
    taxonomyEdges,
    conceptTree,
    getNeighborhood,
    documentation,
    docsLoading,
    docsError,
    loadDocumentation,
    getConceptGuidance,
    getCleanPrompts,
    getMatrixGuidance,
  }
})

/* ── Pure helpers (not store-bound) ── */

/**
 * Builds a hierarchical tree from perspective edges.
 * - Roots = concepts that are a `parent` but never a `child`
 * - Children are nested under their parent
 * - A concept that appears as both parent and child is placed under its parent
 *   and contains its own children
 * - Duplicate edges at the same level are deduplicated
 * - Complexity: O(n) where n = number of edges
 */
function buildConceptTree(edges: PerspectiveEdge[]): ConceptTreeNode[] {
  const childrenMap = new Map<string, string[]>()
  const childSet = new Set<string>()

  for (const edge of edges) {
    const existing = childrenMap.get(edge.parent)
    if (existing) {
      existing.push(edge.child)
    } else {
      childrenMap.set(edge.parent, [edge.child])
    }
    childSet.add(edge.child)
  }

  // Root concepts: appear as parent, never as child
  const roots = Array.from(childrenMap.keys()).filter((p) => !childSet.has(p))

  function build(name: string): ConceptTreeNode {
    const raw = childrenMap.get(name) ?? []
    // Deduplicate at each level
    const unique = [...new Set(raw)]
    return {
      name,
      children: unique.map(build),
    }
  }

  return roots.map(build)
}
