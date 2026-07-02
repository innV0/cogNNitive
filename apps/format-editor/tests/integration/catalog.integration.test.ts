import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

/**
 * Single-file catalog model with taxonomy hierarchy:
 * - Root model with _F index defining concept->element hierarchy
 * - Elements carry fields and markers inline
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

# _F AILab

* _F AILab: Anthropic
  \`\`\`yaml
  founded: 2021
  headquarters: "San Francisco, CA"
  product: "Claude"
  \`\`\`
  Leading AI safety research. Creator of Claude assistant model.
* _F AILab: OpenAI
  \`\`\`yaml
  founded: 2015
  headquarters: "San Francisco, CA"
  product: "GPT-4"
  \`\`\`
  Creator of GPT-4 and DALL-E.
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

describe('catalog integration: single-file catalog with taxonomy hierarchy', () => {
  it('parses catalog-shaped fixture into a non-empty tree with concept->element edge', async () => {
    const root = buildFakeTree('workspace', catalogTree)
    const result = await recursiveParse(root)

    expect(result.issues).toHaveLength(0)

    // The tree MUST be non-empty.
    expect(Object.keys(result.nodes).length).toBeGreaterThan(0)

    // Root must exist as a root node.
    const catalogNode = Object.values(result.nodes).find((n) => n.kind === 'root')
    expect(catalogNode).toBeDefined()
    expect(catalogNode!.name).toBe('catalog')

    // Anthropic must exist as an element with type "AILab".
    const anthropicNode = Object.values(result.nodes).find((n) => n.name === 'Anthropic')
    expect(anthropicNode).toBeDefined()
    expect(anthropicNode!.type).toBe('AILab')

    // OpenAI must exist as another AILab element.
    const openaiNode = Object.values(result.nodes).find((n) => n.name === 'OpenAI')
    expect(openaiNode).toBeDefined()
    expect(openaiNode!.type).toBe('AILab')
  })
})
