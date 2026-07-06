import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FieldViewer from '../../src/components/editor/FieldViewer.vue'
import { useModelStore } from '../../src/stores/modelStore'
import type { ModelNode } from '../../src/model/types'

function makeNode(id: string, fieldValues: Record<string, unknown>): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    type: 'text',
    fields: Object.fromEntries(
      Object.entries(fieldValues).map(([key, value]) => [
        key,
        {
          value,
          provenance: {
            author: { kind: 'system', id: 'parser' },
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        },
      ]),
    ),
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: id },
  }
}

describe('FieldViewer.vue — R-SC-06', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const fieldDefs = [
    { name: 'status', type: 'select', options: ['active', 'inactive'] },
    { name: 'summary', type: 'string' },
    { name: 'count', type: 'number' },
    { name: 'is_enabled', type: 'boolean' },
  ]

  it('renders field labels and values in read mode', () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', {
          status: 'active',
          summary: 'Hello world',
          count: 42,
          is_enabled: true,
        }),
      },
      ['Root'],
    )

    const wrapper = mount(FieldViewer, {
      props: {
        nodeId: 'Root',
        fieldDefinitions: fieldDefs,
        readonly: true,
      },
    })

    const text = wrapper.text()
    // Labels use CSS `uppercase` — happy-dom does not apply CSS transforms,
    // so we assert against the raw field name (before CSS transform).
    expect(text).toContain('status')
    expect(text).toContain('active')
    expect(text).toContain('summary')
    expect(text).toContain('Hello world')
    expect(text).toContain('count')
    expect(text).toContain('42')
    // Field label replaces underscore with space: is_enabled → "is enabled"
    expect(text).toContain('is enabled')
  })

  it('shows emerald Yes for boolean true fields', () => {
    const modelStore = useModelStore()
    modelStore.setGraph({ Root: makeNode('Root', { is_enabled: true }) }, ['Root'])

    const wrapper = mount(FieldViewer, {
      props: {
        nodeId: 'Root',
        fieldDefinitions: [{ name: 'is_enabled', type: 'boolean' }],
        readonly: true,
      },
    })

    expect(wrapper.text()).toContain('Yes')
  })

  it('shows em dash placeholder for empty field values', () => {
    const modelStore = useModelStore()
    modelStore.setGraph({ Root: makeNode('Root', { status: '' }) }, ['Root'])

    const wrapper = mount(FieldViewer, {
      props: {
        nodeId: 'Root',
        fieldDefinitions: [{ name: 'status', type: 'select' }],
        readonly: true,
      },
    })

    // The em dash (—) replaces empty values
    expect(wrapper.text()).toContain('—')
  })

  it('renders WidgetField in edit mode (non-readonly)', () => {
    const modelStore = useModelStore()
    modelStore.setGraph({ Root: makeNode('Root', { summary: 'Hello' }) }, ['Root'])

    const wrapper = mount(FieldViewer, {
      props: {
        nodeId: 'Root',
        fieldDefinitions: [{ name: 'summary', type: 'string' }],
        readonly: false,
      },
    })

    // In edit mode, WidgetField renders an input tag
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.element.value).toBe('Hello')
  })

  it('shows empty state when no field definitions provided', () => {
    const wrapper = mount(FieldViewer, {
      props: {
        nodeId: 'Root',
        fieldDefinitions: [],
        readonly: true,
      },
    })

    expect(wrapper.text()).toContain('No fields defined for this concept.')
  })

  it('renders a select badge for select-type fields in read mode', () => {
    const modelStore = useModelStore()
    modelStore.setGraph({ Root: makeNode('Root', { status: 'active' }) }, ['Root'])

    const wrapper = mount(FieldViewer, {
      props: {
        nodeId: 'Root',
        fieldDefinitions: [{ name: 'status', type: 'select', options: ['active', 'inactive'] }],
        readonly: true,
      },
    })

    // Select values render as badge chips in read mode
    expect(wrapper.text()).toContain('active')
  })
})
