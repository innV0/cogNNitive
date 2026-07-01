import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

const rootFormatMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Synthetic Folder Root"
mode: "FOLDER"
---

# _F Business summary

Synthetic FOLDER-mode fixture root used to exercise recursive folder parsing.
`

const childFormatMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Synthetic Folder Child"
mode: "FOLDER"
---

# _F Problems

* _F Problems: Nested Problem
  A problem defined inside a nested FOLDER child.
`

/** Synthetic FOLDER fixture: nested dirs with `_FORMAT.md` (task 3.6). */
const folderTree: FakeTree = {
  RootFolder: {
    '_FORMAT.md': rootFormatMd,
    ChildFolder: {
      '_FORMAT.md': childFormatMd,
    },
  },
}

describe('recursiveParser: synthetic FOLDER fixture', () => {
  it('parses nested FOLDER dirs into the same graph, all recording storageMode FOLDER', async () => {
    const root = buildFakeTree('workspace', folderTree)
    const result = await recursiveParse(root)

    expect(result.issues).toHaveLength(0)

    const rootFolderNode = Object.values(result.nodes).find((n) => n.name === 'RootFolder')
    const childFolderNode = Object.values(result.nodes).find((n) => n.name === 'ChildFolder')
    const nestedProblem = Object.values(result.nodes).find((n) => n.name === 'Nested Problem')

    expect(rootFolderNode).toBeDefined()
    expect(rootFolderNode!.storageMode).toBe('FOLDER')
    expect(rootFolderNode!.parentId).toBeNull()

    expect(childFolderNode).toBeDefined()
    expect(childFolderNode!.storageMode).toBe('FOLDER')
    expect(childFolderNode!.parentId).toBe(rootFolderNode!.id)

    expect(nestedProblem).toBeDefined()
    expect(nestedProblem!.parentId).toBe(childFolderNode!.id)
  })
})
