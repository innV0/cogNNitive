/**
 * list_models and read_model tools.
 *
 * list_models scans the root directory for iNNfo model files (`*_NN.md`)
 * and returns their id, path, mode, and version.
 *
 * read_model parses a model by id and returns its parsed structure.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listModels as coreListModels, parseModel, resolveSpecVersionFromFilename } from '@innv0/innfo-core';
import type { ModelInfo, ParsedModel } from '@innv0/innfo-core';

/**
 * Scan a directory for iNNfo models.
 */
export async function listModels(rootDir: string): Promise<ModelInfo[]> {
  return coreListModels(rootDir);
}

/**
 * Read and parse an iNNfo model by its id.
 * The id is the filename stem (e.g. `Ghostbusters_V_0-1-2_business`
 * resolves to `Ghostbusters_V_0-1-2_business_NN.md`).
 *
 * Returns null if the file doesn't exist or can't be parsed.
 */
export async function readModel(rootDir: string, id: string): Promise<ParsedModel | null> {
  // Try exact path first, then append _NN.md
  const candidates = [
    join(rootDir, id),
    join(rootDir, `${id}_NN.md`),
  ];

  for (const filePath of candidates) {
    try {
      const { stat } = await import('node:fs/promises');
      await stat(filePath);
      const content = await readFile(filePath, 'utf-8');
      const model = parseModel(content);
      return model;
    } catch {
      continue;
    }
  }

  return null;
}
