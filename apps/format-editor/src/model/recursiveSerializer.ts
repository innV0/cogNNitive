import { parseModel, serializeModel, resolveQualifiedIdToPath } from '@innv0/format-core'
import type { ModelNode } from './types'
import type { ModelDriver } from '@innv0/format-core'
import type { DirectoryHandleLike, FileHandleLike } from './fs-types'
import { isDirectoryHandle } from './fs-types'

export interface WriteReport {
  path: string
  fidelity: 'exact' | 'canonical'
  nodeId: string
}

const FORMAT_MD = '_FORMAT.md'

/**
 * Rebuilds the serialized text for a FILE/FOLDER root node. This slice has
 * no field-editing UI yet (Phase 6), so a dirty node's canonical text is
 * reconstructed by re-parsing its preserved `rawContent` and serializing it
 * back through `format-core`'s own `serializeModel` — the same primitive a
 * future field-edit commit would call once it mutates the parsed model
 * in-place. This keeps the write path wired through the real primitive
 * (R6) instead of a passthrough no-op.
 *
 * Returns a WriteReport indicating fidelity:
 * - 'exact': rawContent was preserved (no edit, byte-identical write)
 * - 'canonical': content was re-serialized through serializeModel (lossy path)
 */
function serializeNodeContent(node: ModelNode): { content: string; fidelity: 'exact' | 'canonical' } {
  if (node.rawContent === undefined) {
    throw new Error(`Node "${node.id}" has no rawContent to serialize from`)
  }
  // If rawContent was never edited, preserve it as-is for exact fidelity.
  // The canonical path probes whether rawContent would survive a re-parse.
  // For now, we always go through the canonical path since the app has no
  // way to signal "no edit occurred at this node" (dirty === any change).
  // A future AST-based parser will provide true byte-fidelity.
  const parsed = parseModel(node.rawContent)
  const serialized = serializeModel(parsed)
  const fidelity: 'exact' | 'canonical' = serialized === node.rawContent ? 'exact' : 'canonical'
  if (fidelity === 'canonical') {
    console.warn(`[fidelity] Node "${node.id}" serialized through lossy canonical path`)
  }
  return { content: serialized, fidelity }
}

async function writeFile(fileHandle: FileHandleLike, content: string): Promise<void> {
  if (!fileHandle.createWritable) {
    throw new Error(`FileHandleLike for "${fileHandle.name}" does not support writing`)
  }
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

/**
 * Walks the graph recursively and, for each node whose id is in `dirtyIds`,
 * invokes the write primitive matching that node's recorded `storageMode`
 * (R6): FILE node -> `serializeModel` -> write its own file; FOLDER node ->
 * write its own `_FORMAT.md`. Only dirty nodes are written by default
 * (dirty-only write-back per design's open question resolution); nodes
 * that are not FILE/FOLDER roots (nested elements) have no own file and
 * are skipped — their data lives inside their nearest FILE/FOLDER
 * ancestor's serialized content.
 *
 * When `driver` is provided, write operations go through `driver.writeModel()`
 * instead of raw FileSystem handle walking. When absent, the original
 * handle-based behavior is preserved (backward compat).
 *
 * Returns an array of WriteReport entries, one per written node.
 */
export async function recursiveSerialize(
  root: DirectoryHandleLike,
  nodes: Record<string, ModelNode>,
  rootIds: string[],
  dirtyIds: Set<string>,
  driver?: ModelDriver,
): Promise<WriteReport[]> {
  if (dirtyIds.size === 0) return []
  const report: WriteReport[] = []

  // Driver path: iterate dirty nodes directly, write through driver.
  if (driver) {
    for (const node of Object.values(nodes)) {
      if (!dirtyIds.has(node.id) || node.rawContent === undefined) continue
      const { content, fidelity } = serializeNodeContent(node)
      const parsed = parseModel(content)

      // Inject graph_edges into FOLDER node frontmatter from relationships
      if (node.storageMode === 'FOLDER' && node.relationships.length > 0) {
        parsed.frontmatter.graph_edges = node.relationships.map(rel => ({
          target: resolveQualifiedIdToPath(rel.targetId, node.source.path),
          label: rel.label,
          weight: typeof rel.value === 'number' ? rel.value : undefined,
        }))
      }

      await driver.writeModel(node.source.path, parsed)
      report.push({ path: node.source.path, fidelity, nodeId: node.id })
    }
    return report
  }

  // Build a lookup by source path so we can walk the real FS handle tree
  // and match nodes to their on-disk location, dispatching by storageMode.
  const nodesByPath = new Map<string, ModelNode>()
  for (const node of Object.values(nodes)) {
    // Only FILE/FOLDER root nodes carry their own rawContent/source file;
    // nested element nodes share their ancestor's source path.
    if (node.rawContent !== undefined) {
      nodesByPath.set(node.source.path, node)
    }
  }

  return walkAndWrite(root, '', nodesByPath, dirtyIds)
}

async function walkAndWrite(
  dirHandle: DirectoryHandleLike,
  pathPrefix: string,
  nodesByPath: Map<string, ModelNode>,
  dirtyIds: Set<string>,
): Promise<WriteReport[]> {
  const report: WriteReport[] = []
  for await (const [entryName, entryHandle] of dirHandle.entries()) {
    const entryPath = pathPrefix ? `${pathPrefix}/${entryName}` : entryName

    if (isDirectoryHandle(entryHandle)) {
      // FOLDER node: check its own _FORMAT.md for dirtiness, then recurse.
      const ownFormatPath = `${entryPath}/${FORMAT_MD}`
      const folderNode = nodesByPath.get(ownFormatPath)
      if (folderNode && dirtyIds.has(folderNode.id)) {
        const formatHandle = await entryHandle.getFileHandle(FORMAT_MD)
        const { content, fidelity } = serializeNodeContent(folderNode)

        // Inject graph_edges into FOLDER node frontmatter from relationships
        let writeContent = content
        if (folderNode.storageMode === 'FOLDER' && folderNode.relationships.length > 0) {
          const parsed = parseModel(content)
          parsed.frontmatter.graph_edges = folderNode.relationships.map(rel => ({
            target: resolveQualifiedIdToPath(rel.targetId, folderNode.source.path),
            label: rel.label,
            weight: typeof rel.value === 'number' ? rel.value : undefined,
          }))
          writeContent = serializeModel(parsed)
        }

        await writeFile(formatHandle, writeContent)
        report.push({ path: ownFormatPath, fidelity, nodeId: folderNode.id })
      }
      const childReport = await walkAndWrite(entryHandle, entryPath, nodesByPath, dirtyIds)
      report.push(...childReport)
    } else if (entryName.toLowerCase().endsWith(FORMAT_MD.toLowerCase())) {
      const fileNode = nodesByPath.get(entryPath)
      if (fileNode && dirtyIds.has(fileNode.id)) {
        const { content, fidelity } = serializeNodeContent(fileNode)

        // Inject graph_edges into FOLDER node frontmatter from relationships (FR-3.5)
        let writeContent = content
        if (fileNode.storageMode === 'FOLDER' && fileNode.relationships.length > 0) {
          const parsed = parseModel(content)
          parsed.frontmatter.graph_edges = fileNode.relationships.map(rel => ({
            target: resolveQualifiedIdToPath(rel.targetId, fileNode.source.path),
            label: rel.label,
            weight: typeof rel.value === 'number' ? rel.value : undefined,
          }))
          writeContent = serializeModel(parsed)
        }

        await writeFile(entryHandle, writeContent)
        report.push({ path: entryPath, fidelity, nodeId: fileNode.id })
      }
    }
  }
  return report
}
