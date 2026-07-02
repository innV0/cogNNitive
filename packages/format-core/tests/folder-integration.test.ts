import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createDriver, type ModelDriver, type ModelEntry } from '../src/driver'
import type { DirectoryHandleLike, FileHandleLike } from '../src/fs-types'

/* ── Helpers ─────────────────────────────────────────────────── */

function fakeDir(name: string, entries: Array<[string, FileHandleLike | DirectoryHandleLike]>): DirectoryHandleLike {
  const fileMap = new Map<string, FileHandleLike>()
  for (const [entryName, entry] of entries) {
    if (entry.kind === 'file') {
      fileMap.set(entryName, entry)
    }
  }
  return {
    kind: 'directory',
    name,
    entries: async function* () { for (const e of entries) yield e },
    getFileHandle: async (fileName: string) => {
      const found = fileMap.get(fileName)
      if (!found) throw Object.assign(new Error('File not found'), { code: 'ENOENT' })
      return found
    },
  }
}

function fakeFile(name: string, content: string): FileHandleLike {
  return {
    kind: 'file',
    name,
    getFile: async () => ({ text: async () => content }),
  }
}

function fmt(frontmatter: Record<string, unknown>, body?: string): string {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')
  return `---\n${fm}\n---\n${body ?? ''}`
}

/**
 * Generates a YAML _FORMAT.md file with proper YAML block formatting
 * for complex values like graph_edges.
 */
function fmtWithEdges(
  frontmatter: Record<string, unknown>,
  edges: Array<{ target: string; label: string; weight?: number }>,
  body?: string,
): string {
  const simpleKeys = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')
  const edgeLines = edges.map(e => {
    const w = e.weight !== undefined ? `\n    weight: ${e.weight}` : ''
    return `  - target: "${e.target}"\n    label: "${e.label}"${w}`
  }).join('\n')
  return `---\n${simpleKeys}\ngraph_edges:\n${edgeLines}\n---\n${body ?? ''}`
}

/**
 * Creates a temporary FOLDER-mode fixture from a root _FORMAT.md content
 * and a map of relative paths to _FORMAT.md content.
 */
