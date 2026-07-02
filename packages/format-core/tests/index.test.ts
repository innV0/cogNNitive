import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseModel, parseFrontmatter, parseIndexBlock, parseMarkdownTable, validateModel, buildHierarchyTree, extractRelationships, extractAnalysis, slugify, deriveElementSlugs } from '../src/index';

const specsDir = join(import.meta.dirname!, '..', '..', '..', 'specs');
const archiveDir = join(import.meta.dirname!, '..', '..', '..', 'archive', 'specs');
const modelsDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'business_V_0-1-1', 'samples');

function readSpec(name: string): string {
  return readFileSync(join(specsDir, name), 'utf-8');
}
function readArchiveSpec(name: string): string {
  return readFileSync(join(archiveDir, name), 'utf-8');
}
function readModel(name: string): string {
  return readFileSync(join(modelsDir, name), 'utf-8');
}

describe('defiNNe (level 0)', () => {
  const content = readSpec('defiNNe_V_0-1-0_FORMAT.md');
  const fm = parseFrontmatter(content)!;

  it('parses frontmatter', () => {
    expect(fm.level).toBe(0);
    expect(fm.specification_version).toBe('V_0-1-0');
    expect(fm.parent).toBeUndefined();
    expect(fm.title).toContain('defiNNe');
  });
});

describe('FORMAT (level 1)', () => {
  const content = readArchiveSpec('FORMAT_V_0-1-0_FORMAT.md');
  const fm = parseFrontmatter(content)!;

  it('parses frontmatter', () => {
    expect(fm.level).toBe(1);
    expect(fm.parent).toBeDefined();
    expect(fm.parent!.name).toBe('defiNNe_V_0-1-0');
    expect(fm.modes).toEqual(['FILE', 'FOLDER']);
    expect(fm.relationship_types).toHaveLength(4);
  });
});

describe('business template (level 2)', () => {
  const content = readSpec('business_V_0-1-1_FORMAT.md');
  const fm = parseFrontmatter(content)!;

  it('parses frontmatter', () => {
    expect(fm.level).toBe(2);
    expect(fm.parent!.name).toBe('FORMAT_V_0-1-1');
    expect(fm.mode).toBe('FILE');
    expect(fm.concepts).toBeDefined();
    expect(fm.concepts!.length).toBeGreaterThan(60);
    expect(fm.markers).toBeDefined();
    expect(fm.markers!.length).toBe(5);
    expect(fm.matrices).toBeDefined();
    expect(fm.matrices!.length).toBeGreaterThan(10);
  });

  it('has relationship_declarations', () => {
    expect(fm.relationship_declarations).toBeDefined();
    expect(fm.relationship_declarations!.evaluable_matrix?.enabled).toBe(true);
    expect(fm.relationship_declarations!.graph_edge?.enabled).toBe(false);
  });
});

