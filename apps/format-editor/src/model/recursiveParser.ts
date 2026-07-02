import { parseModel } from '@innv0/format-core'
import type { ElementNode, ParsedModel } from '@innv0/format-core'
import type { ModelNode, FieldValue, LocalMetamodel } from './types'
import { IdentityRegistry, buildQualifiedId } from './identity'
import type { DirectoryHandleLike, FileHandleLike } from './fs-types'
import { isDirectoryHandle } from './fs-types'
import { resolveEffectiveMetamodel } from './metamodel'

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

/**
 * Returns true when the error indicates a file/directory was not found.
 * Handles both the real FS Access API (DOMException with name 'NotFoundError')
 * and fakeFs (Error with message matching /file not found/i).
 */
function isNotFound(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'NotFoundError') return true
  if (err instanceof Error && /file not found/i.test(err.message)) return true
  return false
}

/**
 * Creates a minimal concept/group node for a directory that has no parseable
 * `_FORMAT.md`. These nodes carry no rawContent, no localMetamodel, empty
 * fields/markers, and kind:'concept'. Their children are derived from
 * directory recursion, not from an index block.
 */
function createConceptNode(
  id: string,
  name: string,
  parentId: string | null,
  sourcePath: string,
  ctx: ParseContext,
): void {
  const node: ModelNode = {
    id,
    name,
    parentId,
    childIds: [],
    storageMode: 'FOLDER',
    type: 'concept',
    kind: 'concept',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: sourcePath },
  }
  ctx.nodes[id] = node
  if (parentId && ctx.nodes[parentId] && !ctx.nodes[parentId].childIds.includes(id)) {
    ctx.nodes[parentId].childIds.push(id)
  }
}

/**
 * Creates an element/root node from a parsed `_FORMAT.md`. These carry
 * rawContent, localMetamodel, and in-file elements via normalizeElementsIntoGraph.
 * kind is 'root' when parentId is null, 'element' otherwise.
 */
function createElementNode(
  id: string,
  name: string,
  parentId: string | null,
  content: string,
  parsed: ParsedModel,
  sourcePath: string,
  ctx: ParseContext,
): void {
  const node: ModelNode = {
    id,
    name,
    parentId,
    childIds: [],
    storageMode: 'FOLDER',
    type: (parsed.frontmatter.type as string) || 'concept',
    kind: parentId === null ? 'root' : 'element',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    rawContent: content,
    localMetamodel: toLocalMetamodel(parsed),
    source: { path: sourcePath },
  }
  ctx.nodes[id] = node
  if (parentId && ctx.nodes[parentId] && !ctx.nodes[parentId].childIds.includes(id)) {
    ctx.nodes[parentId].childIds.push(id)
  }
}

/**
 * Attempts to bind a concept node to a matching metamodel concept by
 * resolving the effective metamodel for the parent. When a concept with
 * `name` is found, sets `conceptBinding.source = 'metamodel'` and overwrites
 * `type` with the resolved concept name. When no match is found, sets
 * `conceptBinding.source = 'structural'` — the node remains a structural
 * concept placeholder.
 */
function bindConcept(
  id: string,
  parentId: string | null,
  name: string,
  ctx: ParseContext,
): void {
  const node = ctx.nodes[id]
  if (!node) return

  const effective = parentId ? resolveEffectiveMetamodel(parentId, ctx.nodes) : { concepts: [], markers: [] }
  const matchingConcept = effective.concepts.find((c) => c.name === name)

  if (matchingConcept) {
    node.conceptBinding = { name, source: 'metamodel' }
    node.type = matchingConcept.name
  } else {
    node.conceptBinding = { name, source: 'structural' }
  }
}

/**
 * Phase-1 of folder-node parsing: ensures a node exists for the directory,
 * classifying the root cause of a missing or unparseable `_FORMAT.md`.
 *
 * 1. Registers the qualifiedId up front.
 * 2. Tries to read and parse `_FORMAT.md`.
 *    - ABSENT (NotFoundError): creates a concept node, no issue.
 *    - PRESENT + parseable: creates an element/root node with rawContent
 *      and localMetamodel, normalizes in-file children.
 *    - PRESENT + unparseable: pushes an issue, creates a structural concept
 *      node (children NOT dropped).
 * 3. Returns the qualifiedId — caller runs Phase 2 (unconditional recursion).
 */
async function ensureFolderNode(
  dirHandle: DirectoryHandleLike,
  parentId: string | null,
  sourcePath: string,
  ctx: ParseContext,
): Promise<string> {
  const id = ctx.identity.register(parentId, dirHandle.name)

  let formatHandle: FileHandleLike | null = null
  try {
    formatHandle = await dirHandle.getFileHandle(FORMAT_MD)
  } catch (err) {
    if (!isNotFound(err)) {
      // Unexpected FS error — record issue but still create a concept node.
      ctx.issues.push({
        path: `${sourcePath}/${FORMAT_MD}`,
        message: err instanceof Error ? err.message : String(err),
      })
    }
    // ABSENT or unexpected error — create concept node, children NOT dropped.
    createConceptNode(id, dirHandle.name, parentId, sourcePath, ctx)
    bindConcept(id, parentId, dirHandle.name, ctx)
    return id
  }

  // _FORMAT.md exists — try to parse it.
  try {
    const file = await formatHandle.getFile()
    const content = await file.text()
    const parsed = parseModel(content)

    // Validate the parsed model has meaningful frontmatter. If the content
    // lacks frontmatter delimiters or has no usable metadata, treat it as
    // unparseable — the parser is lenient and won't throw on its own.
    const fm = parsed.frontmatter as Record<string, unknown> | undefined
    if (!fm || Object.keys(fm).length === 0) {
      throw new Error('Missing or empty frontmatter')
    }

    createElementNode(id, dirHandle.name, parentId, content, parsed, sourcePath, ctx)
    // Fractal folder+file: in-file children from taxonomy.
    normalizeElementsIntoGraph(parsed, id, `${sourcePath}/${FORMAT_MD}`, ctx)
    bindConcept(id, parentId, dirHandle.name, ctx)
  } catch (err) {
    // Present but unparseable — record issue, create concept placeholder.
    ctx.issues.push({
      path: `${sourcePath}/${FORMAT_MD}`,
      message: err instanceof Error ? err.message : String(err),
    })
    createConceptNode(id, dirHandle.name, parentId, sourcePath, ctx)
  }

  return id
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
 * Reads a FOLDER node using a two-phase approach:
 * 1. ensureFolderNode — always produces a node (concept/root/element), never aborts.
 * 2. Unconditional recursion — walks child directories and files regardless
 *    of whether phase 1 produced a concept or element node.
 */
async function parseFolderNode(
  dirHandle: DirectoryHandleLike,
  parentId: string | null,
  sourcePath: string,
  ctx: ParseContext,
): Promise<void> {
  // Phase 1: ensure a node exists — never aborts, always returns a qualifiedId.
  const qualifiedId = await ensureFolderNode(dirHandle, parentId, sourcePath, ctx)

  // Phase 2: recurse UNCONDITIONALLY into child entries.
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
