#!/usr/bin/env node

// check-spec-version.mjs — Scan the repo for files referencing a given spec version.
//
// Usage:
//   node scripts/check-spec-version.mjs --version V_0-1-2
//   node scripts/check-spec-version.mjs --version V_0-1-2 --by-type
//   node scripts/check-spec-version.mjs --version V_0-1-2 --check
//   node scripts/check-spec-version.mjs --version V_0-1-2 --check --by-type
//   node scripts/check-spec-version.mjs --version V_0-1-2 --include-archives
//   node scripts/check-spec-version.mjs --inventory
//   node scripts/check-spec-version.mjs --inventory --include-archives
//
// Modes:
//   default         — Print all files referencing the given version
//   --by-type       — Group results by category
//   --check         — Exit code 1 if any references found (for CI/git hooks)
//   --include-archives — Include archive/ and openspec/changes/archive/ in scan
//   --inventory     — Print ALL spec versions found in the repo

import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Config ──────────────────────────────────────────────────────────

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE_DIRS = new Set(['archive', 'node_modules', '.git', '.playwright-mcp', 'home-page']);
const ACTIVE_IGNORE = new Set(['node_modules', '.git', '.playwright-mcp', 'home-page']);

const FORMAT_VERSION_RE = /V_\d+-\d+-\d+/g;

// ── File Collection ─────────────────────────────────────────────────

function collectFiles(dir, includeArchives) {
  const files = [];
  const baseName = relative(ROOT, dir) || '.';
  const topLevel = dir === ROOT;

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const st = statSync(full);

      // At top level, skip ignored dirs
      if (topLevel) {
        if (!includeArchives && ARCHIVE_DIRS.has(entry)) continue;
        if (ACTIVE_IGNORE.has(entry)) continue;
      }

      if (st.isDirectory()) {
        // Skip any directory named 'archive' regardless of depth
        if (!includeArchives && entry === 'archive') continue;
        files.push(...collectFiles(full, includeArchives));
      } else {
        files.push(full);
      }
    }
  } catch {
    // permission denied or doesn't exist
  }
  return files;
}

// ── Classification ──────────────────────────────────────────────────

function classifyFile(relPath) {
  const parts = relPath.replace(/\\/g, '/').split('/');

  if (relPath.startsWith('specs') && relPath.endsWith('_FORMAT.md') && !relPath.includes('/samples/')) {
    if (relPath.includes('defiNNe') || relPath.includes('/FORMAT')) return 'spec';
    return 'template';
  }
  if (relPath.includes('/samples/') && relPath.endsWith('_FORMAT.md')) return 'model';
  if (relPath.endsWith('_FORMAT.md')) {
    if (relPath.includes('/fixtures/')) return 'fixture';
    if (relPath.startsWith('specs')) return 'model';
    if (relPath.startsWith('archive')) return 'model';
    return 'model';
  }
  if (relPath.includes('/fixtures/') && relPath.endsWith('.md')) return 'fixture';
  if (relPath.endsWith('.test.ts') || relPath.endsWith('.test.tsx') || relPath.endsWith('.spec.ts')) return 'test';
  if ((relPath.startsWith('apps') || relPath.startsWith('packages')) && relPath.endsWith('.ts') && !relPath.endsWith('.test.ts')) return 'source';
  if (relPath.startsWith('docs') && relPath.endsWith('.md')) return 'doc';
  if (relPath.startsWith('.agents') && relPath.endsWith('.md')) return 'skill';
  if (relPath === 'CHANGELOG.md' || relPath === 'specs/CHANGELOG.md') return 'doc';
  if (relPath.startsWith('specs') && relPath.endsWith('.md') && !relPath.endsWith('_FORMAT.md')) return 'doc';
  if (relPath.startsWith('openspec')) return 'other';
  if (relPath.startsWith('archive')) return 'model';
  return 'other';
}

// ── Frontmatter Scanning ────────────────────────────────────────────

