import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModelStore } from '../../src/stores/modelStore'
import { useMetamodelStore } from '../../src/stores/metamodelStore'
import type { ModelNode } from '../../src/model/types'

function makeNode(id: string, overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    type: 'text',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: id },
    ...overrides,
  }
}

const TAXONOMY_FM = `---
spec_version: "V_0-1-5"
title: Test Model
taxonomy:
  - parent: Industry
    child: AILab
  - parent: AILab
    child: Anthropic
  - parent: AILab
    child: OpenAI
---`

describe('metamodelStore: taxonomy perspectives (Phase H)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /* ── taxonomyEdges ────────────────────────────────────────────── */

  describe('taxonomyEdges', () => {
    it('parses taxonomy from root node frontmatter into PerspectiveEdge[]', () => {
      const modelStore = useModelStore()
      modelStore.setGraph({ Root: makeNode('Root', { rawContent: TAXONOMY_FM }) }, ['Root'])

      const store = useMetamodelStore()

      expect(store.taxonomyEdges).toEqual([
        { parent: 'Industry', child: 'AILab' },
        { parent: 'AILab', child: 'Anthropic' },
        { parent: 'AILab', child: 'OpenAI' },
      ])
    })

    it('returns empty array when taxonomy field is absent from frontmatter', () => {
      const modelStore = useModelStore()
      modelStore.setGraph(
        { Root: makeNode('Root', { rawContent: `---\nspec_version: "V_0-1-5"\n---` }) },
        ['Root'],
      )

      const store = useMetamodelStore()
      expect(store.taxonomyEdges).toEqual([])
    })

    it('returns empty array when no root node exists', () => {
      const store = useMetamodelStore()
      expect(store.taxonomyEdges).toEqual([])
    })

    it('returns empty array when root node has no rawContent', () => {
      const modelStore = useModelStore()
      modelStore.setGraph({ Root: makeNode('Root') }, ['Root'])

      const store = useMetamodelStore()
      expect(store.taxonomyEdges).toEqual([])
    })

    it('filters out malformed taxonomy entries', () => {
      const modelStore = useModelStore()
      modelStore.setGraph(
        {
          Root: makeNode('Root', {
            rawContent: `---
taxonomy:
  - parent: Good
    child: Valid
  - parent: Orphan
  - invalid: true
  - 42
---`,
          }),
        },
        ['Root'],
      )

      const store = useMetamodelStore()
      expect(store.taxonomyEdges).toEqual([{ parent: 'Good', child: 'Valid' }])
    })
  })

  /* ── conceptTree ───────────────────────────────────────────────── */

  describe('conceptTree', () => {
    it('builds hierarchical tree from three-level taxonomy', () => {
      const modelStore = useModelStore()
      modelStore.setGraph({ Root: makeNode('Root', { rawContent: TAXONOMY_FM }) }, ['Root'])

      const store = useMetamodelStore()

      expect(store.conceptTree).toEqual([
        {
          name: 'Industry',
          children: [
            {
              name: 'AILab',
              children: [
                { name: 'Anthropic', children: [] },
                { name: 'OpenAI', children: [] },
              ],
            },
          ],
        },
      ])
    })

    it('returns empty array when taxonomyEdges is empty', () => {
      const store = useMetamodelStore()
      expect(store.conceptTree).toEqual([])
    })

    it('handles a single parent→child edge', () => {
      const modelStore = useModelStore()
      modelStore.setGraph(
        {
          Root: makeNode('Root', {
            rawContent: `---\ntaxonomy:\n  - parent: Root\n    child: Leaf\n---`,
          }),
        },
        ['Root'],
      )

      const store = useMetamodelStore()

      expect(store.conceptTree).toEqual([
        { name: 'Root', children: [{ name: 'Leaf', children: [] }] },
      ])
    })

    it('produces multiple roots for disconnected edge sets', () => {
      const modelStore = useModelStore()
      modelStore.setGraph(
        {
          Root: makeNode('Root', {
            rawContent: `---\ntaxonomy:\n  - parent: CatA\n    child: A1\n  - parent: CatB\n    child: B1\n---`,
          }),
        },
        ['Root'],
      )

      const store = useMetamodelStore()

      expect(store.conceptTree).toHaveLength(2)
      expect(store.conceptTree[0].name).toBe('CatA')
      expect(store.conceptTree[1].name).toBe('CatB')
    })

    it('deduplicates children when the same edge appears twice', () => {
      const modelStore = useModelStore()
      modelStore.setGraph(
        {
          Root: makeNode('Root', {
            rawContent: `---\ntaxonomy:\n  - parent: A\n    child: B\n  - parent: A\n    child: B\n---`,
          }),
        },
        ['Root'],
      )

      const store = useMetamodelStore()

      expect(store.conceptTree).toEqual([{ name: 'A', children: [{ name: 'B', children: [] }] }])
    })
  })

  /* ── getNeighborhood ──────────────────────────────────────────── */

  describe('getNeighborhood', () => {
    function setupWithMetamodel() {
      const modelStore = useModelStore()
      modelStore.setGraph(
        {
          Root: makeNode('Root', {
            rawContent: TAXONOMY_FM,
            localMetamodel: {
              concepts: [
                { name: 'Industry', type: 'category', icon: 'building' },
                { name: 'AILab', type: 'category', icon: 'cpu' },
                { name: 'Anthropic', type: 'text', icon: 'users' },
                { name: 'OpenAI', type: 'text', icon: 'zap' },
              ],
              markers: [],
            },
          }),
        },
        ['Root'],
      )
      return useMetamodelStore()
    }

    it('returns correct parents, children, and perspective for "AILab"', () => {
      const store = setupWithMetamodel()
      const result = store.getNeighborhood('AILab')

      expect(result.parents).toEqual(['Industry'])
      expect(result.children).toEqual(['Anthropic', 'OpenAI'])
      expect(result.perspective.id).toBe('taxonomy-AILab')
      expect(result.perspective.name).toBe('AILab')
      expect(result.perspective.icon).toBe('cpu')
    })

    it('defaults icon to "layers" when concept is not in resolved metamodel', () => {
      const modelStore = useModelStore()
      modelStore.setGraph({ Root: makeNode('Root', { rawContent: TAXONOMY_FM }) }, ['Root'])

      const store = useMetamodelStore()
      const result = store.getNeighborhood('Unknown')

      expect(result.parents).toEqual([])
      expect(result.children).toEqual([])
      expect(result.perspective.icon).toBe('layers')
    })

    it('returns empty parents and children for a leaf concept', () => {
      const store = setupWithMetamodel()
      const result = store.getNeighborhood('Anthropic')

      expect(result.parents).toEqual(['AILab'])
      expect(result.children).toEqual([])
    })

    it('returns empty parents and children for a root concept', () => {
      const store = setupWithMetamodel()
      const result = store.getNeighborhood('Industry')

      expect(result.parents).toEqual([])
      expect(result.children).toEqual(['AILab'])
    })

    it('returns empty neighborhood when no taxonomy is defined', () => {
      const modelStore = useModelStore()
      modelStore.setGraph(
        {
          Root: makeNode('Root', {
            rawContent: `---\nspec_version: "V_0-1-5"\n---`,
          }),
        },
        ['Root'],
      )

      const store = useMetamodelStore()
      const result = store.getNeighborhood('AILab')

      expect(result.parents).toEqual([])
      expect(result.children).toEqual([])
      expect(result.perspective.id).toBe('taxonomy-AILab')
      expect(result.perspective.name).toBe('AILab')
    })

    it('perspective.edges contains all taxonomy edges', () => {
      const store = setupWithMetamodel()
      const result = store.getNeighborhood('AILab')

      expect(result.perspective.edges).toHaveLength(3)
      expect(result.perspective.edges).toContainEqual({ parent: 'Industry', child: 'AILab' })
      expect(result.perspective.edges).toContainEqual({ parent: 'AILab', child: 'Anthropic' })
    })
  })
})