describe('Ghostbusters model (level 3)', () => {
  const content = readModel('Ghostbusters_V_0-1-2_business_FORMAT.md');
  const model = parseModel(content);
  const fm = model.frontmatter;

  it('parses frontmatter', () => {
    expect(fm.level).toBe(3);
    expect(fm.parent!.name).toBe('business_V_0-1-1');
    expect(fm.model_version).toBe('V_0-1-2');
    expect(fm.mode).toBe('FILE');
  });

  it('parses taxonomy from index block', () => {
    expect(model.taxonomy.length).toBeGreaterThan(20);
    const marketChild = model.taxonomy.find(e => e.parent === 'Market');
    expect(marketChild).toBeDefined();
    expect(marketChild!.child).toBe('Segments');
  });

  it('parses concept elements', () => {
    expect(model.elements.has('Stakeholders')).toBe(true);
    expect(model.elements.has('Problems')).toBe(true);
    expect(model.elements.has('Value propositions')).toBe(true);

    const stakeholders = model.elements.get('Stakeholders')!;
    expect(stakeholders.length).toBeGreaterThanOrEqual(7);
    expect(stakeholders[0].name).toContain('Ghostbusters Founders');
    expect(stakeholders[0].type).toBe('Stakeholders');
  });

  it('parses matrix values', () => {
    expect(model.matrices.length).toBeGreaterThanOrEqual(1);
    const vpMatrix = model.matrices.find(m => m.name.toLowerCase().includes('problems-value'));
    expect(vpMatrix).toBeDefined();
    expect(vpMatrix!.cells.length).toBeGreaterThan(0);
    expect(vpMatrix!.cells[0].value).toBeTruthy();
  });

  it('parses item-markers matrix into nodeMarkers', () => {
    expect(Object.keys(model.nodeMarkers).length).toBeGreaterThan(0);
    expect(model.nodeMarkers['Paranormal Infestation']).toBeDefined();
    expect(model.nodeMarkers['Paranormal Infestation'].weight).toBe(9);
  });

  it('serializes and re-parses correctly', async () => {
    const { serializeModel } = await import('../src/index');
    const serialized = serializeModel(model);
    expect(serialized).toContain('specification_version: "V_0-1-2"');
    expect(serialized).toContain('# _F Stakeholders');
    expect(serialized).toContain('# _F matrices: problems-value propositions matrix');
    expect(serialized).toContain('* _F Stakeholders:');
  });

  it('serializes and re-parses preserving full structure', async () => {
    const { serializeModel, parseModel } = await import('../src/index');
    const serialized = serializeModel(model);
    const reparsed = parseModel(serialized);

    // Frontmatter
    expect(reparsed.frontmatter.title).toBe(model.frontmatter.title);
    expect(reparsed.frontmatter.level).toBe(model.frontmatter.level);
    expect(reparsed.frontmatter.mode).toBe(model.frontmatter.mode);
    expect(reparsed.frontmatter.model_version).toBe(model.frontmatter.model_version);

    // Matrix declarations (round-trip critical)
    expect(reparsed.matrices.length).toBe(model.matrices.length);
    if (model.matrices.length > 0) {
      expect(reparsed.matrices[0].name).toBe(model.matrices[0].name);
      expect(reparsed.matrices[0].source).toBe(model.matrices[0].source);
      expect(reparsed.matrices[0].cells.length).toBe(model.matrices[0].cells.length);
    }

    // Node markers
    expect(Object.keys(reparsed.nodeMarkers).length)
      .toBe(Object.keys(model.nodeMarkers).length);

    // Elements preserved
    expect(reparsed.elements.size).toBe(model.elements.size);
    for (const [key] of model.elements.entries()) {
      expect(reparsed.elements.has(key)).toBe(true);
      const origNodes = model.elements.get(key)!;
      const reparsedNodes = reparsed.elements.get(key)!;
      expect(reparsedNodes.length).toBe(origNodes.length);
    }

    // Taxonomy preserved
    expect(reparsed.taxonomy.length).toBe(model.taxonomy.length);
  });
});

describe('procedures template (level 2)', () => {
  const content = readSpec('procedures_V_0-1-1_FORMAT.md');
  const fm = parseFrontmatter(content)!;

  it('parses frontmatter', () => {
    expect(fm.level).toBe(2);
    expect(fm.parent!.name).toBe('FORMAT_V_0-1-1');
    expect(fm.mode).toBe('FILE');
    expect(fm.concepts).toHaveLength(7);
    expect(fm.markers).toHaveLength(1);
    expect(fm.matrices).toHaveLength(6);
  });
});

describe('kb template (level 2, FOLDER mode)', () => {
  const content = readSpec('kb_V_0-1-1_FORMAT.md');
  const fm = parseFrontmatter(content)!;

  it('parses frontmatter', () => {
    expect(fm.level).toBe(2);
    expect(fm.parent!.name).toBe('FORMAT_V_0-1-1');
    expect(fm.mode).toBe('FOLDER');
    expect(fm.concepts).toHaveLength(3);
    expect(fm.relationship_declarations?.hierarchy?.enabled).toBe(true);
    expect(fm.relationship_declarations?.graph_edge?.enabled).toBe(true);
  });
});

