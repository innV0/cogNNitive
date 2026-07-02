import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import type { ParsedModel, FileDriverOptions } from './types';
import { parseModel, serializeModel } from './parser';
import type { ModelDriver, ModelEntry } from './driver';

/**
 * FILE-mode ModelDriver implementation.
 * Each URI points to a single FORMAT Markdown file.
 */
export class FileDriver implements ModelDriver {
  constructor(private baseUri: string) {}

  async readModel(uri: string): Promise<ParsedModel> {
    const filePath = this.resolvePath(uri);
    const content = await readFile(filePath, 'utf-8');
    return parseModel(content);
  }

  async writeModel(uri: string, model: ParsedModel): Promise<void> {
    const filePath = this.resolvePath(uri);
    const content = serializeModel(model);
    await writeFile(filePath, content, 'utf-8');
  }

  async listChildren(uri: string): Promise<ModelEntry[]> {
    // FILE mode children are elements parsed from the document's taxonomy.
    // Return elements declared in the document as child entries.
    const model = await this.readModel(uri);
    const entries: ModelEntry[] = [];
    for (const [, elementNodes] of model.elements.entries()) {
      for (const el of elementNodes) {
        entries.push({
          name: el.name,
          uri: `${uri}#${el.name}`,
          kind: 'element',
        });
      }
    }
    return entries;
  }

  async listAssets(_uri: string): Promise<string[]> {
    // FILE mode has no separate asset files.
    return [];
  }

  /**
   * Resolves a driver-relative URI to an absolute filesystem path.
   * For FILE driver, URIs are file paths relative to baseUri.
   */
  private resolvePath(uri: string): string {
    if (this.baseUri) {
      return `${this.baseUri}/${uri}`.replace(/\/+/g, '/');
    }
    return uri;
  }
}

/* ── Legacy exports (kept for backward compatibility) ── */

/**
 * @deprecated Use `createDriver('FILE', baseUri)` + `driver.readModel(uri)` instead.
 *             This wrapper exists for backward compatibility during migration.
 */
export async function readFileModel(filePath: string, _options?: FileDriverOptions): Promise<ParsedModel> {
  const content = await readFile(filePath, 'utf-8');
  return parseModel(content);
}

/**
 * @deprecated Use `createDriver('FILE', baseUri)` + `driver.writeModel(uri, model)` instead.
 */
export async function writeFileModel(filePath: string, model: ParsedModel, _options?: FileDriverOptions): Promise<void> {
  const content = serializeModel(model);
  await writeFile(filePath, content, 'utf-8');
}

/**
 * @deprecated Use `createDriver('FILE', baseUri)` + `driver.readModel(uri)` instead.
 */
export function readFileModelSync(filePath: string, _options?: FileDriverOptions): ParsedModel {
  const content = readFileSync(filePath, 'utf-8');
  return parseModel(content);
}

/**
 * @deprecated Use `createDriver('FILE', baseUri)` + `driver.writeModel(uri, model)` instead.
 */
export function writeFileModelSync(filePath: string, model: ParsedModel, _options?: FileDriverOptions): void {
  const content = serializeModel(model);
  writeFileSync(filePath, content, 'utf-8');
}
