import { join, dirname } from 'node:path';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { SpecCache, SpecDocument, SpecFrontmatter, ResolverOptions } from './types';
import { parseFrontmatter } from './parser';

const MAX_DEPTH_DEFAULT = 10;
const SPECS_DIR = 'specs';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function download(url: string, timeout: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveParentChain(
  parentUrl: string,
  parentName: string,
  basePath: string,
  options: ResolverOptions = {}
): Promise<SpecCache> {
  const maxDepth = options.maxDepth ?? MAX_DEPTH_DEFAULT;
  const timeout = options.timeout ?? 10000;
  const specsDir = options.cacheDir ?? join(basePath, SPECS_DIR);
  const specs = new Map<string, SpecDocument>();
  const chain: string[] = [];

  let currentUrl: string | undefined = parentUrl;
  let currentName: string | undefined = parentName;
  let depth = 0;

  await mkdir(specsDir, { recursive: true });

  while (currentUrl && currentName && depth < maxDepth) {
    const cachePath = join(specsDir, `${currentName}_NN.md`);
    let content: string;

    if (await fileExists(cachePath)) {
      content = await readFile(cachePath, 'utf-8');
    } else {
      content = await download(currentUrl, timeout);
      await writeFile(cachePath, content, 'utf-8');
    }

    const fm = parseFrontmatter(content) ?? {} as SpecFrontmatter;
    const doc: SpecDocument = {
      name: currentName,
      level: fm.level ?? 0,
      parentName: fm.parent_spec?.name,
      parentUrl: fm.parent_spec?.url,
      frontmatter: fm,
      rawContent: content,
    };
    specs.set(currentName, doc);
    chain.push(currentName);

    currentName = doc.parentName;
    currentUrl = doc.parentUrl;
    depth++;
  }

  if (depth >= maxDepth && currentUrl) {
    throw new Error(`Circular parent chain detected at depth ${maxDepth}`);
  }

  return { specs, chain };
}

export function getSpecForLevel(cache: SpecCache, level: number): SpecDocument | undefined {
  for (const doc of cache.specs.values()) {
    if (doc.level === level) return doc;
  }
  return undefined;
}

export function getTemplate(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 2);
}

export function getFormatSpec(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 1);
}

export function getDefiNNe(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 0);
}
