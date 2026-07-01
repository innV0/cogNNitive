import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { recursiveParse } from '../../src/model/recursiveParser'
import { buildFakeTree } from '../helpers/fakeFs'

// Frozen snapshot of the top-level `models/*` FILE fixtures, sourced from
// committed HEAD. Kept separate from the mutable `models/` dir so in-flight
// edits there never break this suite (see openspec/changes/deep-integration).
const modelsDir = join(import.meta.dirname!, '..', 'fixtures', 'models')
const fixtureFiles = readdirSync(modelsDir).filter((f) => f.endsWith('.md'))

describe('recursiveParser golden: frozen models/* FILE fixtures', () => {
  for (const fileName of fixtureFiles) {
    it(`parses ${fileName} into a normalized graph snapshot`, async () => {
      const content = readFileSync(join(modelsDir, fileName), 'utf-8')
      const root = buildFakeTree('models', { [fileName]: content })

      const result = await recursiveParse(root)

      const snapshot = summarize(result)
      expect(snapshot).toMatchSnapshot()
    })
  }
})

function summarize(result: Awaited<ReturnType<typeof recursiveParse>>) {
  const nodeSummaries = Object.values(result.nodes)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => ({
      id: n.id,
      name: n.name,
      parentId: n.parentId,
      storageMode: n.storageMode,
      type: n.type,
      fieldKeys: Object.keys(n.fields).sort(),
      markerKeys: Object.keys(n.markers).sort(),
      childCount: n.childIds.length,
    }))
  return {
    rootIds: [...result.rootIds].sort(),
    nodeCount: Object.keys(result.nodes).length,
    issueCount: result.issues.length,
    nodes: nodeSummaries,
  }
}
