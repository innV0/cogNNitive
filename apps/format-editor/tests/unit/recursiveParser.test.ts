import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

const validModelMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Valid Model"
---

# _F Business summary

A valid single-file model.
`

const validIndexMd = `---
specification_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# _F index

* [[modelA_FORMAT.md]]
`

describe('recursiveParser: index.md-driven parser', () => {
  it('parses a workspace with index.md and model file into the graph', async () => {
    const tree: FakeTree = {
      'index.md': validIndexMd,
      'modelA_FORMAT.md': validModelMd,
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    expect(result.issues).toHaveLength(0)
    const names = Object.values(result.nodes).map((n) => n.name)
    expect(names).toContain('modelA')
  })

  it('reports an issue when index.md is missing', async () => {
    const tree: FakeTree = {
      'modelA_FORMAT.md': validModelMd,
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].message).toContain('Missing index.md')
    expect(result.rootIds).toHaveLength(0)
  })

  it('reports a warning when a wikilink target does not exist', async () => {
    const indexMd = `---
specification_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# _F index

* [[exists_FORMAT.md]]
* [[missing_FORMAT.md]]
`

    const tree: FakeTree = {
      'index.md': indexMd,
      'exists_FORMAT.md': validModelMd,
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    expect(result.rootIds).toHaveLength(1)
    expect(result.nodes[result.rootIds[0]].name).toBe('exists')

    const missingIssues = result.issues.filter(i => i.message.includes('not found'))
    expect(missingIssues.length).toBeGreaterThan(0)
  })

  it('reports a collision issue when two models share same element name', async () => {
    const modelWithElement = (title: string, elementName: string) => `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "${title}"
---

# _F index

* [[${elementName}]]

# _F Components

* _F Components: ${elementName}
  Description of ${elementName}.
`

    const indexMd = `---
specification_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# _F index

* [[modelA_FORMAT.md]]
* [[modelB_FORMAT.md]]
`

    const tree: FakeTree = {
      'index.md': indexMd,
      'modelA_FORMAT.md': modelWithElement('Model A', 'Database'),
      'modelB_FORMAT.md': modelWithElement('Model B', 'Database'),
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    const collisionIssues = result.issues.filter((i) => i.message.includes('appears in both'))
    expect(collisionIssues.length).toBeGreaterThan(0)
  })

  it('parses model elements into the normalized graph', async () => {
    const modelWithElements = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Full Model"
---

# _F index

* [[Problems]]
* [[Value propositions]]

# _F Problems

* _F Problems: Alpha
  Description of Alpha.
* _F Problems: Beta
  Description of Beta.

# _F Value propositions

* _F Value propositions: Gamma
  Description of Gamma.
`

    const tree: FakeTree = {
      'index.md': validIndexMd,
      'modelA_FORMAT.md': modelWithElements,
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    expect(result.issues).toHaveLength(0)

    const names = Object.values(result.nodes).map((n) => n.name)
    expect(names).toContain('Alpha')
    expect(names).toContain('Beta')
    expect(names).toContain('Gamma')
  })
})
