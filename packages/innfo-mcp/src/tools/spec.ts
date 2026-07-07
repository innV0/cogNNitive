/**
 * get_spec and get_template tools.
 *
 * The MCP is publisher-agnostic: it never stores spec/template URLs or
 * template names as constants. A spec/template is resolved ONLY from:
 *   1. an explicit `url` supplied by the caller, or
 *   2. the `parent_spec.url` declared by a loaded model (`model_id`).
 *
 * Resolution runs through `resolveParentChain` (innfo-core), which walks
 * the self-describing parent chain up to level 0, caching locally.
 */

import { join, basename } from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import {
  getTemplate as coreGetTemplate,
  getFormatSpec,
  parseFrontmatter,
} from '@innv0/innfo-core'
import type { SpecDocument, SpecCache } from '@innv0/innfo-core'
import { resolveParentChainNode } from './resolver-node.js'

/**
 * Derive a chain-start name from a spec/template URL.
 * `.../iNNfo_V_0-1-0_NN.md` → `iNNfo_V_0-1-0`.
 */
export function deriveNameFromUrl(url: string): string {
  return basename(url)
    .replace(/\.(md|markdown)$/i, '')
    .replace(/_(NN|FORMAT|F)$/i, '')
}

/**
 * Locate a model file on disk by id.
 * Tries the id verbatim, then `_NN.md` and `_F.md` suffixes.
 */
export async function findModelFile(rootDir: string, id: string): Promise<string | null> {
  const candidates = [join(rootDir, id), join(rootDir, `${id}_NN.md`), join(rootDir, `${id}_F.md`)]
  for (const fp of candidates) {
    try {
      await stat(fp)
      return fp
    } catch {
      continue
    }
  }
  return null
}

/**
 * Read a model's `parent_spec` reference ({ url, name }) from disk.
 * Returns null when the model is missing or declares no resolvable parent.
 */
export async function readParentSpecUrl(
  rootDir: string,
  modelId: string,
): Promise<{ url: string; name: string } | null> {
  const filePath = await findModelFile(rootDir, modelId)
  if (!filePath) return null
  const content = await readFile(filePath, 'utf-8').catch(() => null)
  if (!content) return null
  const fm = parseFrontmatter(content)
  const url = fm?.parent_spec?.url
  const name = fm?.parent_spec?.name
  return url && name ? { url, name } : null
}

/**
 * Get the iNNfo specification (level-1) for a spec/template URL or a model.
 *
 * @param opts.url     Explicit spec/template URL to resolve from.
 * @param opts.modelId Model id whose `parent_spec.url` seeds resolution.
 *
 * Returns `{ spec: null, specCache: null }` when neither input is provided.
 */
export async function getSpec(
  rootDir: string,
  opts: { url?: string; modelId?: string },
): Promise<{ spec: SpecDocument | null; specCache: SpecCache | null }> {
  let url = opts.url
  let name: string | undefined

  if (!url && opts.modelId) {
    const parent = await readParentSpecUrl(rootDir, opts.modelId)
    if (parent) {
      url = parent.url
      name = parent.name
    }
  }

  if (!url) return { spec: null, specCache: null }
  if (!name) name = deriveNameFromUrl(url)

  try {
    const cache = await resolveParentChainNode(rootDir, url, name, join(rootDir, '.spec-cache'))
    // get_spec always returns the level-1 iNNfo spec from the resolved chain,
    // falling back to the requested document when no level-1 is present.
    const spec = getFormatSpec(cache) ?? cache.specs.get(name) ?? null
    return { spec, specCache: cache }
  } catch {
    return { spec: null, specCache: null }
  }
}

/**
 * Resolve a template document directly from a URL — the model's own
 * `parent_spec.url` is the source of truth. No hardcoded names or base URLs.
 */
export async function getTemplateFromUrl(
  rootDir: string,
  url: string,
  name: string,
): Promise<SpecDocument | null> {
  const cacheDir = join(rootDir, '.spec-cache')
  try {
    const cache = await resolveParentChainNode(rootDir, url, name, cacheDir)
    const template = coreGetTemplate(cache) ?? null
    if (template) return template

    // Fallback: read the cached file directly and build a SpecDocument.
    const content = await readFile(join(cacheDir, `${name}_NN.md`), 'utf-8').catch(() => null)
    if (content) {
      const fm = parseFrontmatter(content)
      if (fm) {
        return {
          name,
          level: fm.level ?? 2,
          parentName: fm.parent_spec?.name,
          parentUrl: fm.parent_spec?.url,
          frontmatter: fm,
          rawContent: content,
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Resolve a template from a loaded model, deriving the URL from its
 * `parent_spec.url`. Returns null when the model declares no parent.
 */
export async function getTemplateFromModel(
  rootDir: string,
  modelId: string,
): Promise<SpecDocument | null> {
  const parent = await readParentSpecUrl(rootDir, modelId)
  if (!parent) return null
  return getTemplateFromUrl(rootDir, parent.url, parent.name)
}
