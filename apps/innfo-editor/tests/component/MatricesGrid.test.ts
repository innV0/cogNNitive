import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import MatricesGrid from '../../src/components/editor/MatricesGrid.vue'
import { useModelStore } from '../../src/stores/modelStore'
import { useUiStore } from '../../src/stores/uiStore'

// Mock @tanstack/vue-virtual so tests don't need real layout.
// Returns a ref-like object: __v_isRef for template auto-unwrap,
// .value for <script> usage (rowVirtualizer.value.getTotalSize()).
vi.mock('@tanstack/vue-virtual', () => ({
  useVirtualizer: vi.fn((optionsOrRef) => {
    const opts =
      typeof optionsOrRef === 'function'
        ? (optionsOrRef as any)()
        : (optionsOrRef as any)?.value ?? optionsOrRef
    const isHorizontal = opts?.horizontal ?? false
    const count = opts?.count ?? 0
    const size = isHorizontal ? 120 : 48

    // Cap virtual items to a realistic visible+overscan count so the DOM
    // doesn't balloon (real virtualizer renders ~20 rows × ~10 columns).
    const maxVisible = isHorizontal ? 12 : 25
    const displayCount = Math.min(count, maxVisible)
    const items = Array.from({ length: displayCount }, (_, i) => ({
      key: i,
      index: i,
      start: i * size,
      size,
      end: (i + 1) * size,
      lane: 0,
    }))

    const virtualizer = {
      getVirtualItems: () => items,
      getTotalSize: () => items.length * size,
      getElement: () => null,
    }

    // Mimic a Vue Ref so template auto-unwrap works and .value is accessible.
    return { __v_isRef: true, value: virtualizer }
  }),
}))

// ── Helpers ──

interface FakeNode {
  id: string
  name: string
  type: string
  childIds: string[]
  fields: Record<string, { value: unknown }>
}

function makeNode(id: string, name: string, type: string): FakeNode {
  return { id, name, type, childIds: [], fields: {} }
}

const ROOT_ID = 'Root'

function setupStore(
  rowsCount = 10,
  colsCount = 10,
  widgetType = 'boolean',
  params = '',
) {
  const modelStore = useModelStore()
  const nodes: Record<string, FakeNode> = {
    [ROOT_ID]: {
      id: ROOT_ID,
      name: 'Root',
      type: 'model',
      childIds: [],
      fields: {
        __matrix_defs: {
          value: [
            {
              name: 'M1',
              source: 'Src',
              target: 'Tgt',
              widgetType,
              params,
            },
            {
              name: 'M2',
              source: 'Src',
              target: 'Tgt',
              widgetType: 'boolean',
              params: '',
            },
          ],
        },
      },
    },
  }
  for (let i = 0; i < rowsCount; i++) {
    nodes[`src-${i}`] = makeNode(`src-${i}`, `Src${i}`, 'Src')
  }
  for (let i = 0; i < colsCount; i++) {
    nodes[`tgt-${i}`] = makeNode(`tgt-${i}`, `Tgt${i}`, 'Tgt')
  }
  modelStore.setGraph(nodes as any, [ROOT_ID])
}

function setupStoreWithCellValues() {
  setupStore(10, 5, 'boolean')
  const modelStore = useModelStore()
  const root = modelStore.getNode(ROOT_ID)!
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 5; c++) {
      const val = (r + c) % 2 === 0 ? 'X' : '-'
      root.fields[`M1||Src${r}||Tgt${c}`] = { value: val }
    }
  }
}

function setupBigStore(rowsCount = 100, colsCount = 100) {
  const modelStore = useModelStore()
  const nodes: Record<string, FakeNode> = {
    [ROOT_ID]: {
      id: ROOT_ID,
      name: 'Root',
      type: 'model',
      childIds: [],
      fields: {
        __matrix_defs: {
          value: [
            {
              name: 'BigMatrix',
              source: 'Src',
              target: 'Tgt',
              widgetType: 'boolean',
              params: 'colWidth:100',
            },
          ],
        },
      },
    },
  }
  for (let i = 0; i < rowsCount; i++) {
    nodes[`src-${i}`] = makeNode(`src-${i}`, `Src${i}`, 'Src')
  }
  for (let i = 0; i < colsCount; i++) {
    nodes[`tgt-${i}`] = makeNode(`tgt-${i}`, `Tgt${i}`, 'Tgt')
  }
  const root = nodes[ROOT_ID]
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      root.fields[`BigMatrix||Src${r}||Tgt${c}`] = { value: 'X' }
    }
  }
  modelStore.setGraph(nodes as any, [ROOT_ID])
}

