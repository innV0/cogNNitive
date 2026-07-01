import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { recursiveSerialize } from '../../src/model/recursiveSerializer'
import { buildFakeTree, readFakeTree, type FakeTree } from '../helpers/fakeFs'
import type { ModelNode } from '../../src/model/types'

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

Synthetic FOLDER-mode fixture root used to exercise recursive folder round-trip.
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

function structureOf(nodes: Record<string, ModelNode>, rootIds: string[]) {
  const nodeSummaries = Object.values(nodes)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => ({
      id: n.id,
      name: n.name,
      parentId: n.parentId,
      storageMode: n.storageMode,
      fieldKeys: Object.keys(n.fields).sort(),
      childCount: n.childIds.length,
    }))
  return { rootIds: [...rootIds].sort(), nodeCount: Object.keys(nodes).length, nodes: nodeSummaries }
}

async function assertRoundTripStable(tree: FakeTree): Promise<void> {
  const root = buildFakeTree('workspace', tree)
  const firstParse = await recursiveParse(root)
  expect(firstParse.issues).toHaveLength(0)

  const dirtyIds = new Set(
    Object.values(firstParse.nodes)
      .filter((n) => n.rawContent !== undefined)
      .map((n) => n.id),
  )
  await recursiveSerialize(root, firstParse.nodes, firstParse.rootIds, dirtyIds)

  const secondParse = await recursiveParse(root)
  expect(secondParse.issues).toHaveLength(0)

  expect(structureOf(secondParse.nodes, secondParse.rootIds)).toEqual(
    structureOf(firstParse.nodes, firstParse.rootIds),
  )
}

describe('recursiveSerializer golden round-trip: synthetic FOLDER fixture (task 3.6)', () => {
  it('parse -> serialize -> re-parse is structurally stable for nested FOLDER dirs', async () => {
    await assertRoundTripStable({
      RootFolder: {
        '_FORMAT.md': rootFormatMd,
        ChildFolder: { '_FORMAT.md': childFormatMd },
      },
    })
  })
})

describe('recursiveSerializer golden round-trip: mixed FILE+FOLDER tree fixture (task 3.6)', () => {
  it('parse -> serialize -> re-parse is structurally stable for a mixed tree', async () => {
    await assertRoundTripStable({
      MixedRoot: {
        '_FORMAT.md': rootFormatMd,
        'Nested_FORMAT.md': fileDocMd,
      },
    })
  })
})
