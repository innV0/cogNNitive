import { describe, it, expect } from 'vitest';
import type { DirectoryHandleLike, FileHandleLike } from '../src/fs-types';
import { recursiveParse } from '../src/recursiveParser';

/* ── Fake handle helpers ─────────────────────────────────────── */

type DirEntries = Array<[string, FileHandleLike | DirectoryHandleLike]>;

function fakeDir(name: string, entries: DirEntries): DirectoryHandleLike {
  const fileMap = new Map<string, FileHandleLike>();
  for (const [entryName, entry] of entries) {
    if (entry.kind === 'file') {
      fileMap.set(entryName, entry);
    }
  }
  return {
    kind: 'directory',
    name,
    entries: async function* () { for (const e of entries) yield e; },
    getFileHandle: async (fileName: string) => {
      const found = fileMap.get(fileName);
      if (!found) throw Object.assign(new Error('File not found'), { code: 'ENOENT' });
      return found;
    },
  };
}

function fakeFile(name: string, content: string): FileHandleLike {
  return {
    kind: 'file',
    name,
    getFile: async () => ({ text: async () => content }),
  };
}

function md(frontmatter: Record<string, unknown>, body?: string): string {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');
  return `---\n${fm}\n---\n${body ?? ''}`;
}

const BASE_FM = {
  spec_version: 'V_0-1-2',
  level: 3,
  model_version: 'V_0-0-1',
  parent: { name: 'business_V_0-1-1', url: 'https://example.com/business' },
};

function makeModel(title: string, body?: string): string {
  return md({ ...BASE_FM, title }, body);
}

function makeIndex(wikilinks: string[]): string {
  const items = wikilinks.map(w => `* [[${w}]]`).join('\n');
  return `---\nspec_version: "V_0-1-2"\nlevel: 0\ntitle: "Workspace Index"\n---\n\n# _NN index\n\n${items}\n`;
}

/* ── Tests ───────────────────────────────────────────────────── */

describe('recursiveParse (index.md-driven)', () => {
  describe('FR-001: Workspace with valid index.md', () => {
    it('parses a single model listed in index.md', async () => {
      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['gb_NN.md']))],
        ['gb_NN.md', fakeFile('gb_NN.md', makeModel('Ghostbusters'))],
      ]);

      const result = await recursiveParse(root);
      expect(result.rootIds).toHaveLength(1);
      const rootNode = result.nodes[result.rootIds[0]];
      expect(rootNode).toBeDefined();
      expect(rootNode.name).toBe('gb');
      expect(rootNode.kind).toBe('root');
      expect(result.issues).toHaveLength(0);
    });

    it('parses multiple models listed in index.md', async () => {
      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['modelA_NN.md', 'modelB_NN.md']))],
        ['modelA_NN.md', fakeFile('modelA_NN.md', makeModel('Model A'))],
        ['modelB_NN.md', fakeFile('modelB_NN.md', makeModel('Model B'))],
      ]);

      const result = await recursiveParse(root);
      expect(result.rootIds).toHaveLength(2);
      const names = result.rootIds.map(id => result.nodes[id].name).sort();
      expect(names).toEqual(['modelA', 'modelB']);
      expect(result.issues).toHaveLength(0);
    });

    it('parses models with elements into a normalized graph', async () => {
      const modelContent = makeModel('Test Model', `
# _NN index

* [[Problems]]

# _NN Problems

* _NN Problems: Problem One
  Description of problem one.
* _NN Problems: Problem Two
  Description of problem two.
`);

      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['test_NN.md']))],
        ['test_NN.md', fakeFile('test_NN.md', modelContent)],
      ]);

      const result = await recursiveParse(root);
      expect(result.issues).toHaveLength(0);
      expect(Object.keys(result.nodes).length).toBeGreaterThan(1);

      // Elements should exist in the graph
      const problemOne = Object.values(result.nodes).find(n => n.name === 'Problem One');
      expect(problemOne).toBeDefined();
      expect(problemOne!.kind).toBe('element');
    });
  });

  describe('FR-001: Missing index.md', () => {
    it('returns an error when index.md is missing', async () => {
      const root = fakeDir('workspace', [
        ['gb_NN.md', fakeFile('gb_NN.md', makeModel('Ghostbusters'))],
      ]);

      const result = await recursiveParse(root);
      expect(result.rootIds).toHaveLength(0);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].message).toContain('Missing index.md');
    });
  });

  describe('FR-001: Wikilink to non-existent model', () => {
    it('emits a warning and skips missing file', async () => {
      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['exists_NN.md', 'missing_NN.md']))],
        ['exists_NN.md', fakeFile('exists_NN.md', makeModel('Exists'))],
      ]);

      const result = await recursiveParse(root);
      // Only one model should be loaded
      expect(result.rootIds).toHaveLength(1);
      expect(result.nodes[result.rootIds[0]].name).toBe('exists');

      // Warning for missing file
      const missingIssues = result.issues.filter(i => i.message.includes('not found'));
      expect(missingIssues.length).toBeGreaterThan(0);
      expect(missingIssues[0].path).toBe('missing_NN.md');
    });
  });

  describe('FR-005: Unique element names across workspace', () => {
    it('reports collision when two models have same element name', async () => {
      const modelA = makeModel('Model A', `
# _NN index

* [[Database]]

# _NN Components

* _NN Components: Database
  The database component.
`);

      const modelB = makeModel('Model B', `
# _NN index

* [[Database]]

# _NN Components

* _NN Components: Database
  Another database component.
`);

      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['modelA_NN.md', 'modelB_NN.md']))],
        ['modelA_NN.md', fakeFile('modelA_NN.md', modelA)],
        ['modelB_NN.md', fakeFile('modelB_NN.md', modelB)],
      ]);

      const result = await recursiveParse(root);

      // Both root nodes should exist
      expect(result.rootIds).toHaveLength(2);

      // Collision should be detected (both elements named "Database" across models)
      const collisionIssues = result.issues.filter(i => i.message.includes('appears in both'));
      expect(collisionIssues.length).toBeGreaterThan(0);
      expect(collisionIssues[0].message).toContain('"Database"');
      expect(collisionIssues[0].message).toContain('modelA');
      expect(collisionIssues[0].message).toContain('modelB');
    });

    it('no collision when all element names are unique across models', async () => {
      const modelA = makeModel('Model A', `
# _NN index

* [[Users]]

# _NN Components

* _NN Components: Users
  User management.
`);

      const modelB = makeModel('Model B', `
# _NN index

* [[Orders]]

# _NN Components

* _NN Components: Orders
  Order management.
`);

      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['modelA_NN.md', 'modelB_NN.md']))],
        ['modelA_NN.md', fakeFile('modelA_NN.md', modelA)],
        ['modelB_NN.md', fakeFile('modelB_NN.md', modelB)],
      ]);

      const result = await recursiveParse(root);
      expect(result.rootIds).toHaveLength(2);
      const elementNames = Object.values(result.nodes)
        .filter(n => n.kind === 'element')
        .map(n => n.name);
      expect(elementNames).toEqual(expect.arrayContaining(['Users', 'Orders']));
    });
  });
});
