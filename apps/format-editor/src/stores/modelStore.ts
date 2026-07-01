import { defineStore } from 'pinia'
import type { ModelNode } from '../model/types'
import type { DirectoryHandleLike } from './workspaceStore'
import { recursiveParse } from '../model/recursiveParser'

export interface ModelState {
  nodes: Record<string, ModelNode>
  rootIds: string[]
  dirtyIds: Set<string>
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
  }),
  getters: {
    getNode: (state) => (id: string): ModelNode | undefined => state.nodes[id],
    getChildren: (state) => (id: string): ModelNode[] =>
      (state.nodes[id]?.childIds ?? []).map((cid) => state.nodes[cid]).filter(Boolean),
    getRoots: (state) => (): ModelNode[] => state.rootIds.map((id) => state.nodes[id]).filter(Boolean),
  },
  actions: {
    /** Replaces the whole graph (used by a fresh recursive parse). */
    setGraph(nodes: Record<string, ModelNode>, rootIds: string[]): void {
      this.nodes = nodes
      this.rootIds = rootIds
      this.dirtyIds = new Set<string>()
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

    isDirty(id: string): boolean {
      return this.dirtyIds.has(id)
    },

    /**
     * Populates this store directly from a workspace handle via a
     * recursive parse — no intermediate per-mode store. Real recursive
     * walking/parsing lands in Phase 3 (recursiveParser.ts); this wires
     * the call so workspaceStore.open() has a single integration point.
     */
    async parseFromHandle(handle: DirectoryHandleLike): Promise<void> {
      const result = await recursiveParse(handle)
      this.setGraph(result.nodes, result.rootIds)
    },
  },
})
