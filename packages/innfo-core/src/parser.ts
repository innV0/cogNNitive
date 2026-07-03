import {
  SpecFrontmatter, ParsedModel, ElementNode, MatrixData, MatrixCell,
  TaxonomyEdge, ConceptType, ElementsMap, TreeNode, Relationship, AnalysisEntry
} from './types';

const YAML_BLOCK_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const SECTION_RE = /^#\s+(.*)$/gm;
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;
const INDEX_NN_RE = /_NN\s+index:\s*(.*)$/;
const YAML_FENCE_RE = /```yaml\n([\s\S]*?)```/;

/* ── Slug derivation (FR-002) ── */

/**
 * Derive a URL-safe slug from a name string:
 * - strip accents/diacritics
 * - lowercase
 * - replace spaces with hyphens
 * - remove non-alphanumeric characters except hyphens
 * - collapse multiple hyphens
 * - trim leading/trailing hyphens
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')              // spaces → hyphens
    .replace(/[^a-z0-9-]/g, '')        // remove non-alphanumeric except hyphens
    .replace(/-+/g, '-')               // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');          // trim leading/trailing hyphens
}

/** Normalize CRLF (and legacy CR) line endings to LF.
 *  Called once at every public parse entry point so downstream regexes and
 *  `split('\n')` calls never see a trailing `\r`, which breaks `$`-anchored
 *  patterns (e.g. element/index bullet markers) on CRLF-saved files. */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

/* ── Marker patterns (_NN syntax only, V_0-2-0+) ── */

// Section-level markers: `# _NN ConceptName` or `# _NN matrices: name`
const NN_SECTION_RE = /^#\s+_NN\s+(?:(matrices):\s*(.*)|(.*))/m;

// Element-level markers: `* _NN Concept: Name`
const NN_ELEMENT_RE = /^\s*[*\-]\s+_NN\s+([\w\s-]+?):\s+(.*)$/;

function isIndexSection(rawTitle: string): boolean {
  return sectionName(rawTitle) === 'concepts' && sectionTitle(rawTitle).toLowerCase() === 'index';
}

function sectionName(rawTitle: string): string | null {
  // _NN syntax: `_NN ConceptName` or `_NN matrices: Name`
  const fm = rawTitle.match(/^_NN\s+(?:(matrices):\s*(.*)|(.*))/);
  if (fm) {
    if (fm[1]) return fm[1]; // 'matrices'
    if (fm[3] != null) return 'concepts'; // implicit 'concepts' for bare ConceptName
  }
  return null;
}

function sectionTitle(rawTitle: string): string {
  // _NN syntax: `_NN ConceptName` or `_NN matrices: Name`
  const fm = rawTitle.match(/^_NN\s+(?:(matrices):\s*(.*)|(.*))/);
  if (fm) {
    if (fm[2]) return fm[2].trim(); // matrix name
    if (fm[3] != null) return fm[3].trim(); // concept name
  }
  return rawTitle;
}

export function parseYaml(yamlStr: string): Record<string, unknown> {
  const lines = yamlStr.split(/\r?\n/);
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; key: string | null; data: Record<string, unknown> | unknown[]; type: 'object' | 'array' }> = [
    { indent: -1, key: null, data: root, type: 'object' }
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = line.search(/\S/);
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];

    if (trimmed.startsWith('-')) {
      const rest = trimmed.substring(1).trim();
      if (parent.type !== 'array') {
        if (parent.key && stack.length >= 2) {
          const gp = stack[stack.length - 2];
          (gp.data as Record<string, unknown>)[parent.key] = [];
          parent.data = (gp.data as Record<string, unknown>)[parent.key] as unknown[];
          parent.type = 'array';
        }
      }
      if (rest === '') {
        const obj: any = {};
        (parent.data as unknown[]).push(obj);
        stack.push({ indent, key: null, data: obj, type: 'object' });
      } else {
        const ci = rest.indexOf(':');
        if (ci !== -1) {
          const k = rest.substring(0, ci).trim();
          const v = parseYamlValue(rest.substring(ci + 1).trim());
          const obj = { [k]: v };
          (parent.data as unknown[]).push(obj);
          stack.push({ indent, key: k, data: obj, type: 'object' });
        } else {
          (parent.data as unknown[]).push(parseYamlValue(rest));
        }
      }
    } else {
      const ci = trimmed.indexOf(':');
      if (ci === -1) continue;
      const key = trimmed.substring(0, ci).trim();
      const valStr = trimmed.substring(ci + 1).trim();
      if (valStr === '') {
        (parent.data as Record<string, unknown>)[key] = {};
        stack.push({ indent, key, data: (parent.data as Record<string, unknown>)[key] as Record<string, unknown>, type: 'object' });
      } else {
        (parent.data as Record<string, unknown>)[key] = parseYamlValue(valStr);
      }
    }
  }
  return root;
}

