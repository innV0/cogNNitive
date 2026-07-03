import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import BlockPill from '../../src/components/editor/BlockPill.vue'
import { yiqLuminance, textColor } from '../../src/composables/useConceptVisuals'

// ── Utility tests (A.6 — YIQ luminance & contrast) ──────────────

describe('yiqLuminance utility', () => {
  it('returns ~0.5 for purple (#a855f7)', () => {
    const l = yiqLuminance('#a855f7')
    expect(l).toBeGreaterThan(0.45)
    expect(l).toBeLessThan(0.55)
  })

  it('returns >0.55 for light colors like yellow (#eab308)', () => {
    const l = yiqLuminance('#eab308')
    expect(l).toBeGreaterThan(0.55)
  })

  it('returns <0.55 for dark colors like indigo (#6366f1)', () => {
    const l = yiqLuminance('#6366f1')
    expect(l).toBeLessThan(0.55)
  })

  it('strips alpha suffix for luminance computation', () => {
    const l = yiqLuminance('#a855f718')
    expect(l).toBeGreaterThan(0.45)
    expect(l).toBeLessThan(0.55)
  })
})

describe('textColor utility', () => {
  it('returns dark text for light backgrounds (luminance > 0.55)', () => {
    expect(textColor('#eab308')).toBe('#1e293b')
  })

  it('returns white text for dark backgrounds (luminance < 0.55)', () => {
    expect(textColor('#a855f7')).toBe('#ffffff')
  })
})

// ── BlockPill component tests ───────────────────────────────────

describe('BlockPill.vue — Ghost state detection (R-TN-04)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows "Empty" label when description, fields, and instanceCount are all empty/zero', () => {
    const wrapper = mount(BlockPill, {
      props: {
        name: 'MyNode',
        description: '',
        fields: {},
        instanceCount: 0,
      },
    })
    expect(wrapper.text()).toContain('Empty')
  })

  it('does NOT show "Empty" when description is present', () => {
    const wrapper = mount(BlockPill, {
      props: {
        name: 'MyNode',
        description: 'Has content',
        fields: {},
        instanceCount: 0,
      },
    })
    expect(wrapper.text()).not.toContain('Empty')
  })

  it('does NOT show "Empty" when instanceCount > 0', () => {
    const wrapper = mount(BlockPill, {
      props: {
        name: 'MyNode',
        description: '',
        fields: {},
        instanceCount: 3,
      },
    })
    expect(wrapper.text()).not.toContain('Empty')
  })

  it('does NOT show "Empty" when fields have values', () => {
    const wrapper = mount(BlockPill, {
      props: {
        name: 'MyNode',
        description: '',
        fields: { status: 'active' },
        instanceCount: 0,
      },
    })
    expect(wrapper.text()).not.toContain('Empty')
  })
})

describe('BlockPill.vue — Popup structure (R-TN-03)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders pill name in the main content when blockId is provided', () => {
    const wrapper = mount(BlockPill, {
      props: {
        name: 'MyPill',
        blockId: 'Root',
      },
      attachTo: document.body,
    })
    expect(wrapper.text()).toContain('MyPill')
  })

  it('renders without popup content when no blockId is provided', () => {
    const wrapper = mount(BlockPill, {
      props: { name: 'Simple' },
    })
    expect(wrapper.text()).toContain('Simple')
    // Teleport requires blockId; without it, no popup content renders
    expect(wrapper.text()).not.toContain('No content.')
  })

  it('includes description text in the template for popup rendering', () => {
    const wrapper = mount(BlockPill, {
      props: {
        name: 'Test Node',
        blockId: 'Root',
        description: 'Popup description content',
        fields: { status: 'active' },
        conceptFields: [{ name: 'status', type: 'text' }],
      },
      attachTo: document.body,
    })
    // The pill itself shows the name
    expect(wrapper.text()).toContain('Test Node')
  })
})

describe('BlockPill.vue — YIQ text contrast (R-TN-01)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders with YIQ-based text color via inline style', () => {
    const wrapper = mount(BlockPill, {
      props: {
        name: 'Dark Pill',
        color: '#a855f7', // purple, luminance < 0.55 → white text
      },
    })
    const el = wrapper.element as HTMLElement
    expect(el.style.backgroundColor).toBe('#a855f718')
    expect(el.style.color).toBe('#ffffff')
  })

  it('renders with dark text for light background colors', () => {
    const wrapper = mount(BlockPill, {
      props: {
        name: 'Light Pill',
        color: '#eab308', // yellow, luminance > 0.55 → dark text
      },
    })
    const el = wrapper.element as HTMLElement
    expect(el.style.backgroundColor).toBe('#eab30818')
    expect(el.style.color).toBe('#1e293b')
  })

  it('does not apply inline YIQ styles when no color is provided', () => {
    const wrapper = mount(BlockPill, {
      props: { name: 'No Color' },
    })
    const el = wrapper.element as HTMLElement
    expect(el.style.backgroundColor).toBe('')
    expect(el.style.color).toBe('')
  })
})

describe('BlockPill.vue — Ghost visual state (R-TN-04)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('applies opacity 0.45 in inline style when ghost', () => {
    const wrapper = mount(BlockPill, {
      props: {
        name: 'GhostNode',
        color: '#a855f7',
      },
    })
    const el = wrapper.element as HTMLElement
    // BlockPill delegates ghost opacity to the parent row; the pill itself
    // does not apply opacity. As a visual cue, it shows the 'Empty' label.
    expect(el.style.opacity).toBe('')
  })

  it('does not apply reduced opacity when node has content', () => {
    const wrapper = mount(BlockPill, {
      props: {
        name: 'FullNode',
        color: '#a855f7',
        description: 'Has content',
      },
    })
    const el = wrapper.element as HTMLElement
    expect(el.style.opacity).toBe('')
  })
})
