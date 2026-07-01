import { parseModel } from '@innv0/format-core'
import type { ElementNode, ParsedModel } from '@innv0/format-core'
import type { ModelNode, FieldValue, LocalMetamodel } from './types'
import { IdentityRegistry, buildQualifiedId } from './identity'
import type { DirectoryHandleLike, FileHandleLike } from './fs-types'
import { isDirectoryHandle } from './fs-types'

const FORMAT_MD = '_FORMAT.md'
const FORMAT_FILE_SUFFIX = '_FORMAT.md'

export interface ParseIssue {
  path: string
  message: string
}

export interface RecursiveParseResult {
  nodes: Record<string, ModelNode>
  rootIds: string[]
  issues: ParseIssue[]
}

interface ParseContext {
  nodes: Record<string, ModelNode>
  identity: IdentityRegistry
  issues: ParseIssue[]
}

function nowIso(): string {
  return new Date().toISOString()
}

/** Extracts a node's own locally-declared metamodel from its frontmatter (R9 local declaration). */
function toLocalMetamodel(parsed: ParsedModel): LocalMetamodel {
  return {
    concepts: (parsed.frontmatter.concepts ?? []) as LocalMetamodel['concepts'],
    markers: (parsed.frontmatter.markers ?? []) as LocalMetamodel['markers'],
  }
}

function toFieldValues(fields: Record<string, unknown>): Record<string, FieldValue> {
  const result: Record<string, FieldValue> = {}
  for (const [key, value] of Object.entries(fields)) {
    result[key] = {
      value,
      provenance: { author: { kind: 'system', id: 'parser' }, timestamp: nowIso() },
    }
  }
  return result
}

/** Builds a taxonomy parent-lookup: child name -> parent name. */
function buildTaxonomyParentMap(parsed: ParsedModel): Map<string, string> {
  const parentOf = new Map<string, string>()
  for (const edge of parsed.taxonomy) {
    parentOf.set(edge.child, edge.parent)
  }
  return parentOf
}

/**
 * Normalizes a single already-parsed ParsedModel's elements into ModelNodes,
 * attached under `rootId`. Elements form a flat or taxonomy-derived
 * hierarchy beneath the document root; unrecognized parents fall back to
 * being direct children of the root.
 */
