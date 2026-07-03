import { describe, it, expect } from 'vitest'
import { IdentityRegistry, buildQualifiedId } from '../../src/model/identity'

describe('identity', () => {
  it('accepts unique sibling names', () => {
    const registry = new IdentityRegistry()
    const alpha = registry.register(null, 'Alpha')
    const beta = registry.register(null, 'Beta')

    expect(alpha).toBe('Alpha')
    expect(beta).toBe('Beta')
    expect(registry.hasCollisions()).toBe(false)
  })

  it('flags duplicate sibling names as a collision, not a silent merge', () => {
    const registry = new IdentityRegistry()
    registry.register(null, 'Alpha')
    registry.register(null, 'Alpha')

    expect(registry.hasCollisions()).toBe(true)
    const collisions = registry.getCollisions()
    expect(collisions).toHaveLength(1)
    expect(collisions[0].name).toBe('Alpha')
    expect(collisions[0].parentQualifiedId).toBeNull()
  })

  it('disambiguates the colliding qualified id instead of reusing the first one (R11 — no silent overwrite)', () => {
    const registry = new IdentityRegistry()
    const first = registry.register(null, 'Alpha')
    const second = registry.register(null, 'Alpha')

    expect(first).toBe('Alpha')
    expect(second).not.toBe(first)
    expect(second).toBe('Alpha#2')

    const third = registry.register(null, 'Alpha')
    expect(third).toBe('Alpha#3')
  })

  it('resolves cross-branch same-name nodes to distinct qualified paths', () => {
    const registry = new IdentityRegistry()
    const parent1 = registry.register(null, 'Parent1')
    const parent2 = registry.register(null, 'Parent2')
    const alphaUnderParent1 = registry.register(parent1, 'Alpha')
    const alphaUnderParent2 = registry.register(parent2, 'Alpha')

    expect(alphaUnderParent1).toBe('Parent1/Alpha')
    expect(alphaUnderParent2).toBe('Parent2/Alpha')
    expect(alphaUnderParent1).not.toBe(alphaUnderParent2)
    expect(registry.hasCollisions()).toBe(false)
  })

  it('buildQualifiedId joins ancestor chain with Parent/Child', () => {
    expect(buildQualifiedId(null, 'Process')).toBe('Process')
    expect(buildQualifiedId('Process', 'Phase')).toBe('Process/Phase')
    expect(buildQualifiedId('Process/Phase', 'Task')).toBe('Process/Phase/Task')
  })
})
