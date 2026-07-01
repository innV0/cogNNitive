import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { recursiveParse } from '../../src/model/recursiveParser'
import { recursiveSerialize } from '../../src/model/recursiveSerializer'
import { buildFakeTree, readFakeTree } from '../helpers/fakeFs'
import type { FakeTree } from '../helpers/fakeFs'
import type { ModelNode } from '../../src/model/types'

// The frozen fixtures under tests/fixtures/models/ are LF-only (git
// normalizes line endings on checkout), so the golden round-trip suite
// never exercises a CRLF source document. This suite takes an existing LF
// fixture and converts it to CRLF IN-MEMORY (never committing a CRLF file)
// to confirm the app's recursive parser + serializer handle CRLF input
// with the same fidelity as its LF twin.
const modelsDir = join(import.meta.dirname!, '..', 'fixtures', 'models')
const fixtureFile = 'mini-file_V_0-0-1_business_FORMAT.md'

/** Structural summary used to compare two parses without noise from
 *  volatile fields (provenance timestamps, etc). */
function structureOf(nodes: Record<string, ModelNode>, rootIds: string[]) {
  const nodeSummaries = Object.values(nodes)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => ({
      id: n.id,
      name: n.name,
      parentId: n.parentId,
      storageMode: n.storageMode,
      type: n.type,
      fieldKeys: Object.keys(n.fields).sort(),
      fieldValues: Object.fromEntries(
        Object.entries(n.fields)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, v.value]),
      ),
      markers: n.markers,
      childCount: n.childIds.length,
    }))
  return { rootIds: [...rootIds].sort(), nodeCount: Object.keys(nodes).length, nodes: nodeSummaries }
}

describe('recursiveParser/Serializer CRLF fidelity', () => {
  it('parses a CRLF twin of an LF fixture into the same structure as the LF original', async () => {
    const lfContent = readFileSync(join(modelsDir, fixtureFile), 'utf-8')
    expect(lfContent.includes('\r\n')).toBe(false)
    const crlfContent = lfContent.replace(/\n/g, '\r\n')
    expect(crlfContent.includes('\r\n')).toBe(true)

    const lfRoot = buildFakeTree('models', { [fixtureFile]: lfContent })
    const crlfRoot = buildFakeTree('models', { [fixtureFile]: crlfContent })

    const lfParse = await recursiveParse(lfRoot)
    const crlfParse = await recursiveParse(crlfRoot)

    expect(lfParse.issues).toHaveLength(0)
    expect(crlfParse.issues).toHaveLength(0)
    expect(structureOf(crlfParse.nodes, crlfParse.rootIds)).toEqual(structureOf(lfParse.nodes, lfParse.rootIds))
  })

  it('round-trips a CRLF source cleanly through parse -> serialize -> re-parse', async () => {
    const lfContent = readFileSync(join(modelsDir, fixtureFile), 'utf-8')
    const crlfContent = lfContent.replace(/\n/g, '\r\n')

    const tree: FakeTree = { [fixtureFile]: crlfContent }
    const root = buildFakeTree('models', tree)

    const firstParse = await recursiveParse(root)
    expect(firstParse.issues).toHaveLength(0)

    // Mark every FILE/FOLDER root node dirty to force a full write-back
    // even though there were no user edits (R7 "no edits" scenario).
    const dirtyIds = new Set(
      Object.values(firstParse.nodes)
        .filter((n) => n.rawContent !== undefined)
        .map((n) => n.id),
    )
    await recursiveSerialize(root, firstParse.nodes, firstParse.rootIds, dirtyIds)

    const rewrittenContent = readFakeTree(tree, fixtureFile)
    expect(rewrittenContent).toBeDefined()

    const rewrittenTree: FakeTree = { [fixtureFile]: rewrittenContent! }
    const rewrittenRoot = buildFakeTree('models', rewrittenTree)
    const secondParse = await recursiveParse(rewrittenRoot)
    expect(secondParse.issues).toHaveLength(0)

    expect(structureOf(secondParse.nodes, secondParse.rootIds)).toEqual(
      structureOf(firstParse.nodes, firstParse.rootIds),
    )
  })
})