function normalizeElementsIntoGraph(
  parsed: ParsedModel,
  rootId: string,
  sourcePath: string,
  ctx: ParseContext,
): void {
  const parentOfTaxonomy = buildTaxonomyParentMap(parsed)
  const qualifiedIdByElementName = new Map<string, string>()

  // Collect all elements in declaration order, grouped by concept.
  const allElements: ElementNode[] = []
  for (const [, elementNodes] of parsed.elements.entries()) {
    for (const el of elementNodes) {
      allElements.push(el)
    }
  }

  // First pass: elements whose taxonomy parent has no listed parent themselves
  // (i.e. top-level relative to this document) get created first, so their
  // qualifiedId is available for children referencing them via taxonomy.
  const byName = new Map<string, ElementNode>()
  for (const el of allElements) byName.set(el.name, el)

  function resolveParentQualifiedId(elementName: string, seen: Set<string>): string {
    const taxonomyParentName = parentOfTaxonomy.get(elementName)
    if (!taxonomyParentName || seen.has(elementName)) {
      return rootId
    }
    if (qualifiedIdByElementName.has(taxonomyParentName)) {
      return qualifiedIdByElementName.get(taxonomyParentName)!
    }
    if (byName.has(taxonomyParentName)) {
      seen.add(elementName)
      return resolveParentQualifiedId(taxonomyParentName, seen)
    }
    return rootId
  }

  for (const el of allElements) {
    try {
      const parentQualifiedId = resolveParentQualifiedId(el.name, new Set())
      const qualifiedId = ctx.identity.register(parentQualifiedId, el.name)
      qualifiedIdByElementName.set(el.name, qualifiedId)

      const node: ModelNode = {
        id: qualifiedId,
        name: el.name,
        parentId: parentQualifiedId,
        childIds: [],
        storageMode: ctx.nodes[rootId]!.storageMode,
        type: el.type,
        fields: toFieldValues(el.fields),
        markers: { ...(parsed.nodeMarkers[el.name] ?? {}) },
        relationships: [],
        rawSections: el.description ? { description: el.description } : {},
        source: { path: sourcePath },
      }
      ctx.nodes[qualifiedId] = node
      const parent = ctx.nodes[parentQualifiedId]
      if (parent && !parent.childIds.includes(qualifiedId)) {
        parent.childIds.push(qualifiedId)
      }
    } catch (err) {
      ctx.issues.push({
        path: `${sourcePath}#${el.name}`,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Attach relationships from matrices between named elements, once all
  // qualified ids are known.
  for (const matrix of parsed.matrices) {
    for (const cell of matrix.cells) {
      const sourceId = qualifiedIdByElementName.get(cell.row)
      const targetId = qualifiedIdByElementName.get(cell.col)
      if (sourceId && targetId && ctx.nodes[sourceId]) {
        ctx.nodes[sourceId].relationships.push({ targetId, label: matrix.name, value: cell.value })
      }
    }
  }
}

/** Reads a FILE node (a `*_FORMAT.md` sibling of a folder, or a bare file) and normalizes it. */
async function parseFileNode(
  fileHandle: FileHandleLike,
  parentId: string | null,
  sourcePath: string,
  ctx: ParseContext,
): Promise<void> {
  try {
    const file = await fileHandle.getFile()
    const content = await file.text()
    const parsed = parseModel(content)
    const name = fileHandle.name.replace(/_FORMAT\.md$/i, '') || fileHandle.name
    const qualifiedId = ctx.identity.register(parentId, name)

    const rootNode: ModelNode = {
      id: qualifiedId,
      name,
      parentId,
      childIds: [],
      storageMode: 'FILE',
      type: (parsed.frontmatter.title as string) || 'document',
      fields: {},
      markers: {},
      relationships: [],
      rawSections: {},
      rawContent: content,
      localMetamodel: toLocalMetamodel(parsed),
      source: { path: sourcePath },
    }
    ctx.nodes[qualifiedId] = rootNode
    if (parentId && ctx.nodes[parentId] && !ctx.nodes[parentId].childIds.includes(qualifiedId)) {
      ctx.nodes[parentId].childIds.push(qualifiedId)
    }

    normalizeElementsIntoGraph(parsed, qualifiedId, sourcePath, ctx)
  } catch (err) {
    ctx.issues.push({ path: sourcePath, message: err instanceof Error ? err.message : String(err) })
  }
}

/**
 * Reads a FOLDER node: parses its own `_FORMAT.md` (fractal folder+file —
 * a folder can carry file-structured element sections via `# _F` markers
 * AND child directories), then recurses into child directories/files.
 */
async function parseFolderNode(
  dirHandle: DirectoryHandleLike,
  parentId: string | null,
  sourcePath: string,
  ctx: ParseContext,
): Promise<void> {
  let qualifiedId: string
  try {
    const formatHandle = await dirHandle.getFileHandle(FORMAT_MD)
    const file = await formatHandle.getFile()
    const content = await file.text()
    const parsed = parseModel(content)

    qualifiedId = ctx.identity.register(parentId, dirHandle.name)
    const folderNode: ModelNode = {
      id: qualifiedId,
      name: dirHandle.name,
      parentId,
      childIds: [],
      storageMode: 'FOLDER',
      type: (parsed.frontmatter.title as string) || 'folder',
      fields: {},
      markers: {},
      relationships: [],
      rawSections: {},
      rawContent: content,
      localMetamodel: toLocalMetamodel(parsed),
      source: { path: sourcePath },
    }
    ctx.nodes[qualifiedId] = folderNode
    if (parentId && ctx.nodes[parentId] && !ctx.nodes[parentId].childIds.includes(qualifiedId)) {
      ctx.nodes[parentId].childIds.push(qualifiedId)
    }

    // Fractal folder+file: parse the folder's own _FORMAT.md for in-file elements.
    normalizeElementsIntoGraph(parsed, qualifiedId, `${sourcePath}/${FORMAT_MD}`, ctx)
  } catch (err) {
    ctx.issues.push({ path: `${sourcePath}/${FORMAT_MD}`, message: err instanceof Error ? err.message : String(err) })
    return
  }

  // Recurse into child entries (dirs and files) beneath this folder node.
  for await (const [entryName, entryHandle] of dirHandle.entries()) {
    if (entryName === FORMAT_MD) continue
    const childPath = `${sourcePath}/${entryName}`

    if (isDirectoryHandle(entryHandle)) {
      await parseFolderNode(entryHandle, qualifiedId, childPath, ctx)
    } else if (entryName.toLowerCase().endsWith(FORMAT_FILE_SUFFIX.toLowerCase())) {
      await parseFileNode(entryHandle, qualifiedId, childPath, ctx)
    }
    // Non-FORMAT files are assets; not modeled as graph nodes this slice.
  }
}

/**
 * Walks a workspace root recursively, dispatching each node to the FILE
 * or FOLDER primitive per its on-disk representation, and normalizes the
 * result into a single graph (R5). A malformed node is reported via
 * `issues` without aborting the whole-tree walk (siblings still parse).
 */
export async function recursiveParse(root: DirectoryHandleLike): Promise<RecursiveParseResult> {
  const ctx: ParseContext = { nodes: {}, identity: new IdentityRegistry(), issues: [] }
  const rootIds: string[] = []

  for await (const [entryName, entryHandle] of root.entries()) {
    if (entryName === FORMAT_MD) continue

    if (isDirectoryHandle(entryHandle)) {
      const before = new Set(Object.keys(ctx.nodes))
      await parseFolderNode(entryHandle, null, entryName, ctx)
      const added = Object.keys(ctx.nodes).filter((id) => !before.has(id) && ctx.nodes[id].parentId === null)
      rootIds.push(...added)
    } else if (entryName.toLowerCase().endsWith(FORMAT_FILE_SUFFIX.toLowerCase())) {
      const before = new Set(Object.keys(ctx.nodes))
      await parseFileNode(entryHandle, null, entryName, ctx)
      const added = Object.keys(ctx.nodes).filter((id) => !before.has(id) && ctx.nodes[id].parentId === null)
      rootIds.push(...added)
    }
  }

  // Surface identity collisions (duplicate sibling names, R11) as parse
  // issues so callers can't silently lose data — both colliding nodes
  // still exist in `ctx.nodes` under disambiguated qualified ids.
  for (const collision of ctx.identity.getCollisions()) {
    ctx.issues.push({
      path: collision.parentQualifiedId ?? '<root>',
      message: collision.message,
    })
  }

  return { nodes: ctx.nodes, rootIds, issues: ctx.issues }
}
