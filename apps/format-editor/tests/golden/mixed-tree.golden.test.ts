import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

const folderRootFormatMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Mixed Tree Folder Root"
mode: "FOLDER"
---

# _F Business summary

Mixed-tree FOLDER root that also contains a FILE-mode sibling document.
`

const fileDocMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Mixed Tree File Child"
mode: "FILE"
---

# _F Problems

* _F Problems: File Mode Problem
  A problem defined inside a FILE-mode document nested under a FOLDER node.
`

/** Mixed FILE+FOLDER fixture tree (task 3.6): a FOLDER root with a nested FILE child. */
const mixedTree: FakeTree = {
  MixedRoot: {
    '_FORMAT.md': folderRootFormatMd,
    'Nested_FORMAT.md': fileDocMd,
  },
}

describe('recursiveParser: mixed FILE+FOLDER tree', () => {
  it('parses all nodes (root and descendants, regardless of mode) into the same graph', async () => {
    const root = buildFakeTree('workspace', mixedTree)
    const result = await recursiveParse(root)

    expect(result.issues).toHaveLength(0)

    const folderRoot = Object.values(result.nodes).find((n) => n.name === 'MixedRoot')
    const fileChild = Object.values(result.nodes).find((n) => n.name === 'Nested')
    const fileModeProblem = Object.values(result.nodes).find((n) => n.name === 'File Mode Problem')

    expect(folderRoot).toBeDefined()
    expect(folderRoot!.storageMode).toBe('FOLDER')

    expect(fileChild).toBeDefined()
    expect(fileChild!.storageMode).toBe('FILE')
    expect(fileChild!.parentId).toBe(folderRoot!.id)

    expect(fileModeProblem).toBeDefined()
    expect(fileModeProblem!.parentId).toBe(fileChild!.id)

    // All nodes, regardless of storageMode, live in the same graph object.
    const allIds = new Set(Object.keys(result.nodes))
    expect(allIds.has(folderRoot!.id)).toBe(true)
    expect(allIds.has(fileChild!.id)).toBe(true)
    expect(allIds.has(fileModeProblem!.id)).toBe(true)
  })
})