describe('validator', () => {
  it('validates Ghostbusters against business template', () => {
    const modelContent = readModel('Ghostbusters_V_0-1-2_business_FORMAT.md');
    const templateContent = readSpec('business_V_0-1-1_FORMAT.md');
    const model = parseModel(modelContent);
    const templateFm = parseFrontmatter(templateContent)!;

    const result = validateModel(model, {
      name: 'business_V_0-1-1',
      level: 2,
      parentName: 'FORMAT_V_0-1-1',
      frontmatter: templateFm,
      rawContent: templateContent,
    }, null);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects model with unknown concept', () => {
    const modelContent = readModel('Ghostbusters_V_0-1-2_business_FORMAT.md');
    const templateContent = readSpec('business_V_0-1-1_FORMAT.md');
    const model = parseModel(modelContent);
    const templateFm = parseFrontmatter(templateContent)!;

    model.elements.set('NonExistentConcept', [{ type: 'NonExistentConcept', name: 'Test', description: '', fields: {}, markers: {} }]);

    const result = validateModel(model, {
      name: 'business_V_0-1-1',
      level: 2,
      parentName: 'FORMAT_V_0-1-1',
      frontmatter: templateFm,
      rawContent: templateContent,
    }, null);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('NonExistentConcept'))).toBe(true);
  });
});

describe('CRLF line-ending handling', () => {
  it('parses a CRLF-encoded model with the same fidelity as LF', () => {
    const lfContent = [
      '---',
      'specification_version: "V_0-1-1"',
      'level: 3',
      'model_version: "V_0-1-1"',
      'title: "CRLF fixture"',
      'mode: "FILE"',
      '---',
      '',
      '# _F index',
      '',
      '* _F index: Parent',
      '  * _F index: Child',
      '',
      '# _F Stakeholders',
      '* _F Stakeholders: First Stakeholder',
      '  Description text for the stakeholder.',
      '* _F Stakeholders: Second Stakeholder',
      '  Another description.',
      '',
    ].join('\n');
    const crlfContent = lfContent.replace(/\n/g, '\r\n');

    const lfModel = parseModel(lfContent);
    const crlfModel = parseModel(crlfContent);

    expect(crlfModel.taxonomy.length).toBe(lfModel.taxonomy.length);
    expect(crlfModel.taxonomy.length).toBeGreaterThan(0);

    expect(crlfModel.elements.has('Stakeholders')).toBe(true);
    expect(crlfModel.elements.get('Stakeholders')!.length).toBe(2);
    expect(crlfModel.elements.get('Stakeholders')![0].name).toBe('First Stakeholder');
    expect(crlfModel.elements.get('Stakeholders')![0].description).toBe('Description text for the stakeholder.');

    expect(crlfModel.elements.size).toBe(lfModel.elements.size);
  });

  it('parses the real Ghostbusters sample model with full fidelity', () => {
    const content = readModel('Ghostbusters_V_0-1-2_business_FORMAT.md');
    // The sample may be LF or CRLF depending on the platform — either should parse
    const normalized = content.replace(/\r\n/g, '\n');

    const model = parseModel(normalized);

    // Taxonomy: the index block declares ~30+ nested bullets.
    expect(model.taxonomy.length).toBeGreaterThan(20);

    // Elements: multiple concept sections, not just the first one.
    expect(model.elements.size).toBeGreaterThan(5);
    expect(model.elements.has('Stakeholders')).toBe(true);
    expect(model.elements.get('Stakeholders')!.length).toBeGreaterThanOrEqual(7);
  });
});

describe('extended parser features', () => {
  const content = readModel('Ghostbusters_V_0-1-2_business_FORMAT.md');
  const model = parseModel(content);

  it('buildHierarchyTree returns tree from taxonomy', () => {
    const tree = buildHierarchyTree(model.taxonomy, model.elements, model.matrices);
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBeGreaterThan(0);
  });

  it('extractRelationships finds wikilink refs', () => {
    const rels = extractRelationships(model.frontmatter, model.elements);
    expect(Array.isArray(rels)).toBe(true);
    // The Ghostbusters model currently defines no wikilinks in element descriptions
    // nor graph_edges in frontmatter, so extractRelationships must return an empty array.
    // This is the real contract — if relationships are added to the fixture, this test
    // will fail and must be bumped to the new expected count (not a >= 0 tautology).
    expect(rels.length).toBe(0);
  });

  it('extractAnalysis returns array', () => {
    const analysis = extractAnalysis(content);
    expect(Array.isArray(analysis)).toBe(true);
  });
});