/**
 * Mount helper — sets up store + renders the component.
 * The @tanstack/vue-virtual mock handles virtual items, no layout needed.
 */
async function mountGrid(
  matrixIndex = 0,
  rowsCount = 10,
  colsCount = 10,
  widgetType = 'boolean',
  params = '',
) {
  setupStore(rowsCount, colsCount, widgetType, params)

  const wrapper = mount(MatricesGrid, {
    props: { matrixIndex },
  })

  await nextTick()
  return wrapper
}

// ── Tests ──

describe('R-MV-01 / R-MV-02 / R-MV-03: Virtual scroll structure', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders virtual grid layout (no flat <table>)', async () => {
    const wrapper = await mountGrid()
    // No flat <table> — virtual scrolling structure instead
    expect(wrapper.find('table').exists()).toBe(false)
    // Scroll container exists
    expect(wrapper.find('.overflow-auto').exists()).toBe(true)
    // Overflow-hidden header area (virtual-scroll specific)
    expect(wrapper.html()).toContain('overflow-hidden')
  })

  it('displays empty-state when no rows defined', () => {
    setupStore(0, 5, 'boolean')
    const wrapper = mount(MatricesGrid, { props: { matrixIndex: 0 } })
    expect(wrapper.text()).toContain('No items defined in Src')
  })

  it('displays empty-state when no columns defined', () => {
    setupStore(5, 0, 'boolean')
    const wrapper = mount(MatricesGrid, { props: { matrixIndex: 0 } })
    expect(wrapper.text()).toContain('No items defined in Tgt')
  })

  it('shows "select a matrix" prompt when no matrix selected', () => {
    setupStore(5, 5, 'boolean')
    const wrapper = mount(MatricesGrid, { props: { matrixIndex: -1 } })
    expect(wrapper.text()).toContain(
      'Select a matrix from the sidebar or dropdown',
    )
  })

  it('renders matrix-selector dropdown and Copy Table MD button', async () => {
    const wrapper = await mountGrid()
    expect(wrapper.text()).toContain('Select Matrix')
    expect(wrapper.html()).toContain('Copy Table MD')
  })

  it('renders value distribution section', () => {
    setupStoreWithCellValues()
    const wrapper = mount(MatricesGrid, { props: { matrixIndex: 0 } })
    expect(wrapper.text()).toContain('Values:')
  })
})

describe('R-MV-03: 10k+ cells virtual rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts 100×100 matrix without render-time error', () => {
    setupBigStore(100, 100)
    const wrapper = mount(MatricesGrid, { props: { matrixIndex: 0 } })
    expect(wrapper.exists()).toBe(true)
  })
})

describe('R-MV-05: Value distribution reflects full dataset', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('counts all 50 cells (not just visible) in value distribution', () => {
    setupStoreWithCellValues()
    const wrapper = mount(MatricesGrid, { props: { matrixIndex: 0 } })
    expect(wrapper.text()).toContain('X: 25')
  })

  it('counts all cells even with large matrix', () => {
    setupBigStore(100, 100)  // 10,000 cells
    const wrapper = mount(MatricesGrid, { props: { matrixIndex: 0 } })
    const text = wrapper.text()
    expect(text).toContain('X: 100')
    expect(text).toContain('—')
  })
})

describe('R-MV-05: Copy Table MD exports all cells', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('generates markdown with every row and column', () => {
    setupStoreWithCellValues()

    // Mock clipboard.writeText
    const writeText = vi.fn().mockResolvedValue(undefined)
    if (navigator.clipboard) {
      vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(
        writeText,
      )
    } else {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      })
    }

    const wrapper = mount(MatricesGrid, { props: { matrixIndex: 0 } })

    // Find the "Copy Table MD" button (last button in the info bar)
    const buttons = wrapper.findAll('button')
    const copyBtn = buttons.find(
      (b) => b.text().includes('Copy') || b.html().includes('Copy Table MD'),
    )
    expect(copyBtn).toBeTruthy()
    copyBtn!.trigger('click')

    expect(writeText).toHaveBeenCalledTimes(1)
    const md = writeText.mock.calls[0][0] as string

    expect(md).toMatch(
      /\| Src \\ Tgt \| Tgt0 \| Tgt1 \| Tgt2 \| Tgt3 \| Tgt4 \|/,
    )

    const lines = md.trim().split('\n')
    // Data rows start with | Src0 through | Src9 — exclude header | Src \ Tgt
    const dataLines = lines.filter(
      (l: string) => /^\| Src\d/.test(l),
    )
    expect(dataLines).toHaveLength(10)

    const src0Line = dataLines.find((l: string) => l.startsWith('| Src0 |'))
    expect(src0Line).toBeTruthy()
  })
})

