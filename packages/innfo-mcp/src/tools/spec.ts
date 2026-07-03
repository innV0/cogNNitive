/**
 * get_spec and get_template tools.
 *
 * Both use the `resolveParentChain` mechanism from innfo-core to
 * fetch spec/template documents from the public URL, caching them
 * locally via the spec resolution chain.
 *
 * Version resolution:
 *   1. Explicit `version` argument wins if provided.
 *   2. Otherwise derive from the model filename.
 *   3. Fall back to the latest known version.
 */

import { join, basename } from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  resolveParentChain,
  getTemplate as coreGetTemplate,
  getFormatSpec,
  resolveSpecVersionFromFilename,
  parseFrontmatter,
  listModels,
} from '@innv0/innfo-core';
import type { SpecDocument, SpecCache } from '@innv0/innfo-core';

/**
 * Base GitHub URL for the iNNfo spec repository.
 * Matches the convention used by existing models' `spec_url` field.
 */
const SPEC_BASE_URL = 'https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs';

/**
 * Mapping of template names to their spec filenames.
 * Template specs are level-2 documents that declare concepts, markers, matrices.
 */
const TEMPLATE_SPECS: Record<string, string> = {
  business: 'business_V_0-1-1_FORMAT.md',
  procedures: 'procedures_V_0-1-1_FORMAT.md',
  catalog: 'catalog_V_0-1-2_FORMAT.md',
};

/**
 * Resolve a spec version from arguments and optional model id.
 */
async function resolveVersion(rootDir: string, explicitVersion?: string, modelId?: string): Promise<string> {
  if (explicitVersion) return explicitVersion;
  if (modelId) {
    const derived = resolveSpecVersionFromFilename(modelId);
    if (derived) return derived;
    // Also try scanning models for this id
    const models = await listModels(rootDir);
    const model = models.find(m => m.id === modelId);
    if (model?.version) return model.version;
  }
  // Fall back to latest known
  return '0-1-2';
}

/**
 * Get a spec document by building its public URL and resolving
 * the parent chain.
 */
export async function getSpec(
  rootDir: string,
  explicitVersion?: string,
  modelId?: string,
): Promise<{ spec: SpecDocument | null; specCache: SpecCache | null; version: string }> {
  const version = await resolveVersion(rootDir, explicitVersion, modelId);

  // The level-1 FORMAT spec URL
  const specUrl = `${SPEC_BASE_URL}/iNNfo_V_${version}_NN.md`;
  const specName = `iNNfo_V_${version}`;

  try {
    // ResolveParentChain starts from the parent spec reference, so we
    // need a level-1 or level-0 URL. Let's build the level-1 URL directly.
    // For level-1 (FORMAT spec), parent is defiNNe.
    // We call resolveParentChain with the spec URL itself.
    const specDir = join(rootDir, '.spec-cache');
    const cache = await resolveParentChain(specUrl, specName, specDir);

    // Extract the level-1 spec document (FORMAT itself)
    const spec = getFormatSpec(cache) ?? null;

    return { spec, specCache: cache, version };
  } catch (err) {
    // Try Level 0 (defiNNe) — it has no parent
    try {
      const defiNNeUrl = `${SPEC_BASE_URL}/defiNNe_V_${version}_NN.md`;
      const defiNNeName = `defiNNe_V_${version}`;
      const cache = await resolveParentChain(defiNNeUrl, defiNNeName, join(rootDir, '.spec-cache'));
      const spec = getFormatSpec(cache) ?? null;
      return { spec, specCache: cache, version };
    } catch {
      return { spec: null, specCache: null, version };
    }
  }
}

/**
 * Get a template document (level-2) by name.
 */
export async function getTemplate(
  rootDir: string,
  name: string,
  explicitVersion?: string,
): Promise<SpecDocument | null> {
  const templateKey = name.toLowerCase();
  const templateFile = TEMPLATE_SPECS[templateKey];
  if (!templateFile) return null;

  // Extract version from filename if not explicit
  const version = explicitVersion ?? resolveSpecVersionFromFilename(templateFile) ?? '0-1-1';

  // Replace version in template filename
  const versionedFile = templateFile.replace(/V_[\d-]+/, `V_${version}`);
  const templateUrl = `${SPEC_BASE_URL}/${versionedFile}`;
  const templateName = templateKey;

  try {
    const cache = await resolveParentChain(templateUrl, templateName, join(rootDir, '.spec-cache'));
    const template = coreGetTemplate(cache) ?? null;

    // If the template was found by parent chain resolution, return it.
    // Otherwise construct a basic SpecDocument from the fetched content.
    if (template) return template;

    // Fallback: if resolveParentChain didn't name it as level-2 template,
    // try to read the fetched spec content directly.
    const content = await readFile(join(rootDir, '.spec-cache', `${templateName}_NN.md`), 'utf-8').catch(() => null);
    if (content) {
      const fm = parseFrontmatter(content);
      if (fm) {
        return {
          name: templateName,
          level: 2,
          parentName: fm.parent_spec?.name,
          parentUrl: fm.parent_spec?.url,
          frontmatter: fm,
          rawContent: content,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