/* ── FR-002: Slug derivation ─────────────────────────────────── */

describe('slugify (FR-002)', () => {
  it('converts a simple name to kebab-case', () => {
    expect(slugify('My Great Element')).toBe('my-great-element');
  });

  it('lowercases the input', () => {
    expect(slugify('ALLCAPS Name')).toBe('allcaps-name');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world test')).toBe('hello-world-test');
  });

  it('strips accented characters', () => {
    expect(slugify('José Martínez')).toBe('jose-martinez');
    expect(slugify('Café Crème')).toBe('cafe-creme');
    expect(slugify('München')).toBe('munchen');
  });

  it('removes non-alphanumeric characters except hyphens', () => {
    expect(slugify('Hello (World)!')).toBe('hello-world');
    expect(slugify('Price: $10')).toBe('price-10');
    expect(slugify('A&B Special')).toBe('ab-special');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('hello   world')).toBe('hello-world');
    expect(slugify('a--b')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  hello world  ')).toBe('hello-world');
    expect(slugify('-hello-')).toBe('hello');
  });

  it('handles empty and whitespace-only input', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });
});

describe('element slug derivation (FR-002)', () => {
  it('derives slug from element name when slug field is absent', () => {
    const content = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      '---',
      '',
      '# _F Problems',
      '',
      '* _F Problems: My Great Element',
      '  A description.',
      '',
    ].join('\n');

    const model = parseModel(content);
    const elements = model.elements.get('Problems');
    expect(elements).toBeDefined();
    expect(elements![0].slug).toBe('my-great-element');
  });

  it('uses explicit slug from YAML fields when declared', () => {
    const content = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      '---',
      '',
      '# _F Problems',
      '',
      '* _F Problems: My Element',
      '  ```yaml',
      '  slug: my-custom-slug',
      '  severity: high',
      '  ```',
      '  A description.',
      '',
    ].join('\n');

    const model = parseModel(content);
    const elements = model.elements.get('Problems');
    expect(elements).toBeDefined();
    expect(elements![0].slug).toBe('my-custom-slug');
    // slug should NOT remain in fields
    expect(elements![0].fields['slug']).toBeUndefined();
    // other fields should remain
    expect(elements![0].fields['severity']).toBe('high');
  });

  it('detects collisions when two elements derive the same slug', async () => {
    const { ElementsMap, ElementNode } = await import('../src/types');
    const elements = new ElementsMap();

    // Manually create elements with names that would slugify to the same value
    const el1: ElementNode = {
      type: 'Components',
      name: 'My Element',
      description: '',
      fields: {},
      markers: {},
    };
    const el2: ElementNode = {
      type: 'Components',
      name: 'my element',
      description: '',
      fields: {},
      markers: {},
    };

    elements.set('Components', [el1, el2]);
    const collisions = deriveElementSlugs(elements);

    expect(collisions).toHaveLength(1);
    expect(collisions[0].slug).toBe('my-element');
    expect(collisions[0].elements).toContain('My Element');
    expect(collisions[0].elements).toContain('my element');
  });

  it('emits slugCollisions on parsed model when names collide', () => {
    const content = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      '---',
      '',
      '# _F Components',
      '',
      '* _F Components: My Element',
      '  First one.',
      '* _F Components: my element',
      '  Second one with same slug.',
      '',
    ].join('\n');

    const model = parseModel(content);
    expect(model.slugCollisions).toBeDefined();
    expect(model.slugCollisions!.length).toBeGreaterThanOrEqual(1);
    expect(model.slugCollisions![0].slug).toBe('my-element');
    expect(model.slugCollisions![0].elements).toContain('My Element');
  });

  it('passes slug from ElementNode to ModelNode via recursiveParser', async () => {
    // This is tested via recursiveParse which maps elements to model nodes.
    // We verify the slug field is populated on the model node.
    const { recursiveParse } = await import('../src/recursiveParser');
    const { ElementsMap } = await import('../src/types');

    const fakeFile = (name: string, content: string) => ({
      kind: 'file' as const,
      name,
      getFile: async () => ({ text: async () => content }),
    });

    const fakeDir = (entries: Array<[string, unknown]>) => ({
      kind: 'directory' as const,
      name: 'ws',
      entries: async function* () { for (const e of entries) yield e; },
      getFileHandle: async (name: string) => {
        const found = entries.find(([n]) => n === name);
        if (!found) throw Object.assign(new Error('File not found'), { code: 'ENOENT' });
        return found[1];
      },
    });

    const modelContent = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      '---',
      '',
      '# _F index',
      '* [[TestEl]]',
      '',
      '# _F Components',
      '',
      '* _F Components: Test El',
      '  A test element.',
      '',
    ].join('\n');

    const indexContent = [
      '---',
      'specification_version: "V_0-1-2"',
      'level: 0',
      'title: "Index"',
      '---',
      '',
      '# _F index',
      '',
      '* [[test_FORMAT.md]]',
      '',
    ].join('\n');

    const root = fakeDir([
      ['index.md', fakeFile('index.md', indexContent)],
      ['test_FORMAT.md', fakeFile('test_FORMAT.md', modelContent)],
    ]);

    const result = await recursiveParse(root as any);
    const elementNodes = Object.values(result.nodes).filter(n => n.kind === 'element');
    expect(elementNodes.length).toBeGreaterThan(0);
    expect(elementNodes[0].slug).toBe('test-el');
  });
});

