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
  specification_version: 'V_0-1-2',
  level: 3,
  model_version: 'V_0-0-1',
  parent: { name: 'business_V_0-1-1', url: 'https://example.com/business' },
};

function makeModel(title: string, body?: string): string {
  return md({ ...BASE_FM, title }, body);
}

function makeIndex(wikilinks: string[]): string {
  const items = wikilinks.map(w => `* [[${w}]]`).join('\n');
  return `---\nspecification_version: "V_0-1-2"\nlevel: 0\ntitle: "Workspace Index"\n---\n\n# _F index\n\n${items}\n`;
}

/* ── Tests ───────────────────────────────────────────────────── */

describe('recursiveParse (index.md-driven)', () => {
  describe('FR-001: Workspace with valid index.md', () => {
    it('parses a single model listed in index.md', async () => {
      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['gb_FORMAT.md']))],
        ['gb_FORMAT.md', fakeFile('gb_FORMAT.md', makeModel('Ghostbusters'))],
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
        ['index.md', fakeFile('index.md', makeIndex(['modelA_FORMAT.md', 'modelB_FORMAT.md']))],
        ['modelA_FORMAT.md', fakeFile('modelA_FORMAT.md', makeModel('Model A'))],
        ['modelB_FORMAT.md', fakeFile('modelB_FORMAT.md', makeModel('Model B'))],
      ]);

      const result = await recursiveParse(root);
      expect(result.rootIds).toHaveLength(2);
      const names = result.rootIds.map(id => result.nodes[id].name).sort();
      expect(names).toEqual(['modelA', 'modelB']);
      expect(result.issues).toHaveLength(0);
    });

    it('parses models with elements into a normalized graph', async () => {
      const modelContent = makeModel('Test Model', `
# _F index

* [[Problems]]

# _F Problems

* _F Problems: Problem One
  Description of problem one.
* _F Problems: Problem Two
  Description of problem two.
`);

      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['test_FORMAT.md']))],
        ['test_FORMAT.md', fakeFile('test_FORMAT.md', modelContent)],
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
        ['gb_FORMAT.md', fakeFile('gb_FORMAT.md', makeModel('Ghostbusters'))],
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
        ['index.md', fakeFile('index.md', makeIndex(['exists_FORMAT.md', 'missing_FORMAT.md']))],
        ['exists_FORMAT.md', fakeFile('exists_FORMAT.md', makeModel('Exists'))],
      ]);

      const result = await recursiveParse(root);
      // Only one model should be loaded
      expect(result.rootIds).toHaveLength(1);
      expect(result.nodes[result.rootIds[0]].name).toBe('exists');

      // Warning for missing file
      const missingIssues = result.issues.filter(i => i.message.includes('not found'));
      expect(missingIssues.length).toBeGreaterThan(0);
      expect(missingIssues[0].path).toBe('missing_FORMAT.md');
    });
  });

  describe('FR-005: Unique element names across workspace', () => {
    it('reports collision when two models have same element name', async () => {
      const modelA = makeModel('Model A', `
# _F index

* [[Database]]

# _F Components

* _F Components: Database
  The database component.
`);

      const modelB = makeModel('Model B', `
# _F index

* [[Database]]

# _F Components

* _F Components: Database
  Another database component.
`);

      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['modelA_FORMAT.md', 'modelB_FORMAT.md']))],
        ['modelA_FORMAT.md', fakeFile('modelA_FORMAT.md', modelA)],
        ['modelB_FORMAT.md', fakeFile('modelB_FORMAT.md', modelB)],
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
# _F index

* [[Users]]

# _F Components

* _F Components: Users
  User management.
`);

      const modelB = makeModel('Model B', `
# _F index

* [[Orders]]

# _F Components

* _F Components: Orders
  Order management.
`);

      const root = fakeDir('workspace', [
        ['index.md', fakeFile('index.md', makeIndex(['modelA_FORMAT.md', 'modelB_FORMAT.md']))],
        ['modelA_FORMAT.md', fakeFile('modelA_FORMAT.md', modelA)],
        ['modelB_FORMAT.md', fakeFile('modelB_FORMAT.md', modelB)],
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
