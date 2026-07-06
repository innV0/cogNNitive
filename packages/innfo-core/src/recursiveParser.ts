import { parseModel } from './parser'
import type { ElementNode, ParsedModel, ModelNode, FieldValue, LocalMetamodel } from './types'
import { IdentityRegistry } from './identity'
import type { DirectoryHandleLike } from './fs-types'
import type { ModelDriver } from './driver'

const INNFO_FILE_SUFFIX = '.md'
const INDEX_MD = 'index.md'

/**
 * Strips the final `.md` suffix from a filename to derive the model name.
 * Handles both `_NN.md` and bare `.md` filenames.
 */
function stripMdSuffix(filename: string): string {
  return filename.replace(/\.md$/i, '')
}

/**
 * Resolves a relative graph edge target path to an absolute qualified node id.
 * Supports ../ for sibling directories, ../../ for ancestor jumps.
 */
export function resolveGraphEdgeTarget(target: string, sourcePath: string): string {
  const sourceDir = sourcePath.replace(/\/[^/]+\.md$/i, '')
  const sourceParts = sourceDir.split('/').filter(Boolean)
  const targetParts = target.split('/').filter(Boolean)

  const resultParts = [...sourceParts]
  for (const part of targetParts) {
    if (part === '..') {
      resultParts.pop()
    } else if (part !== '.') {
      resultParts.push(part)
    }
  }

  return resultParts.join('/')
}

/**
 * Inverse of resolveGraphEdgeTarget — converts an absolute qualified node id
 * back to a relative path from sourcePath.
 */
export function resolveQualifiedIdToPath(qualifiedId: string, sourcePath: string): string {
  const sourceParts = sourcePath
    .replace(/\/[^/]+\.md$/i, '')
    .split('/')
    .filter(Boolean)
  const targetParts = qualifiedId.split('/').filter(Boolean)

  let i = 0
  while (i < sourceParts.length && i < targetParts.length && sourceParts[i] === targetParts[i]) {
    i++
  }

  const result: string[] = []
  for (let j = i; j < sourceParts.length; j++) {
    result.push('..')
  }
  result.push(...targetParts.slice(i))

  return result.join('/')
}

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

/** Extracts a node's own locally-declared metamodel from its frontmatter. */
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
        type: el.type,
        kind: 'element',
        slug: el.slug,
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

  // Resolve asset paths for elements with asset-typed fields (FR-004)
  resolveElementAssets(parsed, rootId, sourcePath, ctx, qualifiedIdByElementName)
}

/**
 * Resolve asset paths for elements whose concept fields are of type
 * image/file/video/audio. Paths are constructed according to asset_mode.
 */
function resolveElementAssets(
  parsed: ParsedModel,
  rootId: string,
  sourcePath: string,
  ctx: ParseContext,
  qualifiedIdByElementName: Map<string, string>,
): void {
  // Build a map of concept name -> asset field definitions
  const assetFieldsByConcept = new Map<string, Array<{ name: string; type: string }>>()
  for (const concept of parsed.frontmatter.concepts ?? []) {
    const assetFields = (concept.fields ?? []).filter(
      (f) => f.type === 'image' || f.type === 'file' || f.type === 'video' || f.type === 'audio',
    )
    if (assetFields.length > 0) {
      assetFieldsByConcept.set(
        concept.name,
        assetFields.map((f) => ({ name: f.name, type: f.type })),
      )
    }
  }

  if (assetFieldsByConcept.size === 0) return

  // Determine asset mode from root node
  const rootNode = ctx.nodes[rootId]
  const assetMode = rootNode?.assetMode ?? 'centralized'
  const modelDir = sourcePath.replace(/\/?[^/]+$/, '') // directory of the model file

  for (const [conceptName, elementNodes] of parsed.elements.entries()) {
    const assetFields = assetFieldsByConcept.get(conceptName)
    if (!assetFields) continue

    for (const el of elementNodes) {
      const qualifiedId = qualifiedIdByElementName.get(el.name)
      if (!qualifiedId) continue
      const node = ctx.nodes[qualifiedId]
      if (!node) continue

      const paths: string[] = []
      for (const fieldDef of assetFields) {
        const fieldValue = el.fields[fieldDef.name]
        if (typeof fieldValue === 'string' && fieldValue.trim()) {
          const assetDir =
            assetMode === 'per-element' && el.slug ? `${modelDir}/${el.slug}` : `${modelDir}/assets`
          paths.push(`${assetDir}/${fieldValue.trim()}`)
        }
      }

      if (paths.length > 0) {
        node.assets = [...(node.assets ?? []), ...paths]
      }
    }
  }
}

/**
 * Parses a single model file and registers its root node and elements into ctx.
 * Shared by the wikilink-driven path (index.md present) and the fallback path
 * (index.md missing — standalone _NN.md files).
 */