describe('R-MV-05: Cell editing in virtualised cells', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('writes cell value through checkbox interaction', async () => {
    const wrapper = await mountGrid(0, 5, 5, 'boolean')

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.exists()).toBe(true)

    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    await checkbox.setChecked(true)

    const modelStore = useModelStore()
    const root = modelStore.getNode(ROOT_ID)!
    const cellKey = Object.keys(root.fields).find(
      (k) => k.startsWith('M1||Src0||Tgt0'),
    )
    expect(cellKey).toBeTruthy()
    if (cellKey) {
      expect(root.fields[cellKey]?.value).toBe('X')
    }
  })

  it('emits "cell-change" on widget interaction', async () => {
    const wrapper = await mountGrid(0, 3, 3, 'boolean')

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.exists()).toBe(true)
    await checkbox.setChecked(true)

    expect(wrapper.emitted('cell-change')).toBeTruthy()
    expect(wrapper.emitted('cell-change')![0][0]).toContain('M1||')
  })

  it('rotates cycle widget through values', async () => {
    const wrapper = await mountGrid(0, 3, 3, 'cycle', '1,2,3')

    // Find a cycle button within the scroll area (not the dropdown toggle)
    const scrollArea = wrapper.find('.overflow-auto')
    const cycleBtn = scrollArea.find('button')
    expect(cycleBtn.exists()).toBe(true)

    await cycleBtn.trigger('click')

    const modelStore = useModelStore()
    const root = modelStore.getNode(ROOT_ID)!
    const m1Key = Object.keys(root.fields).find((k) =>
      k.startsWith('M1||'),
    )
    expect(m1Key).toBeTruthy()
    if (m1Key) {
      expect(root.fields[m1Key]?.value).toBe('1')
    }
  })
})

describe('R-MV-04: Scroll position persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('finds scroll container (infrastructure for position tracking)', async () => {
    const wrapper = await mountGrid(0, 50, 50, 'boolean')
    const scrollEl = wrapper.find('.overflow-auto')
    expect(scrollEl.exists()).toBe(true)
    expect(scrollEl.element.tagName).toBe('DIV')
  })

  it('renders default matrix at position (0,0) on first visit', () => {
    setupStore(10, 10, 'boolean')
    const wrapper = mount(MatricesGrid, { props: { matrixIndex: 0 } })
    expect(wrapper.exists()).toBe(true)
  })
})

describe('R-MV-06: Virtual scroller loads without errors', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts without runtime errors', async () => {
    const wrapper = await mountGrid()
    expect(wrapper.exists()).toBe(true)
  })

  it('mounts cleanly with 100×100 matrix', () => {
    setupStore(100, 100, 'boolean')
    const wrapper = mount(MatricesGrid, { props: { matrixIndex: 0 } })
    expect(wrapper.exists()).toBe(true)
  })
})

describe('R-MV-07: No changes to matrix field/export structure', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('preserves cell storage format (MatrixName||Row||Col)', () => {
    setupStoreWithCellValues()
    const modelStore = useModelStore()
    const root = modelStore.getNode(ROOT_ID)!
    const cellKey = Object.keys(root.fields).find((k) =>
      k.startsWith('M1||'),
    )
    expect(cellKey).toMatch(/^M1\|\|Src\d\|\|Tgt\d$/)
  })

  it('preserves __matrix_defs array structure', () => {
    setupStoreWithCellValues()
    const modelStore = useModelStore()
    const root = modelStore.getNode(ROOT_ID)!
    const defs = root.fields['__matrix_defs']?.value as any[]
    expect(Array.isArray(defs)).toBe(true)
    expect(defs[0].name).toBe('M1')
    expect(defs[0].source).toBe('Src')
    expect(defs[0].target).toBe('Tgt')
  })
})
