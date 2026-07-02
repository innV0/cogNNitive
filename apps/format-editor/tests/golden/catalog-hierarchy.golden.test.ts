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

describe('catalog-hierarchy: golden assertions on concept->element tree', () => {
  it('produces a structural tree with AILab concept and Anthropic element child', async () => {
    const root = buildFakeTree('workspace', catalogTree)
    const result = await recursiveParse(root)

    // Catalog root is the only top-level node.
    expect(result.rootIds).toHaveLength(1)
    const catalogId = result.rootIds[0]!
    expect(catalogId).toBe('catalog')

    const catalogNode = result.nodes[catalogId]
    expect(catalogNode).toBeDefined()
    expect(catalogNode!.name).toBe('catalog')
    expect(catalogNode!.kind).toBe('root')
    expect(catalogNode!.storageMode).toBe('FOLDER')
    expect(catalogNode!.rawContent).toBeDefined()
    expect(catalogNode!.localMetamodel).toBeDefined()

    // AILab is a concept node (bare dir -> kind:'concept').
    const ailabNode = Object.values(result.nodes).find((n) => n.name === 'AILab')
    expect(ailabNode).toBeDefined()
    expect(ailabNode!.kind).toBe('concept')
    expect(ailabNode!.type).toBe('concept')
    expect(ailabNode!.storageMode).toBe('FOLDER')
    expect(ailabNode!.rawContent).toBeUndefined()
    expect(ailabNode!.localMetamodel).toBeUndefined()
    expect(ailabNode!.parentId).toBe(catalogId)
    expect(Object.keys(ailabNode!.fields)).toHaveLength(0)

    // AILab should have a conceptBinding (structural, since catalog has no inline concepts).
    expect(ailabNode!.conceptBinding).toBeDefined()
    expect(ailabNode!.conceptBinding!.name).toBe('AILab')
    expect(ailabNode!.conceptBinding!.source).toBe('structural')

    // Anthropic is an element child of AILab with type:"AILab".
    const anthropicNode = Object.values(result.nodes).find((n) => n.name === 'Anthropic')
    expect(anthropicNode).toBeDefined()
    expect(anthropicNode!.kind).toBe('element')
    expect(anthropicNode!.type).toBe('AILab')
    expect(anthropicNode!.storageMode).toBe('FOLDER')
    expect(anthropicNode!.parentId).toBe(ailabNode!.id)
    expect(anthropicNode!.rawContent).toBeDefined()

    // Anthropic carries rawContent from its _FORMAT.md.
    expect(anthropicNode!.rawContent).toContain('founded: 2021')

    // Child relationship: AILab has Anthropic as child, catalog has AILab as child.
    expect(ailabNode!.childIds).toContain(anthropicNode!.id)
    expect(catalogNode!.childIds).toContain(ailabNode!.id)
  })
})
