import { readFile, writeFile } from 'node:fs/promises';
import type { ParsedModel } from './types';
import { parseModel, serializeModel } from './parser';
import type { ModelDriver, ModelEntry } from './driver';

/**
 * Unified ModelDriver implementation.
 * Each URI points to a single FORMAT Markdown file.
 */
export class UnifiedDriver implements ModelDriver {
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
    return [];
  }

  /**
   * Resolves a driver-relative URI to an absolute filesystem path.
   * URIs are file paths relative to baseUri.
   */
  private resolvePath(uri: string): string {
    if (this.baseUri) {
      return `${this.baseUri}/${uri}`.replace(/\/+/g, '/');
    }
    return uri;
  }
}
