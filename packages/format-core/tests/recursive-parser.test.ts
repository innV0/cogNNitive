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

/* ── Tests ───────────────────────────────────────────────────── */

describe('recursiveParse', () => {
  describe('mixed tree with FILE and FOLDER roots', () => {
    it('parses a FILE root node at the top level', async () => {
      const root = fakeDir('workspace', [
        ['gb_FORMAT.md', fakeFile('gb_FORMAT.md', md({
          specification_version: 'V_0-1-2', level: 3, model_version: 'V_0-1-2',
          title: 'Ghostbusters', mode: 'FILE',
          parent: { name: 'business_V_0-1-1', url: 'https://example.com/business' },
        }))],
      ]);

      const result = await recursiveParse(root);
      expect(result.rootIds).toHaveLength(1);
      const rootNode = result.nodes[result.rootIds[0]];
      expect(rootNode).toBeDefined();
      expect(rootNode.storageMode).toBe('FILE');
      expect(rootNode.kind).toBe('root');
      expect(result.issues).toHaveLength(0);
    });

    it('parses a FOLDER root node at the top level', async () => {
      const root = fakeDir('workspace', [
        ['someFolder', fakeDir('someFolder', [
          ['_FORMAT.md', fakeFile('_FORMAT.md', md({
            specification_version: 'V_0-1-2', level: 3, model_version: 'V_0-1-2',
            title: 'FolderModel', mode: 'FOLDER',
            parent: { name: 'kb_V_0-1-1', url: 'https://example.com/kb' },
          }))],
        ])],
      ]);

      const result = await recursiveParse(root);
      expect(result.rootIds).toHaveLength(1);
      const rootNode = result.nodes[result.rootIds[0]];
      expect(rootNode).toBeDefined();
      expect(rootNode.storageMode).toBe('FOLDER');
      expect(rootNode.kind).toBe('root');
      expect(result.issues).toHaveLength(0);
    });

    it('parses both FILE and FOLDER roots in the same workspace', async () => {
      const root = fakeDir('workspace', [
        ['fileModel_FORMAT.md', fakeFile('fileModel_FORMAT.md', md({
          specification_version: 'V_0-1-2', level: 3, model_version: 'V_0-1-2',
          title: 'FileModel', mode: 'FILE',
          parent: { name: 'business_V_0-1-1', url: 'https://example.com/business' },
        }))],
        ['folderModel', fakeDir('folderModel', [
          ['_FORMAT.md', fakeFile('_FORMAT.md', md({
            specification_version: 'V_0-1-2', level: 3, model_version: 'V_0-1-2',
            title: 'FolderModel', mode: 'FOLDER',
            parent: { name: 'kb_V_0-1-1', url: 'https://example.com/kb' },
          }))],
        ])],
      ]);

      const result = await recursiveParse(root);
      expect(result.rootIds).toHaveLength(2);
      const fileRoot = Object.values(result.nodes).find(n => n.storageMode === 'FILE');
      const folderRoot = Object.values(result.nodes).find(n => n.storageMode === 'FOLDER');
      expect(fileRoot).toBeDefined();
      expect(folderRoot).toBeDefined();
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('FOLDER node with _FORMAT.md containing taxonomy', () => {
    it('parses nested elements from a FOLDER node', async () => {
      const root = fakeDir('workspace', [
        ['kb', fakeDir('kb', [
          ['_FORMAT.md', fakeFile('_FORMAT.md', md({
            specification_version: 'V_0-1-2', level: 3, model_version: 'V_0-1-2',
            title: 'KnowledgeBase', mode: 'FOLDER',
            concepts: [
              { name: 'Persona', type: 'text' },
              { name: 'Topic', type: 'text' },
            ],
            parent: { name: 'kb_V_0-1-1', url: 'https://example.com/kb' },
          }))],
          ['Alice', fakeDir('Alice', [
            ['_FORMAT.md', fakeFile('_FORMAT.md', md({
              specification_version: 'V_0-1-2', level: 3, mode: 'FOLDER',
              type: 'Persona',
              title: 'Alice',
            }))],
          ])],
          ['Bob', fakeDir('Bob', [
            ['_FORMAT.md', fakeFile('_FORMAT.md', md({
              specification_version: 'V_0-1-2', level: 3, mode: 'FOLDER',
              type: 'Persona',
              title: 'Bob',
            }))],
          ])],
        ])],
      ]);

      const result = await recursiveParse(root);
      expect(result.rootIds).toHaveLength(1);
      expect(Object.keys(result.nodes).length).toBeGreaterThanOrEqual(3);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('bare concept directories → type: category', () => {
    it('creates concept nodes for directories without _FORMAT.md', async () => {
      const root = fakeDir('workspace', [
        ['kb', fakeDir('kb', [
          ['_FORMAT.md', fakeFile('_FORMAT.md', md({
            specification_version: 'V_0-1-2', level: 3, model_version: 'V_0-1-2',
            title: 'KnowledgeBase', mode: 'FOLDER',
            concepts: [{ name: 'Persona', type: 'text' }],
            parent: { name: 'kb_V_0-1-1', url: 'https://example.com/kb' },
          }))],
          ['BareConcept', fakeDir('BareConcept', [])],
        ])],
      ]);

      const result = await recursiveParse(root);
      const conceptNode = Object.values(result.nodes).find(
        n => n.name === 'BareConcept'
      );
      expect(conceptNode).toBeDefined();
      expect(conceptNode.type).toBe('category');
      expect(conceptNode.kind).toBe('concept');
      expect(conceptNode.sourceMode).toBe('structural');
      expect(conceptNode.childIds).toHaveLength(0);
    });
  });

  describe('identity collision reporting', () => {
    it('does not crash when two roots have similar names', async () => {
      const root = fakeDir('workspace', [
        ['CollisionMod_FORMAT.md', fakeFile('CollisionMod_FORMAT.md', md({
          specification_version: 'V_0-1-2', level: 3, model_version: 'V_0-1-2',
          title: 'CollisionModel', mode: 'FILE',
          parent: { name: 'business_V_0-1-1', url: 'https://example.com/business' },
        }))],
        ['_FORMAT.md', fakeFile('_FORMAT.md', md({
          specification_version: 'V_0-1-2', level: 3, model_version: 'V_0-1-2',
          title: 'CollisionFolder', mode: 'FILE',
          parent: { name: 'business_V_0-1-1', url: 'https://example.com/business' },
        }))],
      ]);

      const result = await recursiveParse(root);
      expect(result.issues).toBeDefined();
    });
  });

  describe('parse issues for malformed files', () => {
    it('creates concept nodes for unparseable _FORMAT.md', async () => {
      const root = fakeDir('workspace', [
        ['broken', fakeDir('broken', [
          ['_FORMAT.md', fakeFile('_FORMAT.md', '{ invalid yaml: [ }')],
        ])],
      ]);

      const result = await recursiveParse(root);
      expect(result.issues).toBeDefined();
      const brokenNode = Object.values(result.nodes).find(
        n => n.name === 'broken'
      );
      expect(brokenNode).toBeDefined();
      expect(brokenNode.kind).toBe('concept');
      expect(brokenNode.sourceMode).toBe('structural');
    });
  });
});
