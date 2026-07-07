import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { resolveParentChainNode } from './resolver-node'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-resolver')
const cacheDir = join(rootDir, '.spec-cache')
const specsDir = join(rootDir, 'specs')

describe('NodeSpecResolver', () => {
  beforeEach(async () => {
    // Reset/clean temp directory
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(specsDir, { recursive: true })
    await mkdir(cacheDir, { recursive: true })
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('R-LSR-01: resolves spec from local specs/ directory recursively', async () => {
    // Setup nested spec file: specs/domain-a/business_V_0-1-1_NN.md
    const subDir = join(specsDir, 'domain-a')
    await mkdir(subDir, { recursive: true })
    const localSpecPath = join(subDir, 'business_V_0-1-1_NN.md')
    const specContent = [
      '---',
      'spec_version: "V_0-1-1"',
      'level: 2',
      'title: "Local Business Spec"',
      '---',
      'Local Content',
    ].join('\n')
    await writeFile(localSpecPath, specContent, 'utf-8')

    const fetchSpy = vi.spyOn(global, 'fetch')

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/business_V_0-1-1_NN.md',
      'business_V_0-1-1',
      cacheDir,
    )

    // Verify it read from the local file and didn't fetch
    expect(fetchSpy).not.toHaveBeenCalled()
    const doc = result.specs.get('business_V_0-1-1')
    expect(doc).toBeDefined()
    expect(doc?.rawContent).toBe(specContent)
    expect(doc?.frontmatter.title).toBe('Local Business Spec')
  })

  it('R-LSR-01: matches unversioned local spec filename via frontmatter spec_version', async () => {
    // Setup unversioned spec file: specs/latest/level2/business_NN.md
    const subDir = join(specsDir, 'latest', 'level2')
    await mkdir(subDir, { recursive: true })
    const localSpecPath = join(subDir, 'business_NN.md')
    const specContent = [
      '---',
      'spec_version: "V_0-1-1"',
      'level: 2',
      'title: "Unversioned File But Correct Version"',
      '---',
      'Unversioned Content',
    ].join('\n')
    await writeFile(localSpecPath, specContent, 'utf-8')

    const fetchSpy = vi.spyOn(global, 'fetch')

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/business_V_0-1-1_NN.md',
      'business_V_0-1-1',
      cacheDir,
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    const doc = result.specs.get('business_V_0-1-1')
    expect(doc).toBeDefined()
    expect(doc?.rawContent).toBe(specContent)
  })

  it('R-LSR-01: bypasses local file if version mismatches and falls back to network', async () => {
    // Setup local spec file with mismatched version: specs/business_V_0-1-0_NN.md
    const localSpecPath = join(specsDir, 'business_V_0-1-0_NN.md')
    await writeFile(
      localSpecPath,
      ['---', 'spec_version: "V_0-1-0"', 'level: 2', '---'].join('\n'),
      'utf-8',
    )

    // Mock fetch for the correct version
    const remoteContent = [
      '---',
      'spec_version: "V_0-1-1"',
      'level: 2',
      'title: "Remote Business Spec"',
      '---',
      'Remote Content',
    ].join('\n')

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(remoteContent),
      } as Response),
    )

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/business_V_0-1-1_NN.md',
      'business_V_0-1-1',
      cacheDir,
    )

    // Should fetch from network since local version was 0-1-0 and requested was 0-1-1
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const doc = result.specs.get('business_V_0-1-1')
    expect(doc?.frontmatter.title).toBe('Remote Business Spec')

    // Verify it was cached in .spec-cache
    const cachedFile = await readFile(join(cacheDir, 'business_V_0-1-1_NN.md'), 'utf-8')
    expect(cachedFile).toBe(remoteContent)
  })

  it('R-LSR-02: fetches from network and caches in .spec-cache when not found locally', async () => {
    const remoteContent = [
      '---',
      'spec_version: "V_0-2-0"',
      'level: 1',
      'title: "Remote Spec"',
      '---',
    ].join('\n')

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(remoteContent),
      } as Response),
    )

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/iNNfo_V_0-2-0_NN.md',
      'iNNfo_V_0-2-0',
      cacheDir,
    )

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result.specs.has('iNNfo_V_0-2-0')).toBe(true)

    // Verify cached on disk
    const cachedContent = await readFile(join(cacheDir, 'iNNfo_V_0-2-0_NN.md'), 'utf-8')
    expect(cachedContent).toBe(remoteContent)
  })

  it('R-LSR-02: loads from .spec-cache on subsequent requests without network fetch', async () => {
    // Setup file in .spec-cache/iNNfo_V_0-2-0_NN.md
    const cachedContent = [
      '---',
      'spec_version: "V_0-2-0"',
      'level: 1',
      'title: "Cached Spec"',
      '---',
    ].join('\n')
    await writeFile(join(cacheDir, 'iNNfo_V_0-2-0_NN.md'), cachedContent, 'utf-8')

    const fetchSpy = vi.spyOn(global, 'fetch')

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/iNNfo_V_0-2-0_NN.md',
      'iNNfo_V_0-2-0',
      cacheDir,
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    const doc = result.specs.get('iNNfo_V_0-2-0')
    expect(doc?.frontmatter.title).toBe('Cached Spec')
  })
})
