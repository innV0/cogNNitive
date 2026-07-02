import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';
import type { ParsedModel, SpecFrontmatter, GraphEdge, FolderElement, FolderDriverOptions } from './types';
import { parseFrontmatter, parseModel, serializeModel } from './parser';
import type { ModelDriver, ModelEntry } from './driver';

/**
 * FOLDER-mode ModelDriver implementation.
 * Each URI points to a directory containing a `_FORMAT.md` file.
 */
export class FolderDriver implements ModelDriver {
  constructor(private baseUri: string) {}

  async readModel(uri: string): Promise<ParsedModel> {
    const dirPath = this.resolvePath(uri);
    const formatMdPath = join(dirPath, '_FORMAT.md');
    const content = await readFile(formatMdPath, 'utf-8');
    return parseModel(content);
  }

  async writeModel(uri: string, model: ParsedModel): Promise<void> {
    const dirPath = this.resolvePath(uri);
    const formatMdPath = join(dirPath, '_FORMAT.md');
    const content = serializeModel(model);
    await writeFile(formatMdPath, content, 'utf-8');
  }

  async listChildren(uri: string): Promise<ModelEntry[]> {
    const dirPath = this.resolvePath(uri);
    const entries = await readdir(dirPath, { withFileTypes: true });
    const children: ModelEntry[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        // Also surface loose _FORMAT.md files as children (fractal model)
        if (entry.name.toLowerCase().endsWith('_format.md') && entry.name !== '_FORMAT.md') {
          children.push({
            name: entry.name,
            uri: buildChildUri(uri, entry.name),
            kind: 'element',
          });
        }
        continue;
      }
      const subDirPath = join(dirPath, entry.name);
      const formatMdPath = join(subDirPath, '_FORMAT.md');
      try {
        await access(formatMdPath);
        children.push({
          name: entry.name,
          uri: buildChildUri(uri, entry.name),
          kind: 'element',
        });
      } catch {
        // Directory without _FORMAT.md — skip as a child (treated as concept
        // by the recursive parser when using handles; when using driver, these
        // are not modeled as graph nodes in this slice).
      }
    }

    return children;
  }

  async listAssets(uri: string): Promise<string[]> {
    const dirPath = this.resolvePath(uri);
    const entries = await readdir(dirPath, { withFileTypes: true });
    const assets: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) continue;
      if (entry.name === '_FORMAT.md' || entry.name.toLowerCase().endsWith('_format.md')) continue;
      const prefix = (uri && uri !== '.' && uri !== '') ? `${uri}/` : '';
      assets.push(`${prefix}${entry.name}`);
    }

    return assets;
  }

  /**
   * Resolves a driver-relative URI to an absolute filesystem path.
   * For FOLDER driver, URIs are directory paths relative to baseUri.
   */
  private resolvePath(uri: string): string {
    const base = this.baseUri || '';
    if (!uri || uri === '.' || uri === '') return base;
    return join(base, uri);
  }
}

/**
 * Builds a child URI by joining parent URI and child name.
 * Normalizes '.' (root) to avoid './name' prefixes.
 */
function buildChildUri(parentUri: string, childName: string): string {
  if (!parentUri || parentUri === '.') return childName
  return `${parentUri}/${childName}`
}

/* ── Legacy types and exports (kept for backward compatibility) ── */

export interface FolderModel {
  rootFrontmatter: SpecFrontmatter;
  rootModel: ParsedModel;
  elements: FolderElement[];
}

/**
 * @deprecated Use `createDriver('FOLDER', baseUri)` + `driver.readModel(uri)` instead.
 *             This wrapper exists for backward compatibility during migration.
 */
export async function discoverFolder(rootPath: string, _options?: FolderDriverOptions): Promise<FolderModel> {
  const driver = new FolderDriver(rootPath);
  const rootModel = await driver.readModel('.');
  const elements = await walkDirectoryLegacy(rootPath, rootPath, 1);
  return {
    rootFrontmatter: rootModel.frontmatter ?? {} as SpecFrontmatter,
    rootModel,
    elements,
  };
}

/** Legacy directory walker — preserved for discoverFolder backward compat. */
async function walkDirectoryLegacy(rootPath: string, currentPath: string, _depth: number): Promise<FolderElement[]> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const result: FolderElement[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = join(currentPath, entry.name);
    const formatMdPath = join(dirPath, '_FORMAT.md');

    try {
      await access(formatMdPath);
    } catch {
      continue;
    }

    const content = await readFile(formatMdPath, 'utf-8');
    const fm: Partial<SpecFrontmatter> = parseFrontmatter(content) ?? {};

    const relPath = relative(rootPath, dirPath).replace(/\\/g, '/');
    const assets: string[] = [];
    const children: FolderElement[] = [];

    const subEntries = await readdir(dirPath, { withFileTypes: true });
    for (const sub of subEntries) {
      const subPath = join(dirPath, sub.name);
      if (sub.isDirectory()) {
        const subChildren = await walkDirectoryLegacy(rootPath, subPath, _depth + 1);
        children.push(...subChildren);
      } else if (sub.name !== '_FORMAT.md') {
        assets.push(join(relPath, sub.name).replace(/\\/g, '/'));
      }
    }

    result.push({
      path: relPath,
      type: (fm?.type as string) || '',
      fields: (fm?.fields as Record<string, unknown>) || {},
      markers: (fm?.markers as unknown as Record<string, number | string>) || {},
      graphEdges: (fm?.graph_edges as GraphEdge[]) || [],
      assets,
      children,
    });
  }

  return result;
}

/**
 * @deprecated Use driver-based iteration instead.
 *             Builds a flat map of FolderElements keyed by relative path from a tree.
 */
export function buildElementMap(elements: FolderElement[]): Map<string, FolderElement> {
  const map = new Map<string, FolderElement>();
  function walk(items: FolderElement[]) {
    for (const item of items) {
      map.set(item.path, item);
      walk(item.children);
    }
  }
  walk(elements);
  return map;
}
