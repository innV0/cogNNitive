import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { recursiveSerialize } from '../../src/model/recursiveSerializer'
import { buildFakeTree, readFakeTree, type FakeTree } from '../helpers/fakeFs'

const fileDocMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Serializer File Doc"
mode: "FILE"
---

# _F Problems

* _F Problems: Problem One
  A problem used to exercise the serializer.
`

const folderRootMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Serializer Folder Root"
mode: "FOLDER"
---

# _F Business summary

Folder root used to exercise the serializer's write-back path.
`

describe('recursiveSerializer', () => {
  it('writes a dirty FILE node back through serializeModel (write primitive matches storageMode)', async () => {
    const tree: FakeTree = { 'Doc_FORMAT.md': fileDocMd }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    const docId = Object.values(parsed.nodes).find((n) => n.storageMode === 'FILE')!.id
    const dirty = new Set([docId])

    await recursiveSerialize(root, parsed.nodes, parsed.rootIds, dirty)

    const written = readFakeTree(tree, 'Doc_FORMAT.md')
    expect(written).toBeDefined()
    expect(written).toContain('title: "Serializer File Doc"')
    expect(written).toContain('Problem One')
  })

  it('writes a dirty FOLDER node back to its own _FORMAT.md (write primitive matches storageMode)', async () => {
    const tree: FakeTree = {
      RootFolder: {
        '_FORMAT.md': folderRootMd,
      },
    }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    const folderId = Object.values(parsed.nodes).find((n) => n.storageMode === 'FOLDER')!.id
    const dirty = new Set([folderId])

    await recursiveSerialize(root, parsed.nodes, parsed.rootIds, dirty)

    const written = readFakeTree(tree, 'RootFolder/_FORMAT.md')
    expect(written).toBeDefined()
    expect(written).toContain('title: "Serializer Folder Root"')
  })

  it('preserves node identity (qualifiedId) after a no-edit parse -> serialize -> re-parse round-trip (R12)', async () => {
    const tree: FakeTree = {
      RootFolder: {
        '_FORMAT.md': folderRootMd,
        'Doc_FORMAT.md': fileDocMd,
      },
    }
    const root = buildFakeTree('workspace', tree)
    const firstParse = await recursiveParse(root)
    const idsBefore = Object.keys(firstParse.nodes).sort()

    const dirtyIds = new Set(
      Object.values(firstParse.nodes)
        .filter((n) => n.rawContent !== undefined)
        .map((n) => n.id),
    )
    await recursiveSerialize(root, firstParse.nodes, firstParse.rootIds, dirtyIds)

    const secondParse = await recursiveParse(root)
    const idsAfter = Object.keys(secondParse.nodes).sort()

    expect(idsAfter).toEqual(idsBefore)
  })

  it('only writes dirty nodes by default (dirty-only write-back)', async () => {
    const tree: FakeTree = {
      'Doc_FORMAT.md': fileDocMd,
      RootFolder: { '_FORMAT.md': folderRootMd },
    }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    // No dirty ids: nothing should be rewritten.
    await recursiveSerialize(root, parsed.nodes, parsed.rootIds, new Set())

    // Content should still match verbatim (no write occurred, or if it did,
    // it is byte-identical to source).
    expect(readFakeTree(tree, 'Doc_FORMAT.md')).toBe(fileDocMd)
    expect(readFakeTree(tree, 'RootFolder/_FORMAT.md')).toBe(folderRootMd)
  })

  it('keeps a FOLDER node written as FOLDER after save even when a field on that node is dirty (R8 "Mode preserved despite edits")', async () => {
    const tree: FakeTree = { RootFolder: { '_FORMAT.md': folderRootMd } }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)

    const folderNode = Object.values(parsed.nodes).find((n) => n.storageMode === 'FOLDER')!
    // Simulate a field edit on the node object itself (no storageMode change).
    folderNode.fields['summary'] = {
      value: 'edited summary',
      provenance: { author: { kind: 'user', id: 'tester' }, timestamp: new Date().toISOString() },
    }

    await recursiveSerialize(root, parsed.nodes, parsed.rootIds, new Set([folderNode.id]))

    const reparsed = await recursiveParse(root)
    const reparsedFolder = Object.values(reparsed.nodes).find((n) => n.id === folderNode.id)!
    expect(reparsedFolder.storageMode).toBe('FOLDER')
  })

  it('exposes no conversion path: recursiveSerialize never reassigns storageMode on a node object', async () => {
    const tree: FakeTree = { RootFolder: { '_FORMAT.md': folderRootMd } }
    const root = buildFakeTree('workspace', tree)
    const parsed = await recursiveParse(root)
    const folderNode = Object.values(parsed.nodes).find((n) => n.storageMode === 'FOLDER')!
    const modeBefore = folderNode.storageMode

    await recursiveSerialize(root, parsed.nodes, parsed.rootIds, new Set([folderNode.id]))

    expect(folderNode.storageMode).toBe(modeBefore)
  })
})
