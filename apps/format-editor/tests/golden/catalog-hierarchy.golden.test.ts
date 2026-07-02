import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

/**
 * Single-file catalog model: hierarchy is defined via taxonomy in the index block,
 * and elements carry their fields/markers inline.
 */
const catalogModelMd = `---
specification_version: "V_0-1-2"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/catalog_V_0-1-2_FORMAT.md"
level: 3
parent:
  name: "catalog_V_0-1-2"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/catalog_V_0-1-2_FORMAT.md"
model_version: "V_1-0-0"
title: "AI Industry Catalog"
---

# _F index

* [[AILab]]
  * [[Anthropic]]
  * [[OpenAI]]
* [[AITool]]
  * [[Claude]]
  * [[GPT-4]]

# _F AILab

* _F AILab: Anthropic
  \`\`\`yaml
  founded: 2021
  headquarters: "San Francisco, CA"
  product: "Claude"
  \`\`\`
  Leading AI safety research. Creator of Claude.
* _F AILab: OpenAI
  \`\`\`yaml
  founded: 2015
  headquarters: "San Francisco, CA"
  product: "GPT-4"
  \`\`\`
  Creator of GPT-4 and DALL-E.

# _F AITool

* _F AITool: Claude
  Flagship AI assistant from Anthropic.
* _F AITool: GPT-4
  Flagship LLM from OpenAI.
`

const indexMd = `---
specification_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# _F index

* [[catalog_FORMAT.md]]
`

const catalogTree: FakeTree = {
  'index.md': indexMd,
  'catalog_FORMAT.md': catalogModelMd,
}

describe('catalog-hierarchy: golden assertions on concept->element tree', () => {
  it('produces a structural tree with concepts and element children', async () => {
    const root = buildFakeTree('workspace', catalogTree)
    const result = await recursiveParse(root)

    expect(result.issues).toHaveLength(0)

    // Catalog root is the only top-level node.
    expect(result.rootIds).toHaveLength(1)
    const catalogId = result.rootIds[0]!
    expect(catalogId).toBe('catalog')

    const catalogNode = result.nodes[catalogId]
    expect(catalogNode).toBeDefined()
    expect(catalogNode!.name).toBe('catalog')
    expect(catalogNode!.kind).toBe('root')
    expect(catalogNode!.rawContent).toBeDefined()
    expect(catalogNode!.localMetamodel).toBeDefined()

    // Anthropic is an element with type "AILab"
    const anthropicNode = Object.values(result.nodes).find((n) => n.name === 'Anthropic')
    expect(anthropicNode).toBeDefined()
    expect(anthropicNode!.kind).toBe('element')
    expect(anthropicNode!.type).toBe('AILab')

    // Anthropic carries fields from inline YAML
    expect(anthropicNode!.fields['founded']).toBeDefined()
    expect(anthropicNode!.fields['founded'].value).toBe(2021)

    // OpenAI is another element
    const openaiNode = Object.values(result.nodes).find((n) => n.name === 'OpenAI')
    expect(openaiNode).toBeDefined()
    expect(openaiNode!.kind).toBe('element')
    expect(openaiNode!.type).toBe('AILab')
  })
})
