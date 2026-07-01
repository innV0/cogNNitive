import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarTree from '../../src/components/SidebarTree.vue'
import { useModelStore } from '../../src/stores/modelStore'
import type { ModelNode } from '../../src/model/types'

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

describe('SidebarTree: single mixed FILE+FOLDER tree (R13)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders both file-type and folder-type nodes in one tree, not two separate lists (scenario "Mixed tree rendered")', () => {
    const modelStore = useModelStore()
    const folderRoot = makeNode('FolderRoot', { storageMode: 'FOLDER', childIds: ['FolderRoot/FileChild'] })
    const fileChild = makeNode('FolderRoot/FileChild', { storageMode: 'FILE', parentId: 'FolderRoot' })
    modelStore.setGraph({ FolderRoot: folderRoot, 'FolderRoot/FileChild': fileChild }, ['FolderRoot'])

    const wrapper = mount(SidebarTree)

    expect(wrapper.findAll('.sidebar-tree').length).toBe(1)
    expect(wrapper.text()).toContain('FolderRoot')
    expect(wrapper.text()).toContain('FileChild')
  })

  it('allows selecting both a file-type and a folder-type node from the same tree (scenario "Selection works across types")', async () => {
    const modelStore = useModelStore()
    const folderRoot = makeNode('FolderRoot', { storageMode: 'FOLDER', childIds: ['FolderRoot/FileChild'] })
    const fileChild = makeNode('FolderRoot/FileChild', { storageMode: 'FILE', parentId: 'FolderRoot' })
    modelStore.setGraph({ FolderRoot: folderRoot, 'FolderRoot/FileChild': fileChild }, ['FolderRoot'])

    const wrapper = mount(SidebarTree)

    await wrapper.get('[data-node-id="FolderRoot"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['FolderRoot'])

    await wrapper.get('[data-node-id="FolderRoot/FileChild"]').trigger('click')
    expect(wrapper.emitted('select')?.[1]).toEqual(['FolderRoot/FileChild'])
  })
})