async function parseAndRegisterModel(
  content: string,
  refPath: string,
  refName: string,
  ctx: ParseContext,
  elementNameToModel: Map<string, string>,
): Promise<void> {
  let parsed: ParsedModel
  try {
    parsed = parseModel(content)
  } catch (err) {
    ctx.issues.push({
      path: refPath,
      message: err instanceof Error ? err.message : String(err),
    })
    return
  }

  // Skip files without iNNfo frontmatter — not a model (§2.1)
  if (!parsed.frontmatter.spec_version) {
    return
  }

  // Determine asset mode (FR-004, default centralized)
  const assetMode = parsed.frontmatter.asset_mode ?? 'centralized'

  // Create root node for this model
  const qualifiedId = ctx.identity.register(null, refName)
  const rootNode: ModelNode = {
    id: qualifiedId,
    name: refName,
    parentId: null,
    childIds: [],
    type: (parsed.frontmatter.title as string) || 'document',
    kind: 'root',
    fields: toFieldValues(parsed.frontmatter as Record<string, unknown>),
    markers: {},
    relationships: [],
    assetMode,
    rawSections: {},
    rawContent: content,
    localMetamodel: toLocalMetamodel(parsed),
    sourceMode: 'parsed',
    source: { path: refPath },
  }

  // Parse graph_edges from frontmatter into relationships
  if (parsed.frontmatter.graph_edges) {
    const graphEdges = parsed.frontmatter.graph_edges as Array<{
      target: string
      label: string
      weight?: number
    }>
    for (const edge of graphEdges) {
      rootNode.relationships.push({
        targetId: resolveGraphEdgeTarget(edge.target, refPath),
        label: edge.label,
        value: edge.weight,
      })
    }
  }

  // Store matrix definitions as __matrix_defs for UI components
  const fmMatrices = (parsed.frontmatter as any)?.matrices
  if (Array.isArray(fmMatrices) && fmMatrices.length > 0) {
    rootNode.fields['__matrix_defs'] = {
      value: fmMatrices.map((m: any) => ({
        name: m.name,
        source: m.source,
        target: m.target,
        widgetType: m.widgetType || 'text',
        params: m.params || '',
      })),
      provenance: { author: { kind: 'system', id: 'parser' }, timestamp: nowIso() },
    }
  }

  // Store matrix cell values as root node fields for MatricesGrid
  for (const matrix of parsed.matrices) {
    const prefix = matrix.name + '||'
    for (const cell of matrix.cells) {
      if (cell.row && cell.col) {
        rootNode.fields[prefix + cell.row + '||' + cell.col] = {
          value: cell.value,
          provenance: { author: { kind: 'system', id: 'parser' }, timestamp: nowIso() },
        }
      }
    }
  }

  ctx.nodes[qualifiedId] = rootNode

  // Normalize in-file elements
  normalizeElementsIntoGraph(parsed, qualifiedId, refPath, ctx)

  // Track element names per model for cross-model collision detection (FR-005)
  for (const [, elementNodes] of parsed.elements.entries()) {
    for (const el of elementNodes) {
      if (elementNameToModel.has(el.name)) {
        const existingModel = elementNameToModel.get(el.name)!
        ctx.issues.push({
          path: '<root>',
          message: `Element "${el.name}" appears in both "${existingModel}" and "${refName}" — consider renaming to "${el.name} (${refName})"`,
        })
      } else {
        elementNameToModel.set(el.name, refName)
      }
    }
  }
}

/**
 * Returns true when the error indicates a file/directory was not found.
 * Handles:
 * - Browser File API (DOMException with name 'NotFoundError')
 * - Fake FS (Error with message matching /file not found/i)
 * - Node.js fs (Error with code 'ENOENT')
 */
function isNotFound(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'NotFoundError') return true
  if (err instanceof Error && /file not found/i.test(err.message)) return true
  if (err instanceof Error && (err as { code?: string }).code === 'ENOENT') return true
  return false
}

/**
 * Parses a workspace by reading `index.md` as the single entry point.
 *
 * Step 1: Read index.md from root handle (or driver)
 * Step 2: Extract wikilink targets from index.md body (any `.md` file)
 * Step 3: For each wikilink target → resolve file, parseModel, normalize elements
 * Step 4: Report identity collisions
 *
 * Only files with a valid iNNfo YAML frontmatter (`spec_version` field) are
 * registered as models — plain Markdown files are silently skipped.
 *
 * **Fallback**: When `index.md` is missing and no `driver` is provided, the
 * root directory is scanned for standalone `.md` files (excluding `index.md`)
 * and each valid iNNfo model is loaded as an independent root node. The
 * missing-index.md issue is still reported as the first warning in `issues[]`.
 *
 * **Naming convention**: The `_NN.md` suffix is RECOMMENDED (§8.1) but no
 * longer required — any `.md` filename works. The validator reports a warning
 * for files that don't follow the convention.
 *
 * When `driver` is provided, model reads go through `driver.readModel()` instead of
 * raw DirectoryHandleLike interactions.
 */
