/** Who/what produced a value change. */
export interface Author {
  kind: 'user' | 'ai' | 'system'
  id: string
}

/** Provenance stamp attached to every field write. */
export interface Provenance {
  author: Author
  timestamp: string // ISO-8601
}

/** A single field's value plus who set it and when. */
export interface FieldValue {
  value: unknown
  provenance: Provenance
}

/** A normalized relationship edge stored on a node. */
export interface ModelRelationship {
  targetId: string
  label: string
  value?: string | number
}

/** Storage representation a node round-trips through. */
export type StorageMode = 'FILE' | 'FOLDER'

/** A single concept declaration, as declared in a document's frontmatter `concepts:` list. */
export interface MetamodelConcept {
  name: string
  icon?: string
  type: string
  color?: string
  weight?: number
  fields?: { name: string; type: string; options?: string[]; target_concepts?: string[] }[]
}

/** A single marker declaration, as declared in a document's frontmatter `markers:` list. */
export interface MetamodelMarker {
  name: string
  icon?: string
  symbol?: string
  color?: string
  weight?: number
}

/**
 * The metamodel declared locally by a FILE/FOLDER root node's own
 * frontmatter (`concepts`/`markers`). Nodes without their own file
 * (nested elements) declare no local metamodel (empty arrays); their
 * effective metamodel is resolved by walking up to their nearest
 * FILE/FOLDER ancestor and beyond (see `metamodel.ts`).
 */
export interface LocalMetamodel {
  concepts: MetamodelConcept[]
  markers: MetamodelMarker[]
}

/**
 * Normalized graph node. One shape for both FILE-mode and FOLDER-mode
 * representations — storageMode is a per-node projection property,
 * orthogonal to the logical graph.
 */
export interface ModelNode {
  id: string // qualifiedId, e.g. "Process/Phase/Task"
  name: string // unique among siblings
  parentId: string | null
  childIds: string[]
  storageMode: StorageMode
  type: string // resolved concept type
  fields: Record<string, FieldValue>
  markers: Record<string, number | string>
  relationships: ModelRelationship[]
  rawSections: Record<string, string> // round-trip fidelity
  /**
   * Full original source text for FILE/FOLDER root nodes (the node whose
   * own `_FORMAT.md`/file was parsed via `parseModel`). Undefined for
   * element nodes nested inside a document (they have no own file).
   * Used by the serializer for byte/structurally-equivalent no-edit
   * round-trip (R7) instead of re-deriving through `serializeModel`'s
   * canonical reformatting, which is not guaranteed to match source bytes.
   */
  rawContent?: string
  /**
   * This node's own locally-declared metamodel (frontmatter `concepts`/
   * `markers`), present only on FILE/FOLDER root nodes (undefined for
   * nested element nodes, which declare nothing locally). Root-resolved
   * effective metamodel = walk ancestor chain merging these declarations,
   * closest subtree override wins (R9) — see `metamodel.ts`.
   */
  localMetamodel?: LocalMetamodel
  /**
   * Optional node-kind discriminator.
   * - 'root': the top-level FILE/FOLDER node of a workspace (parentId === null).
   * - 'concept': a bare directory or `# _F` section representing a type/group.
   * - 'element': a `type:`-bearing directory or index-block instance.
   * Undefined means the node was created before this discriminator existed
   * (backward-compatible with existing graphs).
   */
  kind?: 'root' | 'concept' | 'element'
  /**
   * Optional metamodel binding for concept/group nodes.
   * - `source: 'metamodel'`: the concept name matched a declared concept in
   *    the resolved metamodel.
   * - `source: 'structural'`: no matching concept found; the node is a
   *    structural concept/group placeholder.
   * Undefined means the node is not a concept node or pre-dates this field.
   */
  conceptBinding?: { name: string; source: 'metamodel' | 'structural' }
  source: { path: string } // FS location for write-back
}
