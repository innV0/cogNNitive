/** Diagnostic emitted when two siblings share a name (identity collision). */
export interface CollisionDiagnostic {
  parentQualifiedId: string | null
  name: string
  message: string
}

/**
 * Tracks sibling name uniqueness per parent and builds qualified ids
 * (ancestor chain joined `Parent/Child`). Node identity is name-unique
 * among siblings; qualified path disambiguates across branches.
 */
export class IdentityRegistry {
  private siblingNames = new Map<string | null, Set<string>>()
  private occurrenceCounts = new Map<string, number>()
  private collisions: CollisionDiagnostic[] = []

  /**
   * Registers a node name under its parent's qualified id (null for root).
   * Returns the qualified id for this node. If the sibling name already
   * exists (collision), flags a collision diagnostic (without throwing)
   * AND disambiguates the returned qualified id with an occurrence suffix
   * (e.g. `Parent/Alpha#2`) so the colliding node still gets a unique,
   * retrievable graph key instead of silently overwriting the first one (R11).
   */
  register(parentQualifiedId: string | null, name: string): string {
    const siblings = this.siblingNames.get(parentQualifiedId) ?? new Set<string>()
    const baseQualifiedId = buildQualifiedId(parentQualifiedId, name)

    if (siblings.has(name)) {
      this.collisions.push({
        parentQualifiedId,
        name,
        message: `Duplicate sibling name "${name}" under ${parentQualifiedId ?? '<root>'}`,
      })
      const nextOccurrence = (this.occurrenceCounts.get(baseQualifiedId) ?? 1) + 1
      this.occurrenceCounts.set(baseQualifiedId, nextOccurrence)
      return `${baseQualifiedId}#${nextOccurrence}`
    }

    siblings.add(name)
    this.siblingNames.set(parentQualifiedId, siblings)
    this.occurrenceCounts.set(baseQualifiedId, 1)

    return baseQualifiedId
  }

  getCollisions(): CollisionDiagnostic[] {
    return [...this.collisions]
  }

  hasCollisions(): boolean {
    return this.collisions.length > 0
  }
}

/** Builds a qualified id by joining the parent's qualified id and this node's name. */
export function buildQualifiedId(parentQualifiedId: string | null, name: string): string {
  return parentQualifiedId ? `${parentQualifiedId}/${name}` : name
}
