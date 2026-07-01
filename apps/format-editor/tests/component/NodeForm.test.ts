import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import NodeForm from '../../src/components/NodeForm.vue'
import { useModelStore } from '../../src/stores/modelStore'
import type { ModelNode } from '../../src/model/types'

function fieldValue(value: unknown) {
  return { value, provenance: { author: { kind: 'system' as const, id: 'parser' }, timestamp: '2024-01-01T00:00:00.000Z' } }
}

function makeNode(id: string, overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    storageMode: 'FILE',
    type: 'text',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: id },
    ...overrides,
  }
}

describe('NodeForm: metamodel-driven editing (R10, R14)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders an edit form for the selected node resolved fields/markers (scenario "Select node renders form")', () => {
    const modelStore = useModelStore()
    const root = makeNode('Root', {
      localMetamodel: { concepts: [{ name: 'Summary', type: 'text' }], markers: [] },
    })
    const child = makeNode('Root/Child', {
      parentId: 'Root',
      fields: { Summary: fieldValue('Hello') },
    })
    modelStore.setGraph({ Root: root, 'Root/Child': child }, ['Root'])

    const wrapper = mount(NodeForm, { props: { nodeId: 'Root/Child' } })

    expect(wrapper.find('.node-form').exists()).toBe(true)
    expect(wrapper.text()).toContain('Summary')
  })

  it('renders exactly the resolved metamodel fields — present fields shown (R10 scenario)', () => {
    const modelStore = useModelStore()
    const root = makeNode('Root', {
      localMetamodel: {
        concepts: [
          { name: 'Summary', type: 'text' },
          { name: 'Score', type: 'weight' },
        ],
        markers: [],
      },
    })
    const child = makeNode('Root/Child', {
      parentId: 'Root',
      fields: { Summary: fieldValue('Hello'), Score: fieldValue(3) },
    })
    modelStore.setGraph({ Root: root, 'Root/Child': child }, ['Root'])

    const wrapper = mount(NodeForm, { props: { nodeId: 'Root/Child' } })

    expect(wrapper.text()).toContain('Summary')
    expect(wrapper.text()).toContain('Score')
  })

  it('omits fields not present in the resolved metamodel (R10 scenario "Form omits non-applicable fields")', () => {
    const modelStore = useModelStore()
    const root = makeNode('Root', {
      localMetamodel: { concepts: [{ name: 'Summary', type: 'text' }], markers: [] },
    })
    const child = makeNode('Root/Child', {
      parentId: 'Root',
      // Node data has an extra field ("Untracked") not declared by the
      // resolved metamodel; the form must not render it.
      fields: { Summary: fieldValue('Hello'), Untracked: fieldValue('should not render') },
    })
    modelStore.setGraph({ Root: root, 'Root/Child': child }, ['Root'])

    const wrapper = mount(NodeForm, { props: { nodeId: 'Root/Child' } })

    expect(wrapper.text()).toContain('Summary')
    expect(wrapper.text()).not.toContain('Untracked')
  })

  it('updates to reflect the newly selected node when switching selection (scenario "Switch selection updates form")', async () => {
    const modelStore = useModelStore()
    const root = makeNode('Root', {
      localMetamodel: {
        concepts: [
          { name: 'A', type: 'text' },
          { name: 'B', type: 'text' },
        ],
        markers: [],
      },
    })
    const nodeA = makeNode('Root/NodeA', { parentId: 'Root', fields: { A: fieldValue('valueA') } })
    const nodeB = makeNode('Root/NodeB', { parentId: 'Root', fields: { B: fieldValue('valueB') } })
    modelStore.setGraph({ Root: root, 'Root/NodeA': nodeA, 'Root/NodeB': nodeB }, ['Root'])

    const wrapper = mount(NodeForm, { props: { nodeId: 'Root/NodeA' } })
    expect(wrapper.text()).toContain('A')

    await wrapper.setProps({ nodeId: 'Root/NodeB' })
    expect(wrapper.text()).toContain('B')
  })
})