/* ── FR-003: Asset field types ───────────────────────────────── */

describe('ConceptField.type with asset types (FR-003)', () => {
  it('accepts image/file/video/audio as field types', () => {
    const content = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Asset Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      'concepts:',
      '  - name: Screenshots',
      '    type: text',
      '    fields:',
      '      - name: screenshot',
      '        type: image',
      '      - name: source',
      '        type: file',
      '      - name: demo',
      '        type: video',
      '      - name: narration',
      '        type: audio',
      '---',
      '',
      '# _F index',
      '* [[ScreenshotOne]]',
      '',
      '# _F Screenshots',
      '',
      '* _F Screenshots: ScreenshotOne',
      '  ```yaml',
      '  screenshot: photo.png',
      '  source: docs/report.pdf',
      '  demo: walkthrough.mp4',
      '  narration: voiceover.mp3',
      '  ```',
      '  A test element with asset fields.',
      '',
    ].join('\n');

    const model = parseModel(content);
    expect(model.frontmatter.concepts).toBeDefined();
    const screenshotConcept = model.frontmatter.concepts!.find(c => c.name === 'Screenshots');
    expect(screenshotConcept).toBeDefined();
    const fieldTypes = screenshotConcept!.fields!.map(f => f.type);
    expect(fieldTypes).toContain('image');
    expect(fieldTypes).toContain('file');
    expect(fieldTypes).toContain('video');
    expect(fieldTypes).toContain('audio');
  });
});

/* ── FR-004: asset_mode ─────────────────────────────────────── */

