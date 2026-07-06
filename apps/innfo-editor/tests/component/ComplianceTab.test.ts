import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ComplianceTab from '../../src/components/editor/ComplianceTab.vue'
import type { ValidationReport } from '../../src/shared/validation-types'

function makeReport(
  checks: Array<{
    id: string
    label: string
    passed: boolean
    severity?: 'error' | 'warning'
    message?: string
    category?: string
  }>,
): ValidationReport {
  const c = checks.map((ch, i) => ({
    id: ch.id ?? `check-${i}`,
    label: ch.label,
    passed: ch.passed,
    severity: ch.severity ?? 'error',
    message: ch.message,
    category: ch.category ?? 'general',
  }))

  return {
    checks: c,
    summary: {
      total: c.length,
      passed: c.filter((ch) => ch.passed).length,
      errors: c.filter((ch) => !ch.passed && ch.severity === 'error').length,
      warnings: c.filter((ch) => !ch.passed && ch.severity === 'warning').length,
    },
  }
}

describe('ComplianceTab.vue — R-SC-07 (Compliance tab)', () => {
  it('shows all-passed summary when all checks pass', () => {
    const report = makeReport([
      { id: 'task-name', label: 'Task name required', passed: true, category: 'task' },
      { id: 'task-status', label: 'Task status set', passed: true, category: 'task' },
    ])

    const wrapper = mount(ComplianceTab, {
      props: { report, conceptType: 'Task' },
    })

    expect(wrapper.text()).toContain('Validation for')
    expect(wrapper.text()).toContain('Task')
    expect(wrapper.text()).toContain('2/2')
    expect(wrapper.text()).toContain('All good')
  })

  it('filters checks to those scoped to the concept type by id', () => {
    const report = makeReport([
      { id: 'task-name', label: 'Task name', passed: true, category: 'task' },
      { id: 'phase-name', label: 'Phase name', passed: true, category: 'phase' },
    ])

    const wrapper = mount(ComplianceTab, {
      props: { report, conceptType: 'Task' },
    })

    expect(wrapper.text()).toContain('Task name')
    expect(wrapper.text()).not.toContain('Phase name')
  })

  it('filters checks to those scoped to the concept type by label', () => {
    const report = makeReport([
      {
        id: 'name-check',
        label: 'Task description required',
        passed: false,
        severity: 'error',
        message: 'Missing description',
        category: 'task',
      },
      { id: 'other', label: 'Milestone date', passed: true, category: 'milestone' },
    ])

    const wrapper = mount(ComplianceTab, {
      props: { report, conceptType: 'Task' },
    })

    expect(wrapper.text()).toContain('Task description required')
    expect(wrapper.text()).toContain('Missing description')
    expect(wrapper.text()).not.toContain('Milestone date')
  })

  it('includes frontmatter checks for all concept types', () => {
    const report = makeReport([
      {
        id: 'frontmatter-version',
        label: 'Spec version present',
        passed: true,
        category: 'frontmatter',
      },
      { id: 'task-name', label: 'Task name', passed: true, category: 'task' },
    ])

    const wrapper = mount(ComplianceTab, {
      props: { report, conceptType: 'Phase' },
    })

    // Frontmatter checks are included for all concept types
    expect(wrapper.text()).toContain('Spec version present')
  })

  it('shows error count and styling when checks fail', () => {
    const report = makeReport([
      {
        id: 'task-name',
        label: 'Task name required',
        passed: false,
        severity: 'error',
        message: 'Name is empty',
        category: 'task',
      },
      { id: 'task-status', label: 'Task status', passed: true, category: 'task' },
    ])

    const wrapper = mount(ComplianceTab, {
      props: { report, conceptType: 'Task' },
    })

    expect(wrapper.text()).toContain('1/2')
    expect(wrapper.text()).toContain('1 error')
    expect(wrapper.text()).toContain('Task name required')
    expect(wrapper.text()).toContain('Name is empty')
    expect(wrapper.text()).not.toContain('All good')
  })

  it('shows warning count when warnings exist', () => {
    const report = makeReport([
      {
        id: 'task-name',
        label: 'Task name',
        passed: false,
        severity: 'warning',
        message: 'Consider a more descriptive name',
        category: 'task',
      },
      { id: 'task-status', label: 'Task status', passed: true, category: 'task' },
    ])

    const wrapper = mount(ComplianceTab, {
      props: { report, conceptType: 'Task' },
    })

    expect(wrapper.text()).toContain('1/2')
    expect(wrapper.text()).toContain('1 warning')
  })

  it('shows empty state when no checks match the concept type', () => {
    const report = makeReport([
      { id: 'phase-name', label: 'Phase name', passed: true, category: 'phase' },
    ])

    const wrapper = mount(ComplianceTab, {
      props: { report, conceptType: 'Task' },
    })

    expect(wrapper.text()).toContain('No validation checks for this concept type.')
  })

  it('shows empty state when report has no checks at all', () => {
    const report = makeReport([])

    const wrapper = mount(ComplianceTab, {
      props: { report, conceptType: 'Task' },
    })

    expect(wrapper.text()).toContain('No validation checks for this concept type.')
  })
})
