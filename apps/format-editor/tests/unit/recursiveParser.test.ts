import { describe, it, expect } from 'vitest'
import { recursiveParse } from '../../src/model/recursiveParser'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

const validFormatMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Valid Folder"
mode: "FOLDER"
---

# _F Business summary

A valid sibling folder used to confirm isolated read failures don't abort the whole walk.
`

const childFormatMd = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Child"
mode: "FOLDER"
---

# _F Child element

A child element inside a bare concept directory.
`

describe('recursiveParser: recursive read across mixed tree', () => {
  it('places all nodes (root + descendants, regardless of mode) in the same graph', async () => {
    const explicitTree: FakeTree = {
      Root: {
        '_FORMAT.md': validFormatMd,
        'Sibling_FORMAT.md': validFormatMd,
        Nested: {
          '_FORMAT.md': validFormatMd,
        },
      },
    }

    const root = buildFakeTree('workspace', explicitTree)
    const result = await recursiveParse(root)

    expect(result.issues).toHaveLength(0)
    const names = Object.values(result.nodes).map((n) => n.name)
    expect(names).toContain('Root')
    expect(names).toContain('Sibling')
    expect(names).toContain('Nested')
  })

  it('bare directory without _FORMAT.md becomes a concept node and still recurses into children', async () => {
    const tree: FakeTree = {
      Root: {
        '_FORMAT.md': validFormatMd,
        Group: {
          // Bare concept directory with no _FORMAT.md — now a valid concept node.
          Child: {
            '_FORMAT.md': childFormatMd,
          },
        },
        Healthy: {
          '_FORMAT.md': validFormatMd,
        },
      },
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    // No issue should be recorded for the bare directory (it's a valid concept node).
    const groupIssues = result.issues.filter((i) => i.path.includes('Group'))
    expect(groupIssues).toHaveLength(0)

    const names = Object.values(result.nodes).map((n) => n.name)
    expect(names).toContain('Root')
    expect(names).toContain('Group')
    expect(names).toContain('Healthy')

    // The bare directory's children MUST still be recursed (unconditional recursion).
    expect(names).toContain('Child')

    // Group should have kind 'concept'.
    const groupNode = Object.values(result.nodes).find((n) => n.name === 'Group')
    expect(groupNode).toBeDefined()
    expect(groupNode!.kind).toBe('concept')

    // Child should be nested under Group.
    const childNode = Object.values(result.nodes).find((n) => n.name === 'Child')
    expect(childNode).toBeDefined()
    expect(childNode!.parentId).toBe(groupNode!.id)
  })

  it('present-but-unparseable _FORMAT.md records an issue AND still recurses into children', async () => {
    // Non-YAML garbage triggers a parseModel error → issue recorded.
    const malformedMd = `this is not frontmatter and not valid in any way`

    const tree: FakeTree = {
      Root: {
        '_FORMAT.md': validFormatMd,
        BrokenParse: {
          '_FORMAT.md': malformedMd,
          Nested: {
            '_FORMAT.md': childFormatMd,
          },
        },
        Healthy: {
          '_FORMAT.md': validFormatMd,
        },
      },
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    // Issue MUST be recorded for the unparseable _FORMAT.md.
    expect(result.issues.length).toBeGreaterThan(0)
    const unparseableIssues = result.issues.filter((i) => i.path.includes('BrokenParse'))
    expect(unparseableIssues.length).toBeGreaterThan(0)

    // The unparseable node must still exist as a structural concept placeholder.
    const names = Object.values(result.nodes).map((n) => n.name)
    expect(names).toContain('BrokenParse')
    expect(names).toContain('Root')
    expect(names).toContain('Healthy')

    // Nested child MUST still be recursed (subtree not dropped).
    expect(names).toContain('Nested')

    const nestedNode = Object.values(result.nodes).find((n) => n.name === 'Nested')
    const brokenNode = Object.values(result.nodes).find((n) => n.name === 'BrokenParse')
    expect(nestedNode).toBeDefined()
    expect(brokenNode).toBeDefined()
    expect(nestedNode!.parentId).toBe(brokenNode!.id)
  })

  it('reports a collision issue AND keeps both nodes when two nested elements share a name (R11)', async () => {
    const formatWithDuplicateElements = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Dup Elements"
mode: "FOLDER"
---

# _F Problems

* _F Problems: Alpha
  Description of the first Alpha problem.

* _F Problems: Alpha
  Description of the second Alpha problem (duplicate sibling name).
`

    const tree: FakeTree = {
      Root: {
        '_FORMAT.md': formatWithDuplicateElements,
      },
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    const collisionIssues = result.issues.filter((i) => i.message.includes('Duplicate sibling name'))
    expect(collisionIssues.length).toBeGreaterThan(0)
    expect(collisionIssues[0]!.message).toContain('Alpha')

    // Both colliding nodes must survive in the graph (no silent overwrite).
    const alphaNodes = Object.values(result.nodes).filter((n) => n.name === 'Alpha')
    expect(alphaNodes).toHaveLength(2)
    // Their ids (graph keys) must be distinct so both are retrievable.
    expect(alphaNodes[0]!.id).not.toBe(alphaNodes[1]!.id)
  })

  it('union of in-file and directory children: same-name clash uses IdentityRegistry collision + #n', async () => {
    const rootWithElement = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Union Root"
mode: "FOLDER"
---

# _F Components

* _F Components: Button
  A reusable button component.
`

    const tree: FakeTree = {
      Root: {
        '_FORMAT.md': rootWithElement,
        // Directory child with the same name as the in-file element — IdentityRegistry collision.
        Button: {
          '_FORMAT.md': `---
type: "Component"
fields:
  version: 1
---
`,
        },
      },
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    // Both Button nodes must survive — one from in-file element, one from directory.
    const buttonNodes = Object.values(result.nodes).filter((n) => n.name === 'Button')
    expect(buttonNodes).toHaveLength(2)

    // Their ids must be distinct (collision leads to #n disambiguation).
    expect(buttonNodes[0]!.id).not.toBe(buttonNodes[1]!.id)

    // A collision issue must be recorded.
    const collisionIssues = result.issues.filter((i) => i.message.includes('Duplicate sibling name'))
    expect(collisionIssues.length).toBeGreaterThan(0)
  })

  it('concept binding: declared concepts in root give source:metamodel', async () => {
    const rootWithConcepts = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Concepts Root"
mode: "FOLDER"
concepts:
  - name: "AILab"
    type: "organization"
---

# _F AI

Overview section.
`

    const tree: FakeTree = {
      Root: {
        '_FORMAT.md': rootWithConcepts,
        AILab: {
          Anthropic: {
            '_FORMAT.md': `---
type: "AILab"
---
`,
          },
        },
      },
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    // AILab is a concept node whose name matches a declared concept in the root.
    const ailabNode = Object.values(result.nodes).find((n) => n.name === 'AILab')
    expect(ailabNode).toBeDefined()
    expect(ailabNode!.conceptBinding).toBeDefined()
    expect(ailabNode!.conceptBinding!.name).toBe('AILab')
    expect(ailabNode!.conceptBinding!.source).toBe('metamodel')
    // Type should be overwritten to the resolved concept name.
    expect(ailabNode!.type).toBe('AILab')
  })

  it('concept binding: no declared concepts gives source:structural and node still present', async () => {
    const rootWithoutConcepts = `---
specification_version: "V_0-1-1"
specification_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "No Concepts Root"
mode: "FOLDER"
---

# _F Overview

Root with no declared concepts.
`

    const tree: FakeTree = {
      Root: {
        '_FORMAT.md': rootWithoutConcepts,
        AILab: {
          Anthropic: {
            '_FORMAT.md': `---
type: "AILab"
---
`,
          },
        },
      },
    }

    const root = buildFakeTree('workspace', tree)
    const result = await recursiveParse(root)

    // AILab must still exist as a structural concept node.
    const ailabNode = Object.values(result.nodes).find((n) => n.name === 'AILab')
    expect(ailabNode).toBeDefined()
    expect(ailabNode!.kind).toBe('concept')

    // conceptBinding must exist with source:structural.
    expect(ailabNode!.conceptBinding).toBeDefined()
    expect(ailabNode!.conceptBinding!.name).toBe('AILab')
    expect(ailabNode!.conceptBinding!.source).toBe('structural')

    // Its children must still be present (subtree not dropped).
    const anthropicNode = Object.values(result.nodes).find((n) => n.name === 'Anthropic')
    expect(anthropicNode).toBeDefined()
    expect(anthropicNode!.parentId).toBe(ailabNode!.id)
  })
})