function createFixture(
  rootFmContent: string,
  subdirs: Record<string, string>,
  extraFiles: Record<string, string> = {},
): string {
  const tmpDir = mkdtempSync(join(tmpdir(), 'format-int-'))
  writeFileSync(join(tmpDir, '_FORMAT.md'), rootFmContent, 'utf-8')

  for (const [relPath, content] of Object.entries(subdirs)) {
    const fullPath = join(tmpDir, relPath)
    mkdirSync(fullPath, { recursive: true })
    writeFileSync(join(fullPath, '_FORMAT.md'), content, 'utf-8')
  }

  for (const [relPath, content] of Object.entries(extraFiles)) {
    const fullPath = join(tmpDir, relPath)
    mkdirSync(join(fullPath, '..'), { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
  }

  return tmpDir
}

const SAMPLES_DIR = join(import.meta.dirname!, '..', '..', '..', 'specs', 'catalog_V_0-1-2', 'samples')
const MUSIC_HISTORY_DIR = join(SAMPLES_DIR, 'Music_History_V_1-0-0_catalog')

/* ── Tests ───────────────────────────────────────────────────── */

describe('FolderDriver integration — Music_History catalog', () => {
  it('sample directory exists', () => {
    expect(existsSync(MUSIC_HISTORY_DIR)).toBe(true)
    expect(existsSync(join(MUSIC_HISTORY_DIR, '_FORMAT.md'))).toBe(true)
  })

  it('root readModel returns catalog frontmatter', async () => {
    const driver = createDriver('FOLDER', MUSIC_HISTORY_DIR)
    const root = await driver.readModel('.')
    expect(root.frontmatter.title).toBe('Music History')
    expect(root.frontmatter.mode).toBe('FOLDER')
    expect(root.frontmatter.level).toBe(3)
  })

  it('lists children under concept group Artist', async () => {
    const driver = createDriver('FOLDER', MUSIC_HISTORY_DIR)
    const children = await driver.listChildren('Artist')
    const names = children.map(c => c.name).sort()
    expect(names).toContain('Queen')
    expect(names).toContain('The Beatles')
    expect(names).toContain('Miles Davis')
    expect(names).toContain('Kraftwerk')
    expect(names).toContain('Michael Jackson')
  })

  it('lists children under concept group Album', async () => {
    const driver = createDriver('FOLDER', MUSIC_HISTORY_DIR)
    const children = await driver.listChildren('Album')
    const names = children.map(c => c.name).sort()
    expect(names).toContain('Thriller')
    expect(names).toContain('Autobahn')
    expect(names).toContain("A Night at the Opera")
    expect(names).toContain('Kind of Blue')
    expect(names).toContain("Sgt. Pepper's Lonely Hearts Club Band")
  })

  it('lists children under concept group Genre', async () => {
    const driver = createDriver('FOLDER', MUSIC_HISTORY_DIR)
    const children = await driver.listChildren('Genre')
    const names = children.map(c => c.name).sort()
    expect(names).toContain('Rock')
    expect(names).toContain('Jazz')
    expect(names).toContain('Pop')
    expect(names).toContain('Electronic')
  })

  it('top-level root has no direct element children (concept groups only)', async () => {
    const driver = createDriver('FOLDER', MUSIC_HISTORY_DIR)
    const children = await driver.listChildren('.')
    expect(children).toHaveLength(0)
  })

  it('reads element type and fields from Queen', async () => {
    const driver = createDriver('FOLDER', MUSIC_HISTORY_DIR)
    const queen = await driver.readModel('Artist/Queen')
    expect(queen.frontmatter.type).toBe('Artist')
    expect(queen.frontmatter.fields?.genre).toBe('Rock')
    expect(queen.frontmatter.fields?.country).toBe('UK')
  })

  it('reads Album fields from Thriller', async () => {
    const driver = createDriver('FOLDER', MUSIC_HISTORY_DIR)
    const thriller = await driver.readModel('Album/Thriller')
    expect(thriller.frontmatter.type).toBe('Album')
    expect(thriller.frontmatter.fields?.artist).toBe('Michael Jackson')
  })

  it('lists assets per directory (Music_History has none)', async () => {
    const driver = createDriver('FOLDER', MUSIC_HISTORY_DIR)
    const rootAssets = await driver.listAssets('.')
    expect(Array.isArray(rootAssets)).toBe(true)
    expect(rootAssets).toEqual([])
    expect(await driver.listAssets('Artist/Queen')).toEqual([])
  })
})

describe('resolveGraphEdgeTarget and resolveQualifiedIdToPath', () => {
  it('resolves ../ paths', async () => {
    const { resolveGraphEdgeTarget } = await import('../src/recursiveParser')
    const resolved = resolveGraphEdgeTarget('../Album/Thriller', 'Artist/Queen/_FORMAT.md')
    expect(resolved).toBe('Artist/Album/Thriller')
  })

  it('resolves ../../ paths', async () => {
    const { resolveGraphEdgeTarget } = await import('../src/recursiveParser')
    const resolved = resolveGraphEdgeTarget('../../Scientist/Einstein', 'Artist/Queen/_FORMAT.md')
    expect(resolved).toBe('Scientist/Einstein')
  })

  it('resolveQualifiedIdToPath inverts resolveGraphEdgeTarget', async () => {
    const { resolveGraphEdgeTarget, resolveQualifiedIdToPath } = await import('../src/recursiveParser')

    const sourceDir = 'Artist/Queen'
    const sourcePathWithFormat = 'Artist/Queen/_FORMAT.md'
    const target = '../Album/Thriller'
    const id = resolveGraphEdgeTarget(target, sourcePathWithFormat)
    expect(id).toBe('Artist/Album/Thriller')

    const backToTarget = resolveQualifiedIdToPath(id, sourceDir)
    expect(backToTarget).toBe(target)
  })

  it('handles sibling path', async () => {
    const { resolveQualifiedIdToPath } = await import('../src/recursiveParser')
    const result = resolveQualifiedIdToPath('Artist/Album/Thriller', 'Artist')
    expect(result).toBe('Album/Thriller')
  })

  it('handles same-directory path', async () => {
    const { resolveQualifiedIdToPath } = await import('../src/recursiveParser')
    const result = resolveQualifiedIdToPath('Artist/Album/Thriller', 'Artist/Album')
    expect(result).toBe('Thriller')
  })
})

describe('graph_edges round-trip', () => {
  it('graph_edges are parsed into relationships by recursiveParser with driver', async () => {
    const tmpDir = createFixture(
      fmt({
        specification_version: 'V_0-1-2',
        level: 3,
        mode: 'FOLDER',
        title: 'Graph Test',
      }),
      {
        'Artist/Queen': fmt({ type: 'Artist', title: 'Queen' }),
        'Artist/The Beatles': fmt({ type: 'Artist', title: 'The Beatles' }),
        // Use proper YAML block formatting for graph_edges
        'Album/A Night at the Opera': fmtWithEdges(
          { type: 'Album', title: 'A Night at the Opera' },
          [{ target: '../../Artist/Queen', label: 'Artist', weight: 10 }],
        ),
        'Album/Thriller': fmtWithEdges(
          { type: 'Album', title: 'Thriller' },
          [{ target: '../../Artist/Michael Jackson', label: 'Artist', weight: 9 }],
        ),
      },
    )

    const driver = createDriver('FOLDER', tmpDir)
    const { recursiveParse } = await import('../src/recursiveParser')

    const root = fakeDir('root', [
      ['Album', fakeDir('Album', [
        ['A Night at the Opera', fakeDir('A Night at the Opera', [
          ['_FORMAT.md', fakeFile('_FORMAT.md', '')],
        ])],
        ['Thriller', fakeDir('Thriller', [
          ['_FORMAT.md', fakeFile('_FORMAT.md', '')],
        ])],
      ])],
      ['Artist', fakeDir('Artist', [
        ['Queen', fakeDir('Queen', [
          ['_FORMAT.md', fakeFile('_FORMAT.md', '')],
        ])],
        ['The Beatles', fakeDir('The Beatles', [
          ['_FORMAT.md', fakeFile('_FORMAT.md', '')],
        ])],
      ])],
    ])

    const result = await recursiveParse(root, driver)

    // Find Album/A Night at the Opera node
    const operaNode = Object.values(result.nodes).find(n => n.name === 'A Night at the Opera')
    expect(operaNode).toBeDefined()
    expect(operaNode!.relationships.length).toBeGreaterThanOrEqual(1)

    const queenRel = operaNode!.relationships.find(r => r.label === 'Artist')
    expect(queenRel).toBeDefined()
    // ../../Artist/Queen from Album/A Night at the Opera → Artist/Queen
    expect(queenRel!.targetId).toBe('Artist/Queen')
    expect(queenRel!.value).toBe(10)

    // Find Album/Thriller node
    const thrillerNode = Object.values(result.nodes).find(n => n.name === 'Thriller')
    expect(thrillerNode).toBeDefined()
    expect(thrillerNode!.relationships.length).toBeGreaterThanOrEqual(1)

    const mjRel = thrillerNode!.relationships.find(r => r.label === 'Artist')
    expect(mjRel).toBeDefined()
    expect(mjRel!.targetId).toBe('Artist/Michael Jackson')
    expect(mjRel!.value).toBe(9)

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('graph_edges are preserved in frontmatter through parseModel', async () => {
    const { parseModel } = await import('../src/parser')

    const raw = `---
specification_version: "V_0-1-2"
level: 3
mode: "FOLDER"
type: "Album"
title: "Test"
graph_edges:
  - target: "../Artist/Queen"
    label: "performer"
    weight: 10
---
`
    const parsed = parseModel(raw)
    expect(parsed.frontmatter.graph_edges).toBeDefined()
    const edges = parsed.frontmatter.graph_edges as Array<{ target: string; label: string; weight?: number }>
    expect(edges).toHaveLength(1)
    expect(edges[0].target).toBe('../Artist/Queen')
    expect(edges[0].label).toBe('performer')
    expect(edges[0].weight).toBe(10)
  })

  it('resolveGraphEdgeTarget resolves ../../ paths', async () => {
    const { resolveGraphEdgeTarget } = await import('../src/recursiveParser')
    // From Album/A Night at the Opera, ../../Artist/Queen → Artist/Queen
    const resolved = resolveGraphEdgeTarget('../../Artist/Queen', 'Album/A Night at the Opera/_FORMAT.md')
    expect(resolved).toBe('Artist/Queen')
  })
})

describe('assets via driver.listAssets', () => {
  it('listAssets returns asset files directly', async () => {
    const tmpDir = createFixture(
      fmt({
        specification_version: 'V_0-1-2',
        level: 3,
        mode: 'FOLDER',
        title: 'Asset Test',
      }),
      { 'Artist/Test Artist': fmt({ type: 'Artist', title: 'Test Artist' }) },
      { 'Artist/Test Artist/photo.jpg': 'fake-img', 'Artist/Test Artist/notes.txt': 'notes' },
    )

    const driver = createDriver('FOLDER', tmpDir)
    const assets = await driver.listAssets('Artist/Test Artist')
    expect(assets.sort()).toEqual(['Artist/Test Artist/notes.txt', 'Artist/Test Artist/photo.jpg'])
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('node.assets is populated via listAssets in recursiveParser', async () => {
    const tmpDir = createFixture(
      fmt({
        specification_version: 'V_0-1-2',
        level: 3,
        mode: 'FOLDER',
        title: 'Asset Test',
      }),
      { 'Artist/Test Artist': fmt({ type: 'Artist', title: 'Test Artist' }) },
      { 'Artist/Test Artist/photo.jpg': 'fake-img', 'Artist/Test Artist/notes.txt': 'notes' },
    )

    const driver = createDriver('FOLDER', tmpDir)
    const { recursiveParse } = await import('../src/recursiveParser')

    const root = fakeDir('root', [
      ['Artist', fakeDir('Artist', [
        ['Test Artist', fakeDir('Test Artist', [
          ['_FORMAT.md', fakeFile('_FORMAT.md', '')],
        ])],
      ])],
    ])

    const result = await recursiveParse(root, driver)
    const artistNode = Object.values(result.nodes).find(n => n.name === 'Test Artist')
    expect(artistNode).toBeDefined()
    expect(artistNode!.assets).toBeDefined()
    expect(artistNode!.assets!.sort()).toEqual(['Artist/Test Artist/notes.txt', 'Artist/Test Artist/photo.jpg'])

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('concept nodes (no _FORMAT.md) have assets: undefined (NFR-3.1)', async () => {
    const tmpDir = createFixture(
      fmt({
        specification_version: 'V_0-1-2',
        level: 3,
        mode: 'FOLDER',
        title: 'Concept Test',
      }),
      {},
    )

    mkdirSync(join(tmpDir, 'BareConcept'))
    const driver = createDriver('FOLDER', tmpDir)
    const { recursiveParse } = await import('../src/recursiveParser')

    const root = fakeDir('root', [
      ['BareConcept', fakeDir('BareConcept', [])],
    ])

    const result = await recursiveParse(root, driver)
    const conceptNode = Object.values(result.nodes).find(n => n.name === 'BareConcept')
    expect(conceptNode).toBeDefined()
    expect(conceptNode!.kind).toBe('concept')
    expect(conceptNode!.assets).toBeUndefined()

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('FILE mode driver.listAssets returns empty (NFR-3.2)', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'format-file-assets-'))
    writeFileSync(join(tmpDir, 'test_FORMAT.md'), fmt({
      specification_version: 'V_0-1-2',
      level: 3,
      mode: 'FILE',
      title: 'Test File',
    }), 'utf-8')

    const fileDriver = createDriver('FILE', tmpDir)
    const assets = await fileDriver.listAssets('.')
    expect(assets).toEqual([])

    rmSync(tmpDir, { recursive: true, force: true })
  })
})
