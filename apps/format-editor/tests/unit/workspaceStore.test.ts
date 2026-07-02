import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { useModelStore } from '../../src/stores/modelStore'
import { buildFakeTree } from '../helpers/fakeFs'

const indexMd = `---
specification_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# _F index

* [[Doc_FORMAT.md]]
`

const validFormatMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Workspace Store Fixture"
---

# _F Business summary

Fixture used to exercise workspaceStore.open() single-parse-pass behavior.
`

describe('workspaceStore.open()', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('triggers exactly one parse pass into modelStore on the first open()', async () => {
    const workspaceStore = useWorkspaceStore()
    const modelStore = useModelStore()
    const handle = buildFakeTree('workspace', { 'index.md': indexMd, 'Doc_FORMAT.md': validFormatMd })

    await workspaceStore.open(handle)

    expect(workspaceStore.parseCount).toBe(1)
    expect(workspaceStore.hasParsed).toBe(true)
    expect(Object.keys(modelStore.nodes).length).toBeGreaterThan(0)
  })

  it('does not trigger a second parse pass when open() is invoked twice', async () => {
    const workspaceStore = useWorkspaceStore()
    const handle = buildFakeTree('workspace', { 'index.md': indexMd, 'Doc_FORMAT.md': validFormatMd })

    await workspaceStore.open(handle)
    await workspaceStore.open(handle)

    expect(workspaceStore.parseCount).toBe(1)
  })

  it('does not trigger a second parse pass on repeated route-navigation-like open() calls with the same handle', async () => {
    const workspaceStore = useWorkspaceStore()
    const handle = buildFakeTree('workspace', { 'index.md': indexMd, 'Doc_FORMAT.md': validFormatMd })

    await workspaceStore.open(handle)
    // Simulate navigating between routes/nodes: nothing should re-invoke parsing.
    await workspaceStore.open(handle)
    await workspaceStore.open(handle)

    expect(workspaceStore.parseCount).toBe(1)
  })
})