describe('asset_mode (FR-004)', () => {
  it('defaults to centralized when absent from frontmatter', () => {
    const content = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Asset Mode Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      '---',
      '',
      '# _F index',
      '* [[TestEl]]',
      '',
      '# _F Components',
      '',
      '* _F Components: TestEl',
      '  A test.',
      '',
    ].join('\n');

    const model = parseModel(content);
    expect(model.frontmatter.asset_mode).toBeUndefined();
    // The default is handled at the recursiveParser level
  });

  it('accepts explicit centralized mode', () => {
    const content = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Asset Mode Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      'asset_mode: centralized',
      '---',
      '',
      '# _F index',
      '* [[TestEl]]',
      '',
      '# _F Components',
      '',
      '* _F Components: TestEl',
      '  A test.',
      '',
    ].join('\n');

    const model = parseModel(content);
    expect(model.frontmatter.asset_mode).toBe('centralized');
  });

  it('accepts per-element mode', () => {
    const content = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Asset Mode Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      'asset_mode: per-element',
      '---',
      '',
      '# _F index',
      '* [[TestEl]]',
      '',
      '# _F Components',
      '',
      '* _F Components: TestEl',
      '  A test.',
      '',
    ].join('\n');

    const model = parseModel(content);
    expect(model.frontmatter.asset_mode).toBe('per-element');
  });

  it('resolves asset paths in centralized mode correctly', async () => {
    const { recursiveParse } = await import('../src/recursiveParser');

    const fakeFile = (name: string, content: string) => ({
      kind: 'file' as const,
      name,
      getFile: async () => ({ text: async () => content }),
    });

    const fakeDir = (entries: Array<[string, unknown]>) => ({
      kind: 'directory' as const,
      name: 'ws',
      entries: async function* () { for (const e of entries) yield e; },
      getFileHandle: async (name: string) => {
        const found = entries.find(([n]) => n === name);
        if (!found) throw Object.assign(new Error('File not found'), { code: 'ENOENT' });
        return found[1];
      },
    });

    const modelContent = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Asset Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      'asset_mode: centralized',
      'concepts:',
      '  - name: Screenshots',
      '    type: text',
      '    fields:',
      '      - name: screenshot',
      '        type: image',
      '---',
      '',
      '# _F index',
      '* [[ScreenshotOne]]',
      '',
      '# _F Screenshots',
      '',
      '* _F Screenshots: ScreenshotOne',
      '  ```yaml',
      '  screenshot: photo.png',
      '  ```',
      '  A screenshot element.',
      '',
    ].join('\n');

    const indexContent = [
      '---',
      'specification_version: "V_0-1-2"',
      'level: 0',
      'title: "Index"',
      '---',
      '',
      '# _F index',
      '',
      '* [[test_FORMAT.md]]',
      '',
    ].join('\n');

    const root = fakeDir([
      ['index.md', fakeFile('index.md', indexContent)],
      ['test_FORMAT.md', fakeFile('test_FORMAT.md', modelContent)],
    ]);

    const result = await recursiveParse(root as any);
    const elementNodes = Object.values(result.nodes).filter(n => n.kind === 'element');
    expect(elementNodes.length).toBeGreaterThan(0);
    // The asset path for centralized: <model-dir>/assets/photo.png
    // model-dir is '' (no directory prefix in the test), so path is 'assets/photo.png'
    expect(elementNodes[0].assets).toBeDefined();
    expect(elementNodes[0].assets!.length).toBeGreaterThan(0);
    expect(elementNodes[0].assets![0]).toContain('assets/photo.png');
  });
});

/* ── FR-007: FOLDER mode rejection ──────────────────────────── */

describe('FOLDER mode rejection (FR-007)', () => {
  it('parseModel emits a warning for FOLDER mode', () => {
    const content = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      'mode: FOLDER',
      '---',
      '',
      '# _F index',
      '* [[TestEl]]',
      '',
      '# _F Components',
      '',
      '* _F Components: TestEl',
      '  A test.',
      '',
    ].join('\n');

    const model = parseModel(content);
    expect(model.parseWarnings).toBeDefined();
    expect(model.parseWarnings!.some(w => w.includes('FOLDER'))).toBe(true);
  });

  it('validateFormatContent reports error for FOLDER mode', async () => {
    const { validateFormatContent } = await import('../src/validator');
    const content = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      'mode: FOLDER',
      '---',
      '',
      '# _F index',
      '* [[TestEl]]',
      '',
      '# _F Components',
      '',
      '* _F Components: TestEl',
      '  A test.',
      '',
    ].join('\n');

    const report = validateFormatContent(content, 'test_FORMAT.md');
    const folderCheck = report.checks.find(c => c.id === 'fm-no-folder-mode');
    expect(folderCheck).toBeDefined();
    expect(folderCheck!.passed).toBe(false);
    expect(folderCheck!.severity).toBe('error');
    expect(folderCheck!.message).toContain('FOLDER');
  });

  it('validateModel reports error for FOLDER mode', () => {
    const content = [
      '---',
      'specification_version: "V_0-1-3"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Test"',
      'parent:',
      '  name: "test_V_0-1-1"',
      '  url: "https://example.com/test"',
      'mode: FOLDER',
      '---',
      '',
      '# _F index',
      '* [[TestEl]]',
      '',
      '# _F Components',
      '',
      '* _F Components: TestEl',
      '  A test.',
      '',
    ].join('\n');

    const model = parseModel(content);
    const result = validateModel(model, null, null);
    const folderError = result.errors.find(e => e.message.includes('FOLDER'));
    expect(folderError).toBeDefined();
    expect(folderError!.severity).toBe('error');
  });
});
