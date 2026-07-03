/**
 * Additive helpers for the format-core programmatic surface.
 * These do NOT change any existing behavior — they provide convenience
 * wrappers that the MCP server consumes.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { parseModel } from './parser';
import type { ParsedModel } from './types';

/* ── Version resolution ──────────────────────────────────────── */

/**
 * SemVer pattern as used in iNNfo filenames: `_V_MAJOR-MINOR-PATCH_`
 */
const VERSION_FILENAME_RE = /_V_(\d+-\d+-\d+)_/;

/**
 * Extract the SemVer (e.g. `0-1-1`) from an iNNfo filename like
 * `Ghostbusters_V_0-1-2_business_NN.md` → `0-1-2`.
 * Returns `null` if no version marker is found.
 */
export function resolveSpecVersionFromFilename(filename: string): string | null {
  const match = filename.match(VERSION_FILENAME_RE);
  return match ? match[1] : null;
}

/* ── Model scanning ──────────────────────────────────────────── */

export interface ModelInfo {
  /** Short model identifier (filename stem, used as `id` in MCP tools) */
  id: string;
  /** Absolute filesystem path */
  path: string;
  /** FILE or FOLDER — determined from the model's `mode` frontmatter field */
  mode: 'FILE' | 'FOLDER';
  /** SemVer extracted from filename, e.g. `0-1-2` */
  version: string | null;
}

const NN_MD_RE = /_NN\.md$/i;

/**
 * Scan a root directory for iNNfo model files (`*_NN.md`).
 * Returns an array of `ModelInfo` sorted by id.
 */
export async function listModels(rootDir: string): Promise<ModelInfo[]> {
  const models: ModelInfo[] = [];

  const entries = await readdir(rootDir, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!NN_MD_RE.test(entry.name)) continue;

    const filePath = join(rootDir, entry.name);
    const id = entry.name.replace(NN_MD_RE, '');
    const version = resolveSpecVersionFromFilename(entry.name);

    // Quick-read frontmatter to detect mode
    let mode: 'FILE' | 'FOLDER' = 'FILE';
    try {
      const content = await readFile(filePath, 'utf-8');
      const parsed = parseModel(content);
      if (parsed.frontmatter.mode === 'FOLDER') {
        mode = 'FOLDER';
      }
    } catch {
      // If parse fails, default to FILE
    }

    models.push({ id, path: filePath, mode, version });
  }

  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}
