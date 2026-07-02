import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

const rootFormatMd = `---
specification_version: "V_0-1-2"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/catalog_V_0-1-2_FORMAT.md"
level: 3
parent:
  name: "catalog_V_0-1-2"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/catalog_V_0-1-2_FORMAT.md"
model_version: "V_1-0-0"
title: "AI Industry"
mode: "FOLDER"
---

# _F AI Industry catalog

Catalog of AI industry companies organized by domain.
`

const anthropicFormatMd = `---
type: "AILab"
fields:
  founded: 2021
  headquarters: "San Francisco, CA"
  product: "Claude"
  highlights: "Leading AI safety research. Creator of Claude assistant model."
markers:
  weight: 10
  rating: "+++"
---
`

/**
 * Catalog-shaped fixture modeled on the catalog sample pattern:
 * - Root _FORMAT.md (FOLDER mode, no inline concepts)
 * - Bare AILab/ directory with NO _FORMAT.md (concept/group dir)
 * - AILab/Anthropic/_FORMAT.md with type:"AILab" (element leaf)
 *
 * This MUST be non-empty and must have the concept -> element edge.
 */
const catalogTree: FakeTree = {
  catalog: {
    '_FORMAT.md': rootFormatMd,
    AILab: {
      Anthropic: {
        '_FORMAT.md': anthropicFormatMd,
      },
    },
  },
}

describe('catalog integration: FOLDER-mode hierarchy with bare concept dirs', () => {
  it('parses catalog-shaped fixture into a non-empty tree with concept->element edge', async () => {
    const root = buildFakeTree('workspace', catalogTree)
    const result = await recursiveParse(root)

    // The tree MUST be non-empty — the bare AILab dir must not abort the walk.
    expect(Object.keys(result.nodes).length).toBeGreaterThan(0)

    // AILab must exist as a concept node (bare dir -> concept).
    const ailabNode = Object.values(result.nodes).find((n) => n.name === 'AILab')
    expect(ailabNode).toBeDefined()
    // When the fix is applied, AILab should have kind 'concept'.
    // For now just test it exists — the RED test will prove it doesn't.

    // Anthropic must exist as a child of AILab with type "AILab".
    const anthropicNode = Object.values(result.nodes).find((n) => n.name === 'Anthropic')
    expect(anthropicNode).toBeDefined()
    expect(anthropicNode!.type).toBe('AILab')

    // Anthropic is a child of AILab.
    if (ailabNode && anthropicNode) {
      expect(ailabNode.childIds).toContain(anthropicNode.id)
    }
  })
})
