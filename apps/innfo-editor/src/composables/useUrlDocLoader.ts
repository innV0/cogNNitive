/**
 * useUrlDocLoader — Load a FORMAT model document from a URL.
 *
 * Fetches the raw markdown, parses it with @innv0/innfo-core's `parseModel`,
 * builds a minimal in-memory graph, and optionally populates modelStore.
 *
 * URL-loaded workspaces have NO File System handle — save is disabled.
 */
import { parseModel } from '@innv0/innfo-core'
import type { ModelNode } from '../model/types'
import { useModelStore } from '../stores/modelStore'

export interface UrlDocLoaderResult {
  nodes: Record<string, ModelNode>
  rootIds: string[]
  sourceUrl: string
  error: string | null
}

/**
 * Composable that provides URL-based document loading for the format-editor.
 */
export function useUrlDocLoader() {
  /**
   * Fetches a FORMAT model markdown file from `url`, parses it, and returns
   * a normalized node graph (without populating any store).
   */
  async function fetch(url: string): Promise<UrlDocLoaderResult> {
    const result: UrlDocLoaderResult = {
      nodes: {},
      rootIds: [],
      sourceUrl: url,
      error: null,
    }

    try {
      const response = await window.fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const text = await response.text()
      const parsed = parseModel(text)

      // Derive a stable root id from the URL's last path segment
      const segments = url.replace(/\/+$/, '').split('/')
      const rawName = segments[segments.length - 1] ?? 'root'
      const rootId = rawName.replace(/\.md$/i, '')

      // Build the root node
      const rootNode: ModelNode = {
        id: rootId,
        name: parsed.frontmatter.title ?? rootId,
        parentId: null,
        childIds: [],
        type: 'text',
        fields: {},
        markers: {},
        relationships: [],
        rawSections: {},
        rawContent: text,
        source: { path: url },
        kind: 'root',
      }

      const nodes: Record<string, ModelNode> = { [rootId]: rootNode }

      // Build element nodes from parsed sections
      for (const [conceptName, elements] of parsed.elements.entries()) {
        for (const el of elements) {
          const nodeId = `${rootId}/${el.name}`

          nodes[nodeId] = {
            id: nodeId,
            name: el.name,
            parentId: rootId,
            childIds: [],
            type: conceptName,
            fields: {},
            markers: { ...el.markers },
            relationships: [],
            rawSections: {},
            source: { path: url },
            kind: 'element',
          }
          rootNode.childIds.push(nodeId)
        }
      }

      result.nodes = nodes
      result.rootIds = [rootId]
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err)
    }

    return result
  }

  /**
   * Fetches a FORMAT model from `url` and populates modelStore with the
   * parsed graph. Returns the same result as `fetch()` so callers can
   * inspect errors or node metadata.
   */
  async function loadIntoStore(url: string): Promise<UrlDocLoaderResult> {
    const result = await fetch(url)

    if (!result.error && Object.keys(result.nodes).length > 0) {
      const modelStore = useModelStore()
      modelStore.setGraph(result.nodes, result.rootIds)
    }

    return result
  }

  return { fetch, loadIntoStore }
}
