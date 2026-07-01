import { parseModel, serializeModel } from '@innv0/format-core'
import type { ModelNode } from './types'
import type { DirectoryHandleLike, FileHandleLike } from './fs-types'
import { isDirectoryHandle } from './fs-types'

const FORMAT_MD = '_FORMAT.md'

/**
 * Rebuilds the serialized text for a FILE/FOLDER root node. This slice has
 * no field-editing UI yet (Phase 6), so a dirty node's canonical text is
 * reconstructed by re-parsing its preserved `rawContent` and serializing it
 * back through `format-core`'s own `serializeModel` — the same primitive a
 * future field-edit commit would call once it mutates the parsed model
 * in-place. This keeps the write path wired through the real primitive
 * (R6) instead of a passthrough no-op.
 */
function serializeNodeContent(node: ModelNode): string {
  if (node.rawContent === undefined) {
    throw new Error(`Node "${node.id}" has no rawContent to serialize from`)
  }
  const parsed = parseModel(node.rawContent)
  return serializeModel(parsed)
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
 */
export async function recursiveSerialize(
  root: DirectoryHandleLike,
  nodes: Record<string, ModelNode>,
  rootIds: string[],
  dirtyIds: Set<string>,
): Promise<void> {
  if (dirtyIds.size === 0) return

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

  await walkAndWrite(root, '', nodesByPath, dirtyIds)
}

async function walkAndWrite(
  dirHandle: DirectoryHandleLike,
  pathPrefix: string,
  nodesByPath: Map<string, ModelNode>,
  dirtyIds: Set<string>,
): Promise<void> {
  for await (const [entryName, entryHandle] of dirHandle.entries()) {
    const entryPath = pathPrefix ? `${pathPrefix}/${entryName}` : entryName

    if (isDirectoryHandle(entryHandle)) {
      // FOLDER node: check its own _FORMAT.md for dirtiness, then recurse.
      const ownFormatPath = `${entryPath}/${FORMAT_MD}`
      const folderNode = nodesByPath.get(ownFormatPath)
      if (folderNode && dirtyIds.has(folderNode.id)) {
        const formatHandle = await entryHandle.getFileHandle(FORMAT_MD)
        await writeFile(formatHandle, serializeNodeContent(folderNode))
      }
      await walkAndWrite(entryHandle, entryPath, nodesByPath, dirtyIds)
    } else if (entryName.toLowerCase().endsWith(FORMAT_MD.toLowerCase())) {
      const fileNode = nodesByPath.get(entryPath)
      if (fileNode && dirtyIds.has(fileNode.id)) {
        await writeFile(entryHandle, serializeNodeContent(fileNode))
      }
    }
  }
}
