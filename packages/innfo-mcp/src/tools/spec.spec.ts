import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile } from 'node:fs/promises'
import { getSpec, getTemplateFromUrl, getTemplateFromModel } from './spec'
import { validateModel } from './mutate'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-spec')
const specsDir = join(rootDir, 'specs')
const cacheDir = join(rootDir, '.spec-cache')

/** Write the level-1 + level-0 spec chain locally so resolution never hits the network. */
async function stubSpecChain() {
  await writeFile(
    join(specsDir, 'iNNfo_V_0-1-0_NN.md'),
    [
      '---',
      'spec_version: "V_0-1-0"',
      'level: 1',
      'title: "Local iNNfo Spec"',
      'parent_spec:',
      '  name: "defiNNe_V_0-1-0"',
      '  url: "https://example.com/defiNNe_V_0-1-0_NN.md"',
      '---',
    ].join('\n'),
    'utf-8',
  )
  await writeFile(
    join(specsDir, 'defiNNe_V_0-1-0_NN.md'),
    ['---', 'spec_version: "V_0-1-0"', 'level: 0', 'title: "Local defiNNe Spec"', '---'].join('\n'),
    'utf-8',
  )
}

/** Write a level-2 template resolving up to the stubbed level-1 chain. */
async function stubTemplateChain() {
  await writeFile(
    join(specsDir, 'business_V_0-2-0_NN.md'),
    [
      '---',
      'spec_version: "V_0-2-0"',
      'level: 2',
      'title: "Local Business Template"',
      'parent_spec:',
      '  name: "iNNfo_V_0-1-0"',
      '  url: "https://example.com/iNNfo_V_0-1-0_NN.md"',
      '---',
    ].join('\n'),
    'utf-8',
  )
  await stubSpecChain()
}

describe('Spec Tools Integration (URL- and model-derived, no hardcoding)', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(specsDir, { recursive: true })
    await mkdir(cacheDir, { recursive: true })
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('getSpec resolves from an explicit url (level-1), no fetch when local', async () => {
    await stubSpecChain()
    const fetchSpy = vi.spyOn(global, 'fetch')

    const { spec } = await getSpec(rootDir, {
      url: 'https://example.com/iNNfo_V_0-1-0_NN.md',
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(spec).not.toBeNull()
    expect(spec?.level).toBe(1)
    expect(spec?.frontmatter.title).toBe('Local iNNfo Spec')
  })

  it('getSpec derives the url from a loaded model_id via parent_spec.url', async () => {
    await stubTemplateChain()
    await writeFile(
      join(rootDir, 'MyModel_V_1-0-0_business_NN.md'),
      [
        '---',
        'spec_version: "V_0-2-0"',
        'level: 3',
        'model_version: "V_1-0-0"',
        'parent_spec:',
        '  name: "business_V_0-2-0"',
        '  url: "https://example.com/business_V_0-2-0_NN.md"',
        '---',
      ].join('\n'),
      'utf-8',
    )
    const fetchSpy = vi.spyOn(global, 'fetch')

    const { spec } = await getSpec(rootDir, { modelId: 'MyModel_V_1-0-0_business' })

    expect(fetchSpy).not.toHaveBeenCalled()
    // get_spec always returns the level-1 iNNfo spec from the resolved chain
    expect(spec?.level).toBe(1)
    expect(spec?.frontmatter.title).toBe('Local iNNfo Spec')
  })

  it('getSpec with neither url nor model_id returns null without fetching', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')

    const { spec, specCache } = await getSpec(rootDir, {})

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(spec).toBeNull()
    expect(specCache).toBeNull()
  })

  it('getTemplateFromUrl resolves a template from an explicit url', async () => {
    await stubTemplateChain()
    const fetchSpy = vi.spyOn(global, 'fetch')

    const template = await getTemplateFromUrl(
      rootDir,
      'https://example.com/business_V_0-2-0_NN.md',
      'business_V_0-2-0',
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(template).not.toBeNull()
    expect(template?.frontmatter.title).toBe('Local Business Template')
  })

  it('getTemplateFromModel derives the template from a model parent_spec.url', async () => {
    await stubTemplateChain()
    await writeFile(
      join(rootDir, 'MyModel_V_1-0-0_business_NN.md'),
      [
        '---',
        'spec_version: "V_0-2-0"',
        'level: 3',
        'parent_spec:',
        '  name: "business_V_0-2-0"',
        '  url: "https://example.com/business_V_0-2-0_NN.md"',
        '---',
      ].join('\n'),
      'utf-8',
    )
    const fetchSpy = vi.spyOn(global, 'fetch')

    const template = await getTemplateFromModel(rootDir, 'MyModel_V_1-0-0_business')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(template?.frontmatter.title).toBe('Local Business Template')
  })

  it('getTemplateFromModel returns null when the model has no parent_spec.url', async () => {
    await writeFile(
      join(rootDir, 'Orphan_NN.md'),
      ['---', 'spec_version: "V_0-2-0"', 'level: 3', 'title: "Orphan"', '---'].join('\n'),
      'utf-8',
    )
    const template = await getTemplateFromModel(rootDir, 'Orphan')
    expect(template).toBeNull()
  })

  it('validateModel without a resolvable parent_spec.url validates structurally with a warning', async () => {
    const content = [
      '---',
      'spec_version: "V_0-2-0"',
      'level: 3',
      'title: "No Parent Model"',
      '---',
      '',
      '> [!NOTE]',
      '> iNNfo document.',
      '',
      '# _NN index',
    ].join('\n')

    const result = await validateModel(rootDir, undefined, content)

    expect(result.warnings.some((w) => /no template resolved/i.test(w.message))).toBe(true)
  })
})
