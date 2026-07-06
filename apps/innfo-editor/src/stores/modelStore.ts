import { defineStore } from 'pinia'
import type { ModelNode } from '../model/types'
import type { DirectoryHandleLike } from './workspaceStore'
import { recursiveParse } from '../model/recursiveParser'
import { validateFormatContent, parseFrontmatter } from '@innv0/innfo-core'
import type { ModelDriver, ParseIssue, ValidationReport, LocalMetamodel } from '@innv0/innfo-core'

export interface ModelState {
  nodes: Record<string, ModelNode>
  rootIds: string[]
  dirtyIds: Set<string>
  parseIssues: ParseIssue[]
  validationReport: ValidationReport | null
}

/**
 * modelStore is the single normalized element graph. It replaces the
 * previously planned documentStore + folderStore split: every node,
 * regardless of storageMode, lives in this one graph (R2, R3).
 */
export const useModelStore = defineStore('model', {
  state: (): ModelState => ({
    nodes: {},
    rootIds: [],
    dirtyIds: new Set<string>(),
    parseIssues: [],
    validationReport: null,
  }),
  getters: {
    getNode:
      (state) =>
      (id: string): ModelNode | undefined =>
        state.nodes[id],
    getChildren:
      (state) =>
      (id: string): ModelNode[] =>
        (state.nodes[id]?.childIds ?? []).map((cid) => state.nodes[cid]).filter(Boolean),
    getRoots: (state) => (): ModelNode[] =>
      state.rootIds.map((id) => state.nodes[id]).filter(Boolean),

    /**
     * Returns the first root node id as the default "active" node.
     * View-only selection (which node is highlighted/interacted with)
     * lives in uiStore.selectedNodeId — this getter provides a fallback
     * for components that need a stable node reference to derive data
     * (e.g., metamodel resolution).
     */
    activeNodeId: (state): string | null => {
      return state.rootIds[0] ?? null
    },
  },
  actions: {
    /** Replaces the whole graph (used by a fresh recursive parse). */
    setGraph(nodes: Record<string, ModelNode>, rootIds: string[]): void {
      this.nodes = nodes
      this.rootIds = rootIds
      this.dirtyIds = new Set<string>()
      this.validateModel()
    },

    validateModel(): void {
      const rootId = this.rootIds[0]
      if (rootId && this.nodes[rootId]) {
        const rootNode = this.nodes[rootId]
        const path = rootNode.source?.path ?? ''
        const fileName = path.split('/').pop() || path || 'unknown.md'
        if (rootNode.rawContent) {
          this.validationReport = validateFormatContent(rootNode.rawContent, fileName)
        } else {
          this.validationReport = null
        }
      } else {
        this.validationReport = null
      }
    },

    upsertNode(node: ModelNode): void {
      this.nodes[node.id] = node
    },

    markDirty(id: string): void {
      this.dirtyIds.add(id)
    },

    clearDirty(id: string): void {
      this.dirtyIds.delete(id)
    },

    clearParseIssues(): void {
      this.parseIssues = []
    },

    isDirty(id: string): boolean {
      return this.dirtyIds.has(id)
    },

    /**
     * Populates this store directly from a workspace handle via a
     * recursive parse — no intermediate per-mode store. Real recursive
     * walking/parsing lands in Phase 3 (recursiveParser.ts); this wires
     * the call so workspaceStore.open() has a single integration point.
     */
    async parseFromHandle(handle: DirectoryHandleLike, driver?: ModelDriver): Promise<void> {
      const result = await recursiveParse(handle, driver)
      this.parseIssues = result.issues
      await this._resolveParentSpecs(result.nodes, result.rootIds)
      this.setGraph(result.nodes, result.rootIds)
    },

    /**
     * Resolves parent_spec URLs for level-3 models and injects template
     * concepts as synthetic root nodes so findTemplatePeer() can locate
     * concept colors without relying on co-location.
     *
     * Best-effort: network failures or missing templates degrade gracefully
     * to slate fallback.
     */
    async _resolveParentSpecs(
      nodes: Record<string, ModelNode>,
      rootIds: string[],
    ): Promise<void> {
      for (const rootId of rootIds) {
        const root = nodes[rootId]
        if (!root?.rawContent) continue

        const fm = parseFrontmatter(root.rawContent)
        const parentUrl: string | undefined = (fm as any)?.parent_spec?.url
        const parentName: string | undefined = (fm as any)?.parent_spec?.name
        if (!parentUrl || !parentName) continue

        // Skip if already loaded as a peer root with concepts
        // Name comparison: strip trailing _NN from node name since
        // parent_spec.name (e.g. "business_V_0-1-1") doesn't include it
        // but the filename-derived node name does (e.g. "business_V_0-1-1_NN").
        const normalizedParent = parentName.replace(/_NN$/, '')
        const existingPeer = rootIds.find((rid) => {
          if (rid === rootId) return false
          const candidate = nodes[rid]
          if (!candidate?.localMetamodel?.concepts?.length) return false
          const candidateName = candidate.name?.replace(/_NN$/, '')
          return candidateName === normalizedParent
        })
        if (existingPeer) continue

        try {
          const resp = await fetch(parentUrl)
          if (!resp.ok) continue
          const text = await resp.text()
          const tplFm = parseFrontmatter(text)
          if (!tplFm?.concepts?.length) continue

          const templateId = `spec:${parentName}`
          if (nodes[templateId]) continue

          const concepts = tplFm.concepts.map((c: any) => ({
            name: c.name,
            icon: c.icon,
            color: c.color,
            type: c.type,
            weight: c.weight,
            fields: c.fields,
          }))

          const markers = (tplFm.markers ?? []).map((m: any) => ({
            name: m.name,
            icon: m.icon,
            color: m.color,
            symbol: m.symbol,
          }))

          nodes[templateId] = {
            id: templateId,
            name: parentName,
            parentId: null,
            childIds: [],
            type: 'category',
            kind: 'root' as const,
            localMetamodel: { concepts, markers } satisfies LocalMetamodel,
            fields: {},
            markers: {},
            relationships: [],
            rawSections: {},
            source: { path: `spec:${parentName}` },
            sourceMode: 'structural' as const,
          }
          rootIds.push(templateId)
        } catch {
          // Best-effort: network failures degrade to slate fallback
        }
      }
    },

    /**
     * Reorders a child within its parent's childIds array.
     * @param direction 1 = move down, -1 = move up
     */
    reorderChild(parentId: string, childId: string, direction: 1 | -1): void {
      const parent = this.nodes[parentId]
      if (!parent) return
      const idx = parent.childIds.indexOf(childId)
      if (idx === -1) return
      const newIdx = idx + direction
      if (newIdx < 0 || newIdx >= parent.childIds.length) return
      parent.childIds.splice(idx, 1)
      parent.childIds.splice(newIdx, 0, childId)
      this.markDirty(parentId)
    },

    /**
     * Creates a new child node under the given parent.
     * @returns the new node's id
     */
    createChild(
      parentId: string,
      name: string,
      type: string,
      kind?: 'concept' | 'element',
    ): string {
      const parent = this.nodes[parentId]
      if (!parent) throw new Error(`Parent node "${parentId}" not found`)
      const id = `${parentId}/${name}`
      if (this.nodes[id]) throw new Error(`Node "${id}" already exists`)
      this.nodes[id] = {
        id,
        name,
        parentId,
        childIds: [],
        type,
        kind: kind ?? 'element',
        fields: {},
        markers: {},
        relationships: [],
        rawSections: {},
        source: { path: '' },
      }
      parent.childIds.push(id)
      this.markDirty(parentId)
      return id
    },

    /**
     * Removes a node and all its descendants from the graph.
     */
    removeNodeTree(nodeId: string): void {
      const node = this.nodes[nodeId]
      if (!node) return
      // Recursively remove children
      for (const childId of [...node.childIds]) {
        this.removeNodeTree(childId)
      }
      // Remove from parent
      if (node.parentId) {
        const parent = this.nodes[node.parentId]
        if (parent) {
          parent.childIds = parent.childIds.filter((id) => id !== nodeId)
        }
      }
      delete this.nodes[nodeId]
      this.dirtyIds.add(nodeId)
    },
  },
})
