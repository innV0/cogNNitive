import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import Header from '../../src/components/layout/Header.vue'
import { useModelStore } from '../../src/stores/modelStore'
import type { ModelNode } from '../../src/model/types'

function makeNode(id: string, fields: Record<string, any>): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    type: 'document',
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
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
    source: { path: 'path/to/model.md' },
  }
}

describe('Header.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders model metadata from root node fields correctly', () => {
    const modelStore = useModelStore()
    modelStore.rootIds = ['Root']
    modelStore.nodes = {
      Root: makeNode('Root', {
        spec_version: 'V_0-1-9',
        template_name: 'CustomTemplate',
        template_version: 'V_2-0-0',
        model_version: 'V_1-2-3',
      }),
    }

    const wrapper = mount(Header)
    const text = wrapper.text()

    expect(text).toContain('V_0-1-9')
    expect(text).toContain('CustomTemplate')
    expect(text).toContain('V_2-0-0')
    expect(text).toContain('V_1-2-3')
  })

  it('renders fallback values when root node fields are missing', () => {
    const modelStore = useModelStore()
    modelStore.rootIds = ['Root']
    modelStore.nodes = {
      Root: makeNode('Root', {}),
    }

    const wrapper = mount(Header)
    const text = wrapper.text()

    // DEFAULT_INNFO_VERSION = 'V_0-2-0'
    // DEFAULT_TEMPLATE_NAME = 'business'
    // DEFAULT_TEMPLATE_VERSION = 'V_1-0-0'
    expect(text).toContain('V_0-2-0')
    expect(text).toContain('business')
    expect(text).toContain('V_1-0-0')
    expect(text).toContain('—') // model version fallback
  })
})
