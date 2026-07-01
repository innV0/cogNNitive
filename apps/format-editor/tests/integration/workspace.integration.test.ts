import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import WorkspaceView from '../../src/views/WorkspaceView.vue'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { routes } from '../../src/router/index'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

const folderRootMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Integration Folder Root"
mode: "FOLDER"
concepts:
  - name: "Business summary"
    type: "text"
---

# _F Business summary

Folder root used in the SidebarTree + NodeForm integration test.
`

const fileChildMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Integration File Child"
mode: "FILE"
---

# _F Problems

* _F Problems: Sample Problem
  A problem used to give the FILE child node some field data.
`

describe('SidebarTree + NodeForm integration (mixed FILE/FOLDER tree, R13 scenario "Selection works across types")', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts with Pinia + Router and a fake FileSystemDirectoryHandle; both node types are selectable and each loads its form', async () => {
    const tree: FakeTree = {
      IntegrationRoot: {
        '_FORMAT.md': folderRootMd,
        'Child_FORMAT.md': fileChildMd,
      },
    }
    const handle = buildFakeTree('workspace', tree)

    const router = createRouter({ history: createMemoryHistory(), routes })
    const workspaceStore = useWorkspaceStore()
    await workspaceStore.open(handle)

    await router.push('/workspace')
    await router.isReady()

    const wrapper = mount(WorkspaceView, {
      global: { plugins: [router] },
    })
    await wrapper.vm.$nextTick()

    // FOLDER root node is selectable and loads its form.
    await wrapper.get('[data-node-id="IntegrationRoot"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.node-form').exists()).toBe(true)
    expect(wrapper.text()).toContain('IntegrationRoot')

    // FILE child node (nested under the FOLDER root) is also selectable
    // from the same tree and loads its own form.
    const fileChildRow = wrapper.findAll('[data-node-id]').find((el) => el.text().includes('Child'))
    expect(fileChildRow).toBeDefined()
    await fileChildRow!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.node-form').text()).toContain('Child')
  })
})
