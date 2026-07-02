import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { recursiveParse } from '../../src/model/recursiveParser'
import { recursiveSerialize } from '../../src/model/recursiveSerializer'
import { buildFakeTree } from '../helpers/fakeFs'
import type { ParsedModel, ModelDriver } from '@innv0/format-core'
import type { ModelNode } from '../../src/model/types'

// Frozen fixtures (see recursiveParser.models.golden.test.ts).
const modelsDir = join(import.meta.dirname!, '..', 'fixtures', 'models')
const fixtureFiles = readdirSync(modelsDir).filter((f) => f.endsWith('.md'))

function makeIndex(wikilinks: string[]): string {
  const items = wikilinks.map(w => `* [[${w}]]`).join('\n')
  return `---\nspecification_version: "V_0-1-2"\nlevel: 0\ntitle: "Workspace Index"\n---\n\n# _F index\n\n${items}\n`
}

/** Structural summary used to compare two parses without noise from
 *  volatile fields (provenance timestamps, etc). */
function structureOf(nodes: Record<string, ModelNode>, rootIds: string[]) {
  const nodeSummaries = Object.values(nodes)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => ({
      id: n.id,
      name: n.name,
      parentId: n.parentId,
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

describe('recursiveSerializer golden round-trip: frozen models/* fixtures', () => {
  for (const fileName of fixtureFiles) {
    it(`parse -> serialize -> re-parse is structurally equivalent for ${fileName}`, async () => {
      const content = readFileSync(join(modelsDir, fileName), 'utf-8')
      const tree = { 'index.md': makeIndex([fileName]), [fileName]: content }
      const root = buildFakeTree('models', tree)

      const firstParse = await recursiveParse(root)
      // Some real fixtures legitimately reuse an element name across
      // different concept sections — this is a real sibling-name collision
      // under R11's identity scheme, and is reported as an issue.
      const collisionIssues = firstParse.issues.filter((i) => i.message.includes('Duplicate sibling name'))
      expect(firstParse.issues.length).toBe(collisionIssues.length)

      // Use a capturing driver for round-trip
      let capturedContent: string | null = null
      const capturingDriver: ModelDriver = {
        readModel: async () => { throw new Error('not expected') },
        writeModel: async (_uri: string, model: ParsedModel) => {
          capturedContent = model.rawContent
        },
        listChildren: async () => [],
        listAssets: async () => [],
      }

      const rootIds = Object.values(firstParse.nodes)
        .filter((n) => n.rawContent !== undefined)
        .map((n) => n.id)

      await recursiveSerialize(firstParse.nodes, new Set(rootIds), capturingDriver)
      expect(capturedContent).not.toBeNull()

      // Re-parse the captured content
      const rewrittenTree = { 'index.md': makeIndex([fileName]), [fileName]: capturedContent! }
      const rewrittenRoot = buildFakeTree('models', rewrittenTree)
      const secondParse = await recursiveParse(rewrittenRoot)
      const secondCollisionIssues = secondParse.issues.filter((i) => i.message.includes('Duplicate sibling name'))
      expect(secondParse.issues.length).toBe(secondCollisionIssues.length)

      expect(structureOf(secondParse.nodes, secondParse.rootIds)).toEqual(
        structureOf(firstParse.nodes, firstParse.rootIds),
      )
    })
  }
})
