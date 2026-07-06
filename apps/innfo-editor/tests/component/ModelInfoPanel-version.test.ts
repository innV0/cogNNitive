import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ModelInfoPanel from '../../src/components/editor/ModelInfoPanel.vue'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { useModelStore } from '../../src/stores/modelStore'
import type { ModelNode } from '../../src/model/types'

function makeNode(id: string, overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    storageMode: 'FILE' as const,
    type: 'text',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: id },
    ...overrides,
  }
}

const rootContentWithVersion = `---
spec_version: "V_0-1-5"
model_version: "V_1-2-3"
title: "Versioned Model"
---

# _F Versioned Model

A model with a version field.
`

const rootContentWithoutVersion = `---
spec_version: "V_0-1-5"
title: "Unversioned Model"
---

# _F Unversioned Model

A model without explicit version.
`

describe('ModelInfoPanel.vue — Version Management (R-VM-01, R-VM-06)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows current version from model frontmatter', async () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', {
          kind: 'concept',
          childIds: [],
          rawContent: rootContentWithVersion,
          source: { path: 'Model_V_1-2-3_Template_F.md' },
        }),
      },
      ['Root'],
    )

    const wrapper = mount(ModelInfoPanel, {
      props: { rootNodeId: 'Root' },
    })

    // The header should show "V_1-2-3" in the collapsible header
    // First click to expand the version panel
    const versionHeaders = wrapper.findAll('h3')
    // Find the Version Management header
    const versionHeader = versionHeaders.find((h3) => h3.text().includes('Version Management'))
    expect(versionHeader).toBeDefined()

    // Click to expand
    const collapsibleDiv = wrapper.find('.cursor-pointer')
    await collapsibleDiv.trigger('click')

    // Now the expanded panel should show the current version
    const versionDisplay = wrapper.find('.font-mono.font-bold')
    expect(versionDisplay.exists()).toBe(true)
    expect(versionDisplay.text()).toContain('V_1-2-3')
  })

  it('defaults to V_1-0-0 when no model_version in frontmatter', async () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', {
          kind: 'concept',
          childIds: [],
          rawContent: rootContentWithoutVersion,
          source: { path: 'Model_V_1-0-0_Template_F.md' },
        }),
      },
      ['Root'],
    )

    const wrapper = mount(ModelInfoPanel, {
      props: { rootNodeId: 'Root' },
    })

    // Expand the panel
    const collapsibleDiv = wrapper.find('.cursor-pointer')
    await collapsibleDiv.trigger('click')

    // Should show default V_1-0-0
    const versionDisplay = wrapper.find('.font-mono.font-bold')
    expect(versionDisplay.exists()).toBe(true)
    expect(versionDisplay.text()).toContain('V_1-0-0')
  })

  it('shows three bump buttons with version previews', async () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', {
          kind: 'concept',
          childIds: [],
          rawContent: rootContentWithVersion,
          source: { path: 'Model_V_1-2-3_Template_F.md' },
        }),
      },
      ['Root'],
    )
    // Set up a workspace handle so buttons are not disabled
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = { name: 'test' } as any
    workspaceStore.hasHandle = true

    const wrapper = mount(ModelInfoPanel, {
      props: { rootNodeId: 'Root' },
    })

    // Expand panel
    const collapsibleDiv = wrapper.find('.cursor-pointer')
    await collapsibleDiv.trigger('click')

    // There should be 3 buttons
    const buttons = wrapper.findAll('.grid-cols-3 button')
    expect(buttons).toHaveLength(3)

    // Button text should contain bump level names
    const buttonText = buttons.map((b) => b.text())
    const allText = buttonText.join(' ')
    expect(allText).toContain('Major')
    expect(allText).toContain('Minor')
    expect(allText).toContain('Patch')

    // Should show version previews
    expect(allText).toContain('V_2-0-0') // major
    expect(allText).toContain('V_1-3-0') // minor
    expect(allText).toContain('V_1-2-4') // patch
  })

  it('bump buttons show hover tooltip with version preview', async () => {
    const modelStore = useModelStore()
    modelStore.setGraph(
      {
        Root: makeNode('Root', {
          kind: 'concept',
          childIds: [],
          rawContent: rootContentWithVersion,
          source: { path: 'Model_V_1-2-3_Template_F.md' },
        }),
      },
      ['Root'],
    )
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = { name: 'test' } as any
    workspaceStore.hasHandle = true

    const wrapper = mount(ModelInfoPanel, {
      props: { rootNodeId: 'Root' },
    })

    const collapsibleDiv = wrapper.find('.cursor-pointer')
    await collapsibleDiv.trigger('click')

    const buttons = wrapper.findAll('.grid-cols-3 button')
    expect(buttons.length).toBeGreaterThanOrEqual(3)

    // Check title attributes for version preview format "V_1-2-3 → V_X-Y-Z"
    const titles = buttons.map((b) => b.attributes('title'))
    expect(titles[0]).toContain('→')
    expect(titles[0]).toContain('V_1-2-3')
  })

  describe('Disabled states (R-VM-06)', () => {
    it('buttons are disabled when no workspace handle is connected', async () => {
      const modelStore = useModelStore()
      modelStore.setGraph(
        {
          Root: makeNode('Root', {
            kind: 'concept',
            childIds: [],
            rawContent: rootContentWithVersion,
          }),
        },
        ['Root'],
      )
      // Deliberately no handle set

      const wrapper = mount(ModelInfoPanel, {
        props: { rootNodeId: 'Root' },
      })

      const collapsibleDiv = wrapper.find('.cursor-pointer')
      await collapsibleDiv.trigger('click')

      const buttons = wrapper.findAll('.grid-cols-3 button')
      buttons.forEach((btn) => {
        expect(btn.attributes('disabled')).toBeDefined()
        // Should have opacity class
        expect(btn.classes()).toContain('opacity-50')
        expect(btn.classes()).toContain('cursor-not-allowed')
      })
    })

    it('shows tooltip explaining why buttons are disabled', async () => {
      const modelStore = useModelStore()
      modelStore.setGraph(
        {
          Root: makeNode('Root', {
            kind: 'concept',
            childIds: [],
            rawContent: rootContentWithVersion,
          }),
        },
        ['Root'],
      )

      const wrapper = mount(ModelInfoPanel, {
        props: { rootNodeId: 'Root' },
      })

      const collapsibleDiv = wrapper.find('.cursor-pointer')
      await collapsibleDiv.trigger('click')

      // Check that a disabled reason message is shown
      const reasonText = wrapper.find('.text-amber-500')
      expect(reasonText.exists()).toBe(true)
      expect(reasonText.text()).toContain('Connect a workspace')
    })

    it('buttons are disabled when saving is in progress', async () => {
      const modelStore = useModelStore()
      modelStore.setGraph(
        {
          Root: makeNode('Root', {
            kind: 'concept',
            childIds: [],
            rawContent: rootContentWithVersion,
          }),
        },
        ['Root'],
      )
      const workspaceStore = useWorkspaceStore()
      workspaceStore.handle = { name: 'test' } as any
      workspaceStore.hasHandle = true
      workspaceStore.saving = true // Saving in progress

      const wrapper = mount(ModelInfoPanel, {
        props: { rootNodeId: 'Root' },
      })

      const collapsibleDiv = wrapper.find('.cursor-pointer')
      await collapsibleDiv.trigger('click')

      const buttons = wrapper.findAll('.grid-cols-3 button')
      buttons.forEach((btn) => {
        expect(btn.attributes('disabled')).toBeDefined()
      })
    })

    it('buttons are disabled when there is no root node', async () => {
      // Don't set up modelStore at all (no root)
      const workspaceStore = useWorkspaceStore()
      workspaceStore.handle = { name: 'test' } as any
      workspaceStore.hasHandle = true

      const wrapper = mount(ModelInfoPanel, {
        props: { rootNodeId: 'Root' },
      })

      const collapsibleDiv = wrapper.find('.cursor-pointer')
      await collapsibleDiv.trigger('click')

      const buttons = wrapper.findAll('.grid-cols-3 button')
      buttons.forEach((btn) => {
        expect(btn.attributes('disabled')).toBeDefined()
      })
    })
  })
})
