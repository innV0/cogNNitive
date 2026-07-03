import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModelStore } from '../../src/stores/modelStore'
import type { ModelNode } from '../../src/model/types'

function makeNode(id: string, overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    type: 'text',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: id },
    ...overrides,
  }
}

describe('modelStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('holds exactly one normalized graph as the source of truth', () => {
    const modelStore = useModelStore()
    const root = makeNode('Root')
    modelStore.setGraph({ Root: root }, ['Root'])

    expect(modelStore.getRoots()).toEqual([root])
    expect(modelStore.getNode('Root')).toEqual(root)
  })

  it('exposes selectors for children lookup via parentId/childIds', () => {
    const modelStore = useModelStore()
    const child = makeNode('Root/Child', { parentId: 'Root' })
    const root = makeNode('Root', { childIds: ['Root/Child'] })
    modelStore.setGraph({ Root: root, 'Root/Child': child }, ['Root'])

    expect(modelStore.getChildren('Root')).toEqual([child])
  })

  it('tracks dirty nodes independently per node', () => {
    const modelStore = useModelStore()
    modelStore.setGraph({ Root: makeNode('Root') }, ['Root'])

    expect(modelStore.isDirty('Root')).toBe(false)
    modelStore.markDirty('Root')
    expect(modelStore.isDirty('Root')).toBe(true)
    modelStore.clearDirty('Root')
    expect(modelStore.isDirty('Root')).toBe(false)
  })
})
