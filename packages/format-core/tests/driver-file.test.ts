import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createDriver, type ModelDriver } from '../src/driver'
import { readFileModel, writeFileModel, readFileModelSync, writeFileModelSync } from '../src/driver-file'
import { parseModel, serializeModel } from '../src/parser'

const MINIMAL_MODEL = `---
specification_version: "V_0-1-1"
level: 3
title: "Test Model"
mode: "FILE"
---

# _F index

* [[Root Item]]
  * [[Child Item]]

# _F Stakeholders

* _F Stakeholders: Alice
  Description of Alice.
* _F Stakeholders: Bob
  Description of Bob.
`

describe('FileDriver (ModelDriver implementation)', () => {
  let tmpDir: string
  let driver: ModelDriver

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'format-driver-file-'))
    driver = createDriver('FILE', tmpDir)
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('reads a FORMAT model from file', async () => {
    const filePath = join(tmpDir, 'test_FORMAT.md')
    writeFileSync(filePath, MINIMAL_MODEL, 'utf-8')

    const model = await driver.readModel('test_FORMAT.md')
    expect(model.frontmatter.title).toBe('Test Model')
    expect(model.frontmatter.level).toBe(3)
  })

  it('writes a FORMAT model to file', async () => {
    const parsed = parseModel(MINIMAL_MODEL)
    await driver.writeModel('test_FORMAT.md', parsed)

    // Read back and verify
    const model = await driver.readModel('test_FORMAT.md')
    expect(model.frontmatter.title).toBe('Test Model')
  })

  it('read/write round-trip preserves structure', async () => {
    const parsed = parseModel(MINIMAL_MODEL)
    await driver.writeModel('roundtrip_FORMAT.md', parsed)
    const reread = await driver.readModel('roundtrip_FORMAT.md')

    expect(reread.frontmatter.title).toBe('Test Model')
    expect(reread.elements.has('Stakeholders')).toBe(true)
    const elements = reread.elements.get('Stakeholders')!
    expect(elements).toHaveLength(2)
    expect(elements.map((e: { name: string }) => e.name)).toEqual(['Alice', 'Bob'])
  })

  it('throws on non-existent file', async () => {
    await expect(driver.readModel('nonexistent_FORMAT.md')).rejects.toThrow()
  })

  it('listChildren returns taxonomy-derived entries', async () => {
    const filePath = join(tmpDir, 'test_FORMAT.md')
    writeFileSync(filePath, MINIMAL_MODEL, 'utf-8')

    const children = await driver.listChildren('test_FORMAT.md')
    expect(children.length).toBe(2)
    expect(children[0].name).toBe('Alice')
    expect(children[0].kind).toBe('element')
    expect(children[1].name).toBe('Bob')
    expect(children[1].kind).toBe('element')
  })

  it('listAssets returns empty array for FILE mode', async () => {
    const filePath = join(tmpDir, 'test_FORMAT.md')
    writeFileSync(filePath, MINIMAL_MODEL, 'utf-8')

    const assets = await driver.listAssets('test_FORMAT.md')
    expect(assets).toEqual([])
  })
})

describe('Legacy driver-file exports (deprecated wrappers)', () => {
  let tmpDir: string
  let filePath: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'format-driver-file-legacy-'))
    filePath = join(tmpDir, 'legacy_FORMAT.md')
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('readFileModel / writeFileModel round-trip (async)', async () => {
    const parsed = parseModel(MINIMAL_MODEL)
    await writeFileModel(filePath, parsed)
    const reread = await readFileModel(filePath)

    expect(reread.frontmatter.title).toBe('Test Model')
    expect(reread.elements.has('Stakeholders')).toBe(true)
  })

  it('readFileModelSync / writeFileModelSync round-trip', () => {
    const parsed = parseModel(MINIMAL_MODEL)
    writeFileModelSync(filePath, parsed)
    const reread = readFileModelSync(filePath)

    expect(reread.frontmatter.title).toBe('Test Model')
  })

  it('readFileModelSync throws on non-existent file', () => {
    expect(() => readFileModelSync(join(tmpDir, 'nope_FORMAT.md'))).toThrow()
  })

  it('writeFileModel produces valid serialized output', async () => {
    const parsed = parseModel(MINIMAL_MODEL)
    await writeFileModel(filePath, parsed)

    const content = await import('node:fs/promises').then(fs => fs.readFile(filePath, 'utf-8'))
    expect(content).toContain('specification_version: "V_0-1-1"')
    expect(content).toContain('_F Stakeholders')
  })
})