function parseYamlValue(v: string): string | number | boolean | null | unknown[] {
  v = v.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map(s => parseYamlValue(s.trim()));
  }
  if (v.includes('#') && !v.startsWith('"') && !v.startsWith("'")) v = v.split('#')[0].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v.toLowerCase() === 'null') return null;
  if (v.toLowerCase() === 'true') return true;
  if (v.toLowerCase() === 'false') return false;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  if (/^\d+\.\d+$/.test(v)) return parseFloat(v);
  return v;
}

export function parseFrontmatter(content: string): SpecFrontmatter | null {
  const match = normalizeLineEndings(content).match(YAML_BLOCK_RE);
  if (!match) return null;
  const parsed = parseYaml(match[1]);
  // Normalize legacy parent → parent_spec (defiNNe V_0-1-0 era)
  if ((parsed as any).parent && !(parsed as any).parent_spec) {
    (parsed as any).parent_spec = (parsed as any).parent;
    delete (parsed as any).parent;
  }
  return parsed as SpecFrontmatter;
}

export function parseMarkdownTable(md: string): Record<string, string>[] {
  const lines = normalizeLineEndings(md).split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return [];
  const header = parseTableRow(lines[0]);
  if (lines.length < 3) return [];
  return lines.slice(2).map(line => {
    const cells = parseTableRow(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

function parseTableRow(line: string): string[] {
  return line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim());
}

export function parseIndexBlock(content: string): TaxonomyEdge[] {
  const edges: TaxonomyEdge[] = [];
  const lines = normalizeLineEndings(content).split('\n');
  const stack: Array<{ name: string; depth: number }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('*') && !trimmed.startsWith('-')) continue;
    const depth = line.search(/\S/) / 2;

    // Support both [[wikilinks]] and _NN index: Name syntax
    let name: string | null = null;
    const wikiMatch = trimmed.match(WIKILINK_RE);
    if (wikiMatch) {
      name = wikiMatch[0].slice(2, -2);
    } else {
      const fMatch = trimmed.match(INDEX_NN_RE);
      if (fMatch) {
        name = fMatch[1].trim();
      }
    }
    if (!name) continue;

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();

    if (stack.length > 0 && depth > (stack[stack.length - 1].depth ?? -1)) {
      edges.push({ parent: stack[stack.length - 1].name, child: name });
    }
    stack.push({ name, depth });
  }
  return edges;
}

function parseFencedYaml(text: string): Record<string, unknown> {
  const match = text.match(YAML_FENCE_RE);
  if (!match) return {};
  return parseYaml(match[1]) as Record<string, unknown>;
}

function parseElementMarker(line: string): string | null {
  const match = line.match(NN_ELEMENT_RE);
  if (match) return match[2].trim();
  return null;
}

function parseConceptSection(conceptName: string, content: string): ElementNode[] {
  const nodes: ElementNode[] = [];
  const lines = content.split('\n');
  let current: ElementNode | null = null;
  let descriptionLines: string[] = [];
  let yamlBuffer: string[] = [];
  let inYaml = false;

  for (const line of lines) {
    const elemName = parseElementMarker(line);
    if (elemName !== null) {
      if (current) {
        current.description = descriptionLines.join('\n').trim();
        nodes.push(current);
      }
      current = { type: conceptName, name: elemName, description: '', fields: {}, markers: {} };
      descriptionLines = [];
      inYaml = false;
      continue;
    }

    if (line.trim().startsWith('```yaml')) {
      inYaml = true;
      yamlBuffer = [];
      continue;
    }
    if (inYaml) {
      if (line.trim() === '```') {
        inYaml = false;
        if (current) {
          current.fields = parseYaml(yamlBuffer.join('\n')) as Record<string, unknown>;
          // Extract slug from fields if present (FR-002)
          if (typeof current.fields['slug'] === 'string') {
            current.slug = current.fields['slug'] as string;
            delete current.fields['slug'];
          }
        }
        continue;
      }
      yamlBuffer.push(line);
      continue;
    }

    if (!line.trim().startsWith('*') && !line.trim().startsWith('-')) {
      descriptionLines.push(line);
    }
  }

  if (current) {
    current.description = descriptionLines.join('\n').trim();
    nodes.push(current);
  }

  return nodes;
}

/**
 * Derive slugs for all elements that don't have one, and detect collisions.
 * Called after all sections are parsed, once all elements are known.
 * Returns aggregated collisions keyed by slug.
 */
export function deriveElementSlugs(elements: ElementsMap): Array<{ slug: string; elements: string[]; concept: string }> {
  const usedSlugs = new Map<string, { name: string; concept: string }>();
  const colliding = new Map<string, { elements: Set<string>; concept: string }>();

  for (const [conceptName, elementNodes] of elements.entries()) {
    for (const el of elementNodes) {
      if (el.slug === undefined) {
        el.slug = slugify(el.name);
      }
      const existing = usedSlugs.get(el.slug!);
      if (existing) {
        if (!colliding.has(el.slug!)) {
          const set = new Set<string>([existing.name, el.name]);
          colliding.set(el.slug!, { elements: set, concept: conceptName });
        } else {
          colliding.get(el.slug!)!.elements.add(el.name);
        }
      } else {
        usedSlugs.set(el.slug!, { name: el.name, concept: conceptName });
      }
    }
  }

  return Array.from(colliding.entries()).map(([slug, info]) => ({
    slug,
    elements: Array.from(info.elements),
    concept: info.concept,
  }));
}

function parseMatrixSection(content: string, matrixName: string): MatrixCell[] {
  const rows = parseMarkdownTable(content);
  if (rows.length === 0) return [];
  const colNames = Object.keys(rows[0] || {});
  const cells: MatrixCell[] = [];
  for (const row of rows) {
    const rowName = colNames.length > 0 ? (row[colNames[0]] || '') : '';
    for (let i = 1; i < colNames.length; i++) {
      if (row[colNames[i]]) {
        cells.push({ row: rowName, col: colNames[i], value: row[colNames[i]] });
      }
    }
  }
  return cells;
}

export function getSectionType(rawTitle: string): 'index' | 'concept' | 'matrix' | 'other' {
  const sn = sectionName(rawTitle);
  if (!sn) return 'other';
  const s = sn.toLowerCase();
  if (s === 'concepts') {
    const name = sectionTitle(rawTitle).toLowerCase();
    if (name === 'index') return 'index';
    return 'concept';
  }
  if (s === 'matrices') return 'matrix';
  return 'other';
}

export function parseModel(content: string): ParsedModel {
  const normalizedContent = normalizeLineEndings(content);
  const frontmatter = parseFrontmatter(normalizedContent);
  const elements = new ElementsMap();
  const matrices: MatrixData[] = [];
  const nodeMarkers: Record<string, Record<string, number | string>> = {};
  let taxonomy: TaxonomyEdge[] = [];

  const body = normalizedContent.replace(YAML_BLOCK_RE, '').trim();
  const sections = body.split(/(?=^#\s)/m);

  for (const section of sections) {
    const headerMatch = section.match(/^#\s+(.*)$/m);
    if (!headerMatch) continue;
    const rawTitle = headerMatch[1].trim();
    const type = getSectionType(rawTitle);
    const name = sectionTitle(rawTitle);
    const bodyContent = section.replace(/^#\s+.*$/m, '').trim();

    if (type === 'index') {
      taxonomy = parseIndexBlock(bodyContent);
    } else if (type === 'concept') {
      const conceptElements = parseConceptSection(name, bodyContent);
      if (conceptElements.length > 0) {
        elements.set(name, conceptElements);
      }
    } else if (type === 'matrix') {
      if (name.toLowerCase() === 'item-markers matrix') {
        const rows = parseMarkdownTable(bodyContent);
        for (const row of rows) {
          const keys = Object.keys(row);
          if (keys.length > 0) {
            const itemName = row[keys[0]];
            if (itemName) {
              nodeMarkers[itemName] = {};
              for (let i = 1; i < keys.length; i++) {
                if (row[keys[i]] && row[keys[i]] !== '-') {
                  nodeMarkers[itemName][keys[i]] = isNaN(Number(row[keys[i]])) ? row[keys[i]] : Number(row[keys[i]]);
                }
              }
            }
          }
        }
      } else {
        const matrixDecl = frontmatter?.matrices?.find(m => m.name.toLowerCase() === name.toLowerCase());
        const cells = parseMatrixSection(bodyContent, name);
        matrices.push({
          name,
          source: matrixDecl?.source ?? '',
          target: matrixDecl?.target ?? '',
          cells
        });
      }
    }
  }

  // Derive slugs and detect collisions (FR-002)
  const collisions = deriveElementSlugs(elements);
  const slugCollisions = collisions.length > 0
    ? collisions.map(c => ({ slug: c.slug, elements: c.elements, concept: c.concept }))
    : undefined;

  // FR-007: Warn about deprecated FOLDER mode
  const parseWarnings: string[] = [];
  if (frontmatter?.mode === 'FOLDER') {
    parseWarnings.push('FOLDER mode is removed in V_0-1-3. Use index.md-based workspace with single-file models.');
  }

  return {
    frontmatter: frontmatter ?? {} as SpecFrontmatter,
    taxonomy, elements, matrices, nodeMarkers,
    slugCollisions,
    parseWarnings: parseWarnings.length > 0 ? parseWarnings : undefined,
    rawContent: content,
  };
}

export function serializeModel(model: ParsedModel): string {
  const lines: string[] = [];
  const fm = model.frontmatter;
  lines.push('---');
  lines.push(`spec_version: "${fm.spec_version || 'V_0-2-0'}"`);
  if (fm.spec_url) lines.push(`spec_url: "${fm.spec_url}"`);
  if (fm.level !== undefined) lines.push(`level: ${fm.level}`);
  if (fm.parent_spec) {
    lines.push('parent_spec:');
    lines.push(`  name: "${fm.parent_spec.name}"`);
    lines.push(`  url: "${fm.parent_spec.url}"`);
  }
  if (fm.model_version) lines.push(`model_version: "${fm.model_version}"`);
  if (fm.title) lines.push(`title: "${fm.title}"`);
  if (fm.mode) lines.push(`mode: "${fm.mode}"`);

  // Matrix declarations
  const matrices = fm.matrices as Array<{ name: string; source: string; target: string; params: string }> | undefined;
  if (matrices && matrices.length > 0) {
    lines.push('matrices:');
    for (const m of matrices) {
      lines.push(`  - name: "${m.name}"`);
      lines.push(`    source: "${m.source}"`);
      lines.push(`    target: "${m.target}"`);
      if (m.params) lines.push(`    params: "${m.params}"`);
    }
  }

  // Concept declarations (level-2 templates)
  if (fm.concepts && fm.concepts.length > 0) {
    lines.push('concepts:');
    for (const c of fm.concepts) {
      lines.push(`  - name: "${c.name}"`);
      if (c.icon) lines.push(`    icon: "${c.icon}"`);
      if (c.type) lines.push(`    type: "${c.type}"`);
      if (c.color) lines.push(`    color: "${c.color}"`);
      if (c.weight !== undefined) lines.push(`    weight: ${c.weight}`);
    }
  }

  // Marker declarations (level-2 templates)
  if (fm.markers && fm.markers.length > 0) {
    lines.push('markers:');
    for (const m of fm.markers) {
      lines.push(`  - name: "${m.name}"`);
      if (m.symbol) lines.push(`    symbol: "${m.symbol}"`);
      if (m.icon) lines.push(`    icon: "${m.icon}"`);
      if (m.color) lines.push(`    color: "${m.color}"`);
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('> [!NOTE]');
  lines.push('> This is an **iNNfo document** — a plain-text Markdown file that carries its own schema in the YAML frontmatter.');
  lines.push('');

  if (model.taxonomy.length > 0) {
    lines.push('# _NN index');
    const allParents = new Set(model.taxonomy.map(e => e.parent));
    const allChildren = new Set(model.taxonomy.map(e => e.child));
    const rootNames = [...allParents].filter(p => !allChildren.has(p));
    for (const rootName of rootNames) {
      printTaxonomyNode(rootName, model.taxonomy, lines, 0);
    }
    lines.push('');
  }

  for (const [conceptName, elementNodes] of model.elements.entries()) {
    lines.push(`# _NN ${conceptName}`);
    for (const node of elementNodes) {
      const prefix = '*'; // all concept types use bullet syntax — numbered lists are not supported
      lines.push(`${prefix} _NN ${conceptName}: ${node.name}`);
      if (Object.keys(node.fields).length > 0) {
        lines.push('  ```yaml');
        for (const [k, v] of Object.entries(node.fields)) {
          lines.push(`  ${k}: ${JSON.stringify(v)}`);
        }
        lines.push('  ```');
      }
      if (node.description) {
        for (const descLine of node.description.split('\n')) {
          lines.push(`  ${descLine}`);
        }
      }
    }
    lines.push('');
  }

  for (const matrix of model.matrices) {
    if (matrix.cells.length === 0) continue;
    lines.push(`# _NN matrices: ${matrix.name}`);
    const colSet = new Set(matrix.cells.map(c => c.col));
    const rowSet = new Set(matrix.cells.map(c => c.row));
    const cols = Array.from(colSet);
    const rows = Array.from(rowSet);
    const cellMap = new Map(matrix.cells.map(c => [`${c.row}||${c.col}`, c.value]));

    const headerLine = `| ${matrix.source} \\ ${matrix.target} | ${cols.join(' | ')} |`;
    const sepLine = `| :--- | ${cols.map(() => ':---:').join(' | ')} |`;
    lines.push(headerLine);
    lines.push(sepLine);
    for (const row of rows) {
      const vals = cols.map(c => cellMap.get(`${row}||${c}`) || '-');
      lines.push(`| ${row} | ${vals.join(' | ')} |`);
    }
    lines.push('');
  }

  // Node markers (item-markers matrix)
  const nodeMarkerEntries = Object.entries(model.nodeMarkers);
  if (nodeMarkerEntries.length > 0) {
    lines.push('# _NN matrices: item-markers matrix');
    // Collect all unique marker keys
    const markerKeys = new Set<string>();
    for (const [, markers] of nodeMarkerEntries) {
      for (const key of Object.keys(markers)) {
        markerKeys.add(key);
      }
    }
    const keys = Array.from(markerKeys);
    const headerLine = `| Item \\ Marker | ${keys.join(' | ')} |`;
    const sepLine = `| :--- | ${keys.map(() => ':---:').join(' | ')} |`;
    lines.push(headerLine);
    lines.push(sepLine);
    for (const [itemName, markers] of nodeMarkerEntries) {
      const vals = keys.map(k => markers[k] !== undefined ? String(markers[k]) : '-');
      lines.push(`| ${itemName} | ${vals.join(' | ')} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function printTaxonomyNode(name: string, allEdges: TaxonomyEdge[], lines: string[], depth: number): void {
  const indent = '  '.repeat(depth);
  lines.push(`${indent}* [[${name}]]`);
  const children = allEdges.filter(e => e.parent === name);
  for (const child of children) {
    printTaxonomyNode(child.child, allEdges, lines, depth + 1);
  }
}

/* ── Extended parsing: tree, relationships, analysis ── */

/** Build a hierarchical tree from taxonomy + elements + hierarchy matrices.
 *  Hierarchy matrices are matrices named like `{src}-{tgt} hierarchy matrix`.
 *  Elements with concept types that appear in the taxonomy chain are placed at the correct depth. */
export function buildHierarchyTree(
  taxonomy: TaxonomyEdge[],
  elements: ElementsMap,
  matrices: MatrixData[],
): TreeNode[] {
  const roots: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Build flat node list from elements
  for (const [conceptName, elementNodes] of elements.entries()) {
    for (const en of elementNodes) {
      const id = en.name.toLowerCase().replace(/\s+/g, '-');
      nodeMap.set(id, {
        id,
        name: en.name,
        type: en.type,
        description: en.description,
        fields: en.fields,
        markers: en.markers,
        children: [],
      });
    }
  }

  // Apply taxonomy edges
  for (const edge of taxonomy) {
    const parentId = edge.parent.toLowerCase().replace(/\s+/g, '-');
    const childId = edge.child.toLowerCase().replace(/\s+/g, '-');
    const parent = nodeMap.get(parentId);
    const child = nodeMap.get(childId);
    if (parent && child) {
      parent.children.push(child);
    }
  }

  // Apply hierarchy matrices: rows marked with 'X' become parent→child
  for (const matrix of matrices) {
    const mn = matrix.name.toLowerCase();
    if (mn.includes('hierarchy matrix') || mn.includes('jerarqu')) {
      for (const cell of matrix.cells) {
        if (cell.value.toLowerCase() === 'x') {
          const parentId = cell.col.toLowerCase().replace(/\s+/g, '-');
          const childId = cell.row.toLowerCase().replace(/\s+/g, '-');
          const parent = nodeMap.get(parentId);
          const child = nodeMap.get(childId);
          if (parent && child && !parent.children.includes(child)) {
            parent.children.push(child);
          }
        }
      }
    }
  }

  // Collect roots (nodes that are not children of any other node)
  const allChildren = new Set<string>();
  for (const [id, node] of nodeMap) {
    for (const child of node.children) {
      allChildren.add(child.id);
    }
  }
  for (const [id, node] of nodeMap) {
    if (!allChildren.has(id)) {
      roots.push(node);
    }
  }

  // Return taxonomy-edge roots if the tree is empty
  if (roots.length === 0 && taxonomy.length > 0) {
    const rootNames = taxonomy
      .filter(e => !taxonomy.some(p => p.child === e.parent))
      .map(e => e.parent);
    for (const name of rootNames) {
      const id = name.toLowerCase().replace(/\s+/g, '-');
      if (nodeMap.has(id)) roots.push(nodeMap.get(id)!);
    }
  }

  return roots;
}

/** Extract relationships from graph_edges frontmatter and wikilinks in element descriptions. */
export function extractRelationships(
  frontmatter: SpecFrontmatter,
  elements: ElementsMap,
): Relationship[] {
  const rels: Relationship[] = [];

  // From frontmatter graph_edges
  const graphEdges = frontmatter.graph_edges as Array<{ target: string; label: string; weight?: number }> | undefined;
  if (graphEdges) {
    for (const edge of graphEdges) {
      rels.push({
        sourceId: frontmatter.title ?? '',
        targetId: edge.target,
        label: edge.label,
        value: edge.weight,
      });
    }
  }

  // From wikilinks in element descriptions and names
  for (const [conceptName, elementNodes] of elements.entries()) {
    for (const el of elementNodes) {
      const sourceId = el.name;
      const textToScan = el.name + ' ' + el.description;
      const matches = textToScan.match(WIKILINK_RE);
      if (matches) {
        for (const m of matches) {
          const target = m.slice(2, -2);
          if (target !== el.name) {
            rels.push({ sourceId, targetId: target, label: 'references' });
          }
        }
      }
      // Also scan fields for wikilinks
      for (const [, v] of Object.entries(el.fields)) {
        if (typeof v === 'string' && v.includes('[[')) {
          const fm = v.match(WIKILINK_RE);
          if (fm) {
            for (const m of fm) {
              const target = m.slice(2, -2);
              rels.push({ sourceId, targetId: target, label: 'references' });
            }
          }
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return rels.filter(r => {
    const key = `${r.sourceId}||${r.targetId}||${r.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Parse an Analysis Evaluations section from raw body content.
 *  Detects sections titled "Analysis" or "Evaluation" and extracts structured entries. */
export function extractAnalysis(rawContent: string): AnalysisEntry[] {
  const content = normalizeLineEndings(rawContent);
  const entries: AnalysisEntry[] = [];
  // Look for analysis/evaluation sections
  const sectionRe = /^#\s+(.*an?lisis|.*evaluation|.*analysis)(.*)$/im;
  const match = content.match(sectionRe);
  if (!match) return entries;

  const afterHeader = content.slice(match.index! + match[0].length);
  const sectionBody = afterHeader.split(/(?=^#\s)/m)[0] || afterHeader;

  // Parse table or bullet-list entries
  const tableRows = parseMarkdownTable(sectionBody);
  if (tableRows.length > 0) {
    for (const row of tableRows) {
      const keys = Object.keys(row);
      if (keys.length >= 4) {
        entries.push({
          timestamp: row[keys[0]] || '',
          evaluator: row[keys[1]] || '',
          evaluatorType: (row[keys[2]] || '').toLowerCase().includes('ai') ? 'ai' : 'human',
          score: Number(row[keys[3]]) || 0,
          comment: row[keys[4]] || '',
        });
      }
    }
  } else {
    // Try bullet list format: `- **Evaluator**: score — comment`
    const bulletRe = /^\s*[*\-]\s+\*\*(.+?)\*\*:\s*(\d+(?:\.\d+)?)\s*[—–-]+\s*(.+)$/gm;
    let bm: RegExpExecArray | null;
    while ((bm = bulletRe.exec(sectionBody)) !== null) {
      entries.push({
        timestamp: '',
        evaluator: bm[1].trim(),
        evaluatorType: 'human',
        score: Number(bm[2]),
        comment: bm[3].trim(),
      });
    }
  }

  return entries;
}