export async function recursiveParse(
  root: DirectoryHandleLike,
  driver?: ModelDriver,
): Promise<RecursiveParseResult> {
  const ctx: ParseContext = { nodes: {}, identity: new IdentityRegistry(), issues: [] }

  // Step 1: Read index.md
  let indexContent: string
  try {
    if (driver) {
      const parsed = await driver.readModel('index.md')
      indexContent = parsed.rawContent
    } else {
      const indexHandle = await root.getFileHandle('index.md')
      const indexFile = await indexHandle.getFile()
      indexContent = await indexFile.text()
    }
  } catch (err) {
    if (isNotFound(err)) {
      // Fallback: when index.md is missing, scan root for standalone .md files
      if (!driver) {
        const modelRefsFromScan: Array<{ name: string; path: string }> = []
        for await (const [name, entry] of root.entries()) {
          // Accept any .md file except index.md itself
          if (entry.kind === 'file' && name.endsWith(INNFO_FILE_SUFFIX) && name.toLowerCase() !== INDEX_MD) {
            modelRefsFromScan.push({ name: stripMdSuffix(name), path: name })
          }
        }

        const elementNameToModel = new Map<string, string>()
        for (const ref of modelRefsFromScan) {
          let content: string
          try {
            const fileHandle = await root.getFileHandle(ref.path)
            const file = await fileHandle.getFile()
            content = await file.text()
          } catch (scanErr) {
            if (isNotFound(scanErr)) {
              ctx.issues.push({
                path: ref.path,
                message: `Referenced model "${ref.path}" not found — skipping`,
              })
              continue
            }
            ctx.issues.push({
              path: ref.path,
              message: scanErr instanceof Error ? scanErr.message : String(scanErr),
            })
            continue
          }

          await parseAndRegisterModel(content, ref.path, ref.name, ctx, elementNameToModel)
        }

        // Surface identity collisions even in fallback mode
        for (const collision of ctx.identity.getCollisions()) {
          ctx.issues.push({
            path: collision.parentQualifiedId ?? '<root>',
            message: collision.message,
          })
        }
      }

      // Add the missing index.md issue as the first warning (downgraded when fallback found models)
      const rootCount = Object.values(ctx.nodes).filter((n) => n.parentId === null).length
      ctx.issues.unshift({
        path: '<root>',
        message:
          rootCount > 0
            ? `No index.md found — loaded ${rootCount} standalone model(s) from root directory`
            : 'Missing index.md — workspace root must contain an index.md file',
      })

      const rootIds = Object.values(ctx.nodes)
        .filter((n) => n.parentId === null)
        .map((n) => n.id)

      return { nodes: ctx.nodes, rootIds, issues: ctx.issues }
    }
    return {
      nodes: {},
      rootIds: [],
      issues: [{ path: '<root>', message: err instanceof Error ? err.message : String(err) }],
    }
  }

  // Step 2: Extract wikilink targets from index.md body (strip frontmatter)
  const body = indexContent.replace(/^---[\s\S]*?---\n?/, '').trim()
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g
  const modelRefs: Array<{ name: string; path: string }> = []
  let match: RegExpExecArray | null
  while ((match = wikilinkRegex.exec(body)) !== null) {
    const target = match[1].trim()
    // Treat wikilinks ending in .md as model references
    // (the _NN.md suffix is recommended but not required — §8.1)
    if (target.endsWith(INNFO_FILE_SUFFIX) && target.toLowerCase() !== INDEX_MD) {
      const name = stripMdSuffix(target)
      modelRefs.push({ name, path: target })
    }
  }

  // Step 3: Parse each model
  // Track element name -> model mapping for cross-model collision detection (FR-005)
  const elementNameToModel = new Map<string, string>()

  for (const ref of modelRefs) {
    let content: string

    try {
      if (driver) {
        const parsed = await driver.readModel(ref.path)
        content = parsed.rawContent
      } else {
        const fileHandle = await root.getFileHandle(ref.path)
        const file = await fileHandle.getFile()
        content = await file.text()
      }
    } catch (err) {
      if (isNotFound(err)) {
        ctx.issues.push({
          path: ref.path,
          message: `Wikilink target "${ref.path}" not found — skipping`,
        })
        continue
      }
      ctx.issues.push({
        path: ref.path,
        message: err instanceof Error ? err.message : String(err),
      })
      continue
    }

    // Parse and register the model (shared helper — also used by index.md fallback)
    await parseAndRegisterModel(content, ref.path, ref.name, ctx, elementNameToModel)
  }

  // Step 4: Surface identity collisions as parse issues
  for (const collision of ctx.identity.getCollisions()) {
    ctx.issues.push({
      path: collision.parentQualifiedId ?? '<root>',
      message: collision.message,
    })
  }

  const rootIds = Object.values(ctx.nodes)
    .filter((n) => n.parentId === null)
    .map((n) => n.id)

  return { nodes: ctx.nodes, rootIds, issues: ctx.issues }
}
