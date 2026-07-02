import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseModel, parseFrontmatter, parseIndexBlock, parseMarkdownTable, validateModel, buildHierarchyTree, extractRelationships, extractAnalysis } from '../src/index';

const specsDir = join(import.meta.dirname!, '..', '..', '..', 'specs');
const modelsDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'business_V_0-1-1', 'samples');

function readSpec(name: string): string {
  return readFileSync(join(specsDir, name), 'utf-8');
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
  const content = readSpec('FORMAT_V_0-1-0_FORMAT.md');
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
