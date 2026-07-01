import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { recursiveParse } from '../../src/model/recursiveParser'
import { recursiveSerialize } from '../../src/model/recursiveSerializer'
import { buildFakeTree, readFakeTree } from '../helpers/fakeFs'
import type { FakeTree } from '../helpers/fakeFs'
import type { ModelNode } from '../../src/model/types'

// Frozen fixtures (see recursiveParser.models.golden.test.ts) — decoupled
// from the mutable models/ dir so edits there never break this suite.
const modelsDir = join(import.meta.dirname!, '..', 'fixtures', 'models')
const fixtureFiles = readdirSync(modelsDir).filter((f) => f.endsWith('.md'))

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

describe('recursiveSerializer golden round-trip: frozen models/* FILE fixtures', () => {
  for (const fileName of fixtureFiles) {
    it(`parse -> serialize -> re-parse is structurally equivalent for ${fileName}`, async () => {
      const content = readFileSync(join(modelsDir, fileName), 'utf-8')
      const tree: FakeTree = { [fileName]: content }
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

      const rewrittenContent = readFakeTree(tree, fileName)
      expect(rewrittenContent).toBeDefined()

      const rewrittenTree: FakeTree = { [fileName]: rewrittenContent! }
      const rewrittenRoot = buildFakeTree('models', rewrittenTree)
      const secondParse = await recursiveParse(rewrittenRoot)
      expect(secondParse.issues).toHaveLength(0)

      expect(structureOf(secondParse.nodes, secondParse.rootIds)).toEqual(
        structureOf(firstParse.nodes, firstParse.rootIds),
      )
    })
  }
})