function parseFrontmatterBlocks(content) {
  // Extract YAML frontmatter between --- markers
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  return fmMatch[1];
}

function extractVersionRefs(relPath, content) {
  const refs = [];

  // 1. Check file name for version
  const nameMatch = relPath.match(/V_(\d+-\d+-\d+)/);
  if (nameMatch) {
    refs.push({ field: 'filename', value: `V_${nameMatch[1]}`, location: relPath });
  }

  // 2. Parse frontmatter for version fields
  const fm = parseFrontmatterBlocks(content);
  if (fm) {
    // specification_version
    const sv = fm.match(/^specification_version\s*:\s*['"]?(V_\d+-\d+-\d+)['"]?\s*$/m);
    if (sv) refs.push({ field: 'specification_version', value: sv[1], location: relPath });

    // model_version
    const mv = fm.match(/^model_version\s*:\s*['"]?(V_\d+-\d+-\d+)['"]?\s*$/m);
    if (mv) refs.push({ field: 'model_version', value: mv[1], location: relPath });

    // specification_url (extract version from URL)
    const su = fm.match(/^specification_url\s*:\s*['"](https?:\/\/[^'"]+)['"]\s*$/m);
    if (su) {
      const urlVer = su[1].match(/V_\d+-\d+-\d+/);
      if (urlVer) refs.push({ field: 'specification_url', value: urlVer[0], location: relPath });
    }

    // parent block — name
    const pn = fm.match(/^parent:\s*\n\s+name:\s*['"]?([^\s'"]+_V_\d+-\d+-\d+[^\s'"]*)['"]?\s*$/m);
    if (pn) {
      const parentVer = pn[1].match(/V_\d+-\d+-\d+/);
      if (parentVer) refs.push({ field: 'parent.name', value: parentVer[0], location: relPath });
    }

    // parent block — url
    const pu = fm.match(/^parent:\s*\n(?:\s+.*\n)*?\s+url:\s*['"](https?:\/\/[^'"]+)['"]\s*$/m);
    if (pu) {
      const urlVer = pu[1].match(/V_\d+-\d+-\d+/);
      if (urlVer) refs.push({ field: 'parent.url', value: urlVer[0], location: relPath });
    }
  }

  return refs;
}

// ── Version Matching ────────────────────────────────────────────────

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function contentContainsVersion(content, version) {
  const re = new RegExp(`(?:^|[^V])${escapeRegex(version)}(?:[^\\d-]|$)`, 'gm');
  return re.test(content);
}

// ── Scan Logic ──────────────────────────────────────────────────────

function categorizeByVersion(files) {
  const versionMap = new Map();

  for (const filePath of files) {
    const rel = relative(ROOT, filePath);
    let content;
    try { content = readFileSync(filePath, 'utf-8'); } catch { continue; }

    const matches = content.match(FORMAT_VERSION_RE);
    if (!matches) continue;

    const uniqueVersions = [...new Set(matches)];
    for (const ver of uniqueVersions) {
      if (!versionMap.has(ver)) versionMap.set(ver, []);
      versionMap.get(ver).push(rel);
    }
  }
  return versionMap;
}

function scanForVersion(version, files) {
  const results = [];
  const seen = new Set();

  for (const filePath of files) {
    const rel = relative(ROOT, filePath);
    if (seen.has(rel)) continue;

    let content;
    try { content = readFileSync(filePath, 'utf-8'); } catch { continue; }

    if (!contentContainsVersion(content, version)) continue;
    seen.add(rel);

    const refs = extractVersionRefs(rel, content);
    results.push({
      file: rel,
      category: classifyFile(rel),
      refs: refs.length > 0 ? refs : [{ field: 'text', value: version, location: rel }],
    });
  }

  return results;
}

// ── Output ──────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  spec: '\u{1F4C4} Specs',
  template: '\u{1F4CB} Templates',
  model: '\u{1F4E6} Models',
  fixture: '\u{1F9EA} Fixtures',
  test: '\u{1F9EA} Tests',
  source: '\u{2699}\u{FE0F}  Source',
  doc: '\u{1F4DD} Docs',
  skill: '\u{1F916} Skills',
  other: '\u{1F4C1} Other',
};
const CATEGORY_ORDER = ['spec', 'template', 'model', 'fixture', 'test', 'source', 'doc', 'skill', 'other'];

function printResults(results, byType, version) {
  if (results.length === 0) {
    console.log(`  No files reference "${version}" \u2014 repo is clean.\n`);
    return;
  }

  if (byType) {
    const grouped = {};
    for (const r of results) {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push(r);
    }

    console.log(`  ${results.length} file(s) referencing "${version}":\n`);

    for (const cat of CATEGORY_ORDER) {
      const items = grouped[cat];
      if (!items || items.length === 0) continue;
      const label = CATEGORY_LABELS[cat] || cat;
      console.log(`  ${label}  (${items.length})`);
      for (const item of items) {
        const refSummary = item.refs.map(r => `${r.field}=${r.value}`).join(', ');
        console.log(`    \u00B7 ${item.file}`);
        if (refSummary) console.log(`      \u2192 ${refSummary}`);
      }
      console.log();
    }
  } else {
    console.log(`  ${results.length} file(s) referencing "${version}":\n`);
    for (const item of results) {
      const refSummary = item.refs.map(r => `${r.field}=${r.value}`).join(', ');
      console.log(`  \u00B7 ${item.file}`);
      if (refSummary) console.log(`    ${refSummary}`);
    }
    console.log();
  }
}

function printInventory(versionMap) {
  const sorted = [...versionMap.entries()].sort((a, b) => {
    const aParts = a[0].replace('V_', '').split('-').map(Number);
    const bParts = b[0].replace('V_', '').split('-').map(Number);
    for (let i = 0; i < 3; i++) {
      if (aParts[i] !== bParts[i]) return bParts[i] - aParts[i];
    }
    return 0;
  });

  console.log('  Spec Version Inventory\n');
  for (const [ver, files] of sorted) {
    console.log(`  ${ver}  \u2014  ${files.length} file(s)`);
    for (const f of files.slice(0, 15)) {
      console.log(`    \u00B7 ${f}`);
    }
    if (files.length > 15) console.log(`    \u2026 and ${files.length - 15} more`);
    console.log();
  }
  console.log(`  Total: ${sorted.length} unique spec versions across the repo.\n`);
}

// ── CLI ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let version = null;
  let byType = false;
  let checkMode = false;
  let inventory = false;
  let includeArchives = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--version': version = args[++i]; break;
      case '--by-type': byType = true; break;
      case '--check': checkMode = true; break;
      case '--inventory': inventory = true; break;
      case '--include-archives': includeArchives = true; break;
    }
  }
  return { version, byType, checkMode, inventory, includeArchives };
}

function main() {
  const { version, byType, checkMode, inventory, includeArchives } = parseArgs();

  const allFiles = collectFiles(ROOT, includeArchives)
    .filter(f => f.endsWith('.md') || f.endsWith('.ts') || f.endsWith('.tsx'));

  if (inventory) {
    const versionMap = categorizeByVersion(allFiles);
    printInventory(versionMap);
    process.exit(0);
  }

  if (!version) {
    console.error('Required: --version V_x-y-z  or  --inventory');
    console.error('  e.g.  node scripts/check-spec-version.mjs --version V_0-1-2');
    process.exit(1);
  }

  if (!/^V_\d+-\d+-\d+$/.test(version)) {
    console.error(`Invalid version format: "${version}". Use V_x-y-z (e.g. V_0-1-2).`);
    process.exit(1);
  }

  const results = scanForVersion(version, allFiles);
  printResults(results, byType, version);

  if (checkMode && results.length > 0) {
    process.exit(1);
  }
}

main();
