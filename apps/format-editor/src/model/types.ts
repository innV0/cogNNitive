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
  source: { path: string } // FS location for write-back
}
