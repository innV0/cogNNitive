import { describe, it, expect } from 'vitest'
import { validateFormatContent } from '../../src/shared/validator'

const validModel = `---
specification_version: "V_0-1-1"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-1-2"
title: "Ghostbusters"
---

> [!NOTE] This is a FORMAT business model.

# _F index
- Stakeholders
- MarketSegments

# _F Stakeholders
* _F Stakeholders: Ghostbusters Inc.
`

describe('validateFormatContent', () => {
  it('returns all expected check IDs', () => {
    const report = validateFormatContent(validModel, 'Ghostbusters_V_0-1-2_business_FORMAT.md')
    const ids = report.checks.map(c => c.id).sort()
    // 13 checks total: 7 frontmatter + 4 body + 2 convention
    expect(ids).toContain('fm-level')
    expect(ids).toContain('fm-parent')
    expect(ids).toContain('fm-version')
    expect(ids).toContain('fm-version-format')
    expect(ids).toContain('fm-title')
    expect(ids).toContain('fm-spec-version')
    expect(ids).toContain('body-note')
    expect(ids).toContain('body-index')
    expect(ids).toContain('body-concept-sections')
    expect(ids).toContain('body-element-markers')
    expect(ids).toContain('conv-file-naming')
    // conv-wikilinks only fires when index has [[wikilinks]], which our test model doesn't use
    expect(ids.length).toBeGreaterThanOrEqual(11)
  })

  it('passes frontmatter checks for valid model', () => {
    const report = validateFormatContent(validModel, 'test_FORMAT.md')
    const frontmatterChecks = report.checks.filter(c => c.category === 'frontmatter')
    expect(frontmatterChecks.every(c => c.passed)).toBe(true)
  })

  it('detects missing frontmatter fields', () => {
    const noTitle = validModel.replace(/^title:.*$/m, '')
    const report = validateFormatContent(noTitle, 'test_FORMAT.md')
    const titleCheck = report.checks.find(c => c.id === 'fm-title')
    expect(titleCheck?.passed).toBe(false)
    expect(titleCheck?.message).toContain('Missing title')
  })

  it('detects invalid version format', () => {
    const badVersion = validModel.replace(/^model_version:.*$/m, 'model_version: "bad"')
    const report = validateFormatContent(badVersion, 'test_FORMAT.md')
    const versionCheck = report.checks.find(c => c.id === 'fm-version-format')
    expect(versionCheck?.passed).toBe(false)
  })

  it('flags missing _F element markers', () => {
    const noMarkers = validModel.replace(/\* _F Stakeholders:.*$/m, '* Stakeholders: Ghostbusters Inc.')
    const report = validateFormatContent(noMarkers, 'test_FORMAT.md')
    const markerCheck = report.checks.find(c => c.id === 'body-element-markers')
    expect(markerCheck?.passed).toBe(false)
  })

  it('returns structured summary with totals', () => {
    const report = validateFormatContent(validModel, 'test_FORMAT.md')
    expect(report.summary).toHaveProperty('total')
    expect(report.summary).toHaveProperty('passed')
    expect(report.summary).toHaveProperty('errors')
    expect(report.summary).toHaveProperty('warnings')
    expect(report.summary.total).toBeGreaterThan(0)
  })
})
