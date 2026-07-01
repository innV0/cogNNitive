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
  private collisions: CollisionDiagnostic[] = []

  /**
   * Registers a node name under its parent's qualified id (null for root).
   * Returns the qualified id for this node, and flags a collision
   * diagnostic (without throwing) if the sibling name already exists.
   */
  register(parentQualifiedId: string | null, name: string): string {
    const siblings = this.siblingNames.get(parentQualifiedId) ?? new Set<string>()
    if (siblings.has(name)) {
      this.collisions.push({
        parentQualifiedId,
        name,
        message: `Duplicate sibling name "${name}" under ${parentQualifiedId ?? '<root>'}`,
      })
    }
    siblings.add(name)
    this.siblingNames.set(parentQualifiedId, siblings)

    return buildQualifiedId(parentQualifiedId, name)
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
