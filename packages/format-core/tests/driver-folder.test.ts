import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createDriver, type ModelDriver } from '../src/driver'
import { discoverFolder, buildElementMap } from '../src/driver-folder'

const ROOT_FORMAT_MD = `---
specification_version: "V_0-1-1"
level: 2
title: "Test Catalog"
mode: "FOLDER"
concepts:
  - name: Artist
    type: text
    icon: user
  - name: Album
    type: text
    icon: music
  - name: Genre
    type: text
    icon: tag
---

# _F index

* [[Artist]]
  * [[Album]]
* [[Genre]]

`

const ARTIST_FORMAT_MD = `---
type: Artist
title: "Artist"
---

# _F index

* [[Album A]]
  * [[Song A1]]

`

const ALBUM_FORMAT_MD = `---
type: Album
title: "Album A"
---

# _F index

* [[Song A1]]

`

const GENRE_FORMAT_MD = `---
type: Genre
title: "Genre"
---

Descriptive text about the genre.

`

/**
 * Creates a directory structure for FOLDER mode:
 *   root/
 *     _FORMAT.md
 *     Artist/
 *       _FORMAT.md
 *     Album_A/
 *       _FORMAT.md
 *     Genre/
 *       _FORMAT.md
 *       genre-notes.txt    (asset)
 *     EmptyDir/            (no _FORMAT.md — skipped)
 *     notes.txt            (root-level asset)
 */
function createFolderStructure(basePath: string): void {
  writeFileSync(join(basePath, '_FORMAT.md'), ROOT_FORMAT_MD, 'utf-8')

  const artistPath = join(basePath, 'Artist')
  mkdirSync(artistPath)
  writeFileSync(join(artistPath, '_FORMAT.md'), ARTIST_FORMAT_MD, 'utf-8')

  const albumPath = join(basePath, 'Album_A')
  mkdirSync(albumPath)
  writeFileSync(join(albumPath, '_FORMAT.md'), ALBUM_FORMAT_MD, 'utf-8')

  const genrePath = join(basePath, 'Genre')
  mkdirSync(genrePath)
  writeFileSync(join(genrePath, '_FORMAT.md'), GENRE_FORMAT_MD, 'utf-8')
  // Asset file inside Genre directory
  writeFileSync(join(genrePath, 'genre-notes.txt'), 'Some notes about genre', 'utf-8')

  // Empty directory — no _FORMAT.md
  const emptyPath = join(basePath, 'EmptyDir')
  mkdirSync(emptyPath)

  // Root-level asset
  writeFileSync(join(basePath, 'notes.txt'), 'Root notes', 'utf-8')
}

describe('FolderDriver (ModelDriver implementation)', () => {
  let tmpDir: string
  let driver: ModelDriver

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'format-driver-folder-'))
    createFolderStructure(tmpDir)
    driver = createDriver('FOLDER', tmpDir)
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('readModel reads root _FORMAT.md', async () => {
    const model = await driver.readModel('.')
    expect(model.frontmatter.title).toBe('Test Catalog')
    expect(model.frontmatter.level).toBe(2)
    expect(model.frontmatter.mode).toBe('FOLDER')
  })

  it('readModel reads subdirectory _FORMAT.md', async () => {
    const model = await driver.readModel('Artist')
    expect(model.frontmatter.type).toBe('Artist')
  })

  it('writeModel writes root _FORMAT.md', async () => {
    const model = await driver.readModel('.')
    model.frontmatter.title = 'Updated Catalog'
    await driver.writeModel('.', model)

    const reread = await driver.readModel('.')
    expect(reread.frontmatter.title).toBe('Updated Catalog')
  })

  it('writeModel writes subdirectory _FORMAT.md', async () => {
    const model = await driver.readModel('Artist')
    model.frontmatter.title = 'Updated Artists'
    await driver.writeModel('Artist', model)

    const reread = await driver.readModel('Artist')
    expect(reread.frontmatter.title).toBe('Updated Artists')
  })

  it('listChildren returns subdirectories with _FORMAT.md', async () => {
    const children = await driver.listChildren('.')
    // Should find Artist, Album_A, Genre (3 dirs with _FORMAT.md)
    // EmptyDir has no _FORMAT.md, should NOT be listed
    const names = children.map((c) => c.name).sort()
    expect(names).toEqual(['Album_A', 'Artist', 'Genre'])
  })

  it('listChildren returns child entries as kind element', async () => {
    const children = await driver.listChildren('.')
    for (const child of children) {
      expect(child.kind).toBe('element')
    }
  })

  it('listChildren for subdirectory returns nested children', async () => {
    // Artist has no subdirectories with _FORMAT.md in our fixture
    const children = await driver.listChildren('Artist')
    expect(children).toEqual([])
  })

  it('listAssets returns non-_FORMAT.md files', async () => {
    const assets = await driver.listAssets('Genre')
    expect(assets).toContain('Genre/genre-notes.txt')
  })

  it('listAssets at root returns root-level assets', async () => {
    const assets = await driver.listAssets('.')
    expect(assets).toContain('notes.txt')
    // _FORMAT.md and subdirectories should not be in assets
    expect(assets).not.toContain('_FORMAT.md')
  })

  it('listAssets returns empty for directory with only _FORMAT.md', async () => {
    const assets = await driver.listAssets('Artist')
    expect(assets).toEqual([])
  })

  it('readModel throws on subdirectory without _FORMAT.md', async () => {
    await expect(driver.readModel('EmptyDir')).rejects.toThrow()
  })
})

describe('Legacy driver-folder exports (deprecated wrappers)', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'format-driver-folder-legacy-'))
    createFolderStructure(tmpDir)
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('discoverFolder returns root frontmatter and elements', async () => {
    const result = await discoverFolder(tmpDir)
    expect(result.rootFrontmatter.title).toBe('Test Catalog')
    expect(result.rootFrontmatter.level).toBe(2)

    // Should find 3 elements: Artist, Album_A, Genre
    expect(result.elements).toHaveLength(3)
    const names = result.elements.map((e) => e.path).sort()
    expect(names).toEqual(['Album_A', 'Artist', 'Genre'])
  })

  it('discoverFolder detects assets', async () => {
    const result = await discoverFolder(tmpDir)
    const genre = result.elements.find((e) => e.path === 'Genre')
    expect(genre).toBeDefined()
    expect(genre!.assets).toContain('Genre/genre-notes.txt')
  })

  it('discoverFolder skips directories without _FORMAT.md', async () => {
    const result = await discoverFolder(tmpDir)
    const hasEmptyDir = result.elements.some((e) => e.path.includes('EmptyDir'))
    expect(hasEmptyDir).toBe(false)
  })

  it('buildElementMap flattens nested elements into map', () => {
    // Create a nested structure for buildElementMap test
    const nested = [
      {
        path: 'Artist', type: 'Artist', fields: {}, markers: {},
        graphEdges: [], assets: [], children: [
          { path: 'Artist/Album_A', type: 'Album', fields: {}, markers: {},
            graphEdges: [], assets: [], children: [] },
        ],
      },
      { path: 'Genre', type: 'Genre', fields: {}, markers: {},
        graphEdges: [], assets: [], children: [] },
    ]

    const map = buildElementMap(nested)
    expect(map.size).toBe(3)
    expect(map.has('Artist')).toBe(true)
    expect(map.has('Artist/Album_A')).toBe(true)
    expect(map.has('Genre')).toBe(true)
  })
})
