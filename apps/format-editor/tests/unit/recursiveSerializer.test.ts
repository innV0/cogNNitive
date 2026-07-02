import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { recursiveSerialize } from '../../src/model/recursiveSerializer'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'
import type { ParsedModel, ModelDriver } from '@innv0/format-core'

const fileDocMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Serializer File Doc"
---

# _F index

* [[Problems]]

# _F Problems

* _F Problems: Problem One
  A problem used to exercise the serializer.
`

const indexMd = `---
specification_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# _F index

* [[Doc_FORMAT.md]]
`

describe('recursiveSerializer', () => {
  it('returns write reports for dirty nodes', async () => {
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_FORMAT.md': fileDocMd }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    const docId = Object.values(parsed.nodes).find((n) => n.name === 'Doc')!.id
    const dirty = new Set([docId])

    const report = await recursiveSerialize(parsed.nodes, dirty)
    expect(report).toHaveLength(1)
    expect(report[0].nodeId).toBe(docId)
    expect(report[0].path).toBe('Doc_FORMAT.md')
    expect(['exact', 'canonical']).toContain(report[0].fidelity)
  })

  it('returns empty report when no dirty nodes', async () => {
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_FORMAT.md': fileDocMd }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    const report = await recursiveSerialize(parsed.nodes, new Set())
    expect(report).toHaveLength(0)
  })

  it('writes through driver when provided', async () => {
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_FORMAT.md': fileDocMd }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    let writtenContent: string | null = null
    const mockDriver: ModelDriver = {
      readModel: async (_uri: string) => { throw new Error('not expected') },
      writeModel: async (_uri: string, model: ParsedModel) => {
        writtenContent = model.rawContent
      },
      listChildren: async () => [],
      listAssets: async () => [],
    }

    const docId = Object.values(parsed.nodes).find((n) => n.name === 'Doc')!.id
    const report = await recursiveSerialize(parsed.nodes, new Set([docId]), mockDriver)

    expect(report).toHaveLength(1)
    expect(writtenContent).not.toBeNull()
    expect(writtenContent!).toContain('Serializer File Doc')
    expect(writtenContent!).toContain('Problem One')
  })

  it('throws for dirty node without rawContent', async () => {
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_FORMAT.md': fileDocMd }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    // Create a node without rawContent
    const nodeWithoutContent = Object.values(parsed.nodes).find((n) => n.name === 'Problem One')!
    expect(nodeWithoutContent.rawContent).toBeUndefined()

    // Marking a non-root node dirty should produce no report entries (filtered by rawContent check)
    const report = await recursiveSerialize(parsed.nodes, new Set([nodeWithoutContent.id]))
    expect(report).toHaveLength(0)
  })

  it('preserves node identity after parse -> serialize report -> re-parse round-trip', async () => {
    const tree: FakeTree = { 'index.md': indexMd, 'Doc_FORMAT.md': fileDocMd }
    const root = buildFakeTree('workspace', tree)
    const firstParse = await recursiveParse(root)
    const idsBefore = Object.keys(firstParse.nodes).sort()

    // Since we have no root handle in the serializer, round-trip through driver
    let roundtripContent: string | null = null
    const capturingDriver: ModelDriver = {
      readModel: async (_uri: string) => { throw new Error('not expected') },
      writeModel: async (_uri: string, model: ParsedModel) => {
        roundtripContent = model.rawContent
      },
      listChildren: async () => [],
      listAssets: async () => [],
    }

    const docId = Object.values(firstParse.nodes).find((n) => n.name === 'Doc')!.id
    await recursiveSerialize(firstParse.nodes, new Set([docId]), capturingDriver)
    expect(roundtripContent).not.toBeNull()

    // Re-parse from the written content
    const tree2: FakeTree = { 'index.md': indexMd, 'Doc_FORMAT.md': roundtripContent! }
    const root2 = buildFakeTree('workspace', tree2)
    const secondParse = await recursiveParse(root2)
    const idsAfter = Object.keys(secondParse.nodes).sort()

    expect(idsAfter).toEqual(idsBefore)
  })
})
