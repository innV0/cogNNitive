<template>
  <div class="flex-1 flex flex-col min-h-0">
    <!-- Matrix Dropdown Selector Header -->
    <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 shrink-0 mb-4 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Select Matrix:</span>
        <div v-if="matrixDefs.length" ref="dropdownRef" class="relative">
          <button
            @click="isOpen = !isOpen"
            class="min-w-[200px] flex items-center justify-between gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:border-slate-300 dark:hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer transition-all"
          >
            <span class="truncate">{{ activeMatrix ? activeMatrix.name : 'Select Matrix' }}</span>
            <ChevronDown class="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="isOpen"
            class="absolute left-0 z-20 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg py-1 max-h-60 overflow-y-auto"
          >
            <MatrixPill
              v-for="(matrix, idx) in matrixDefs"
              :key="matrix.name"
              :name="matrix.name"
              :source="matrix.source"
              :target="matrix.target"
              :label="matrix.label"
              :selected="activeMatrixIndex === idx"
              :full-width="true"
              interactive
              show-source-target
              as="button"
              @click="selectMatrix(idx)"
            />
          </div>
        </div>
        <div v-else class="text-slate-400 dark:text-slate-500 text-xs italic">
          No relational matrices defined. Define them in Metamatrix Config.
        </div>
      </div>

      <div v-if="activeMatrix" class="text-slate-400 dark:text-slate-500 text-xs font-medium">
        Total: {{ matrixDefs.length }} matrices
      </div>
    </div>

    <!-- When no matrix is selected, show a prompt -->
    <div v-if="activeMatrixIndex < 0" class="flex-1 flex items-center justify-center">
      <div class="text-slate-400 dark:text-slate-500 text-xs italic text-center">
        Select a matrix from the sidebar or dropdown to begin.
      </div>
    </div>

    <!-- Active Matrix View -->
    <div v-else-if="activeMatrix" class="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Matrix:</span>
          <BlockPill kind="concept" :concept-type="activeMatrix.source" />
          <span class="text-slate-400 dark:text-slate-500">&rarr;</span>
          <BlockPill kind="concept" :concept-type="activeMatrix.target" />
          <Badge class="text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400">{{ activeMatrix.widgetType }}</Badge>
        </div>

        <button
          @click="copyMatrixMarkdown"
          class="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs"
        >
          <Copy class="w-3 h-3 text-slate-500 dark:text-slate-400" />
          Copy Table MD
        </button>
      </div>

      <!-- Value Distribution Card -->
      <div v-if="Object.keys(valueDistribution).length > 0" class="mb-3 flex items-center gap-1.5 flex-wrap text-xs">
        <span class="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">Values:</span>
        <span
          v-for="(count, value) in valueDistribution"
          :key="value"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold border"
          :class="getDistClasses(value)"
        >
          {{ value === '-' ? '\u2014' : value }}: {{ count }}
        </span>
      </div>

      <!-- Relational Data Table -->
      <div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto max-w-full">
        <table class="min-w-full border-collapse text-xs">
          <thead class="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th class="border-r border-slate-200 dark:border-slate-700 px-4 py-3 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900/60 min-w-[150px]">
                <div class="flex items-center gap-1 flex-wrap">
                  <BlockPill kind="concept" :concept-type="activeMatrix.source" />
                  <span class="text-slate-400 dark:text-slate-500 font-normal">\</span>
                  <BlockPill kind="concept" :concept-type="activeMatrix.target" />
                </div>
              </th>
              <th
                v-for="col in columns"
                :key="col"
                class="px-3 py-3 text-center min-w-[100px] border-r border-slate-100 dark:border-slate-800"
              >
                <BlockPill kind="instance" :concept-type="activeMatrix.target" :name="col" :interactive="true" :block-id="resolveBlockId(col, activeMatrix.target)" />
              </th>
              <th v-if="!columns.length" class="px-3 py-3 text-center font-bold text-slate-400 dark:text-slate-500">
                No items defined in {{ activeMatrix.target }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="row in rows" :key="row">
              <td class="border-r border-slate-200 dark:border-slate-700 px-4 py-2.5 sticky left-0 bg-white dark:bg-slate-900 shadow-2xs min-w-[150px]">
                <BlockPill kind="instance" :concept-type="activeMatrix.source" :name="row" :interactive="true" :block-id="resolveBlockId(row, activeMatrix.source)" />
              </td>

              <td
                v-for="col in columns"
                :key="col"
                class="px-2 py-2 text-center border-r border-slate-100 dark:border-slate-800"
                :class="getHeatmapClasses(row, col)"
              >
                <!-- 1. Widget Boolean Checkbox -->
                <div v-if="activeMatrix.widgetType === 'boolean'" class="flex items-center justify-center">
                  <input
                    type="checkbox"
                    :checked="getVal(row, col) === 'X' || getVal(row, col) === true"
                    @change="setVal(row, col, ($event.target as HTMLInputElement).checked ? 'X' : '-')"
                    class="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary cursor-pointer"
                  >
                </div>

                <!-- 2. Widget Cycle Buttons -->
                <button
                  v-else-if="activeMatrix.widgetType === 'cycle'"
                  @click="rotateCycle(row, col)"
                  :class="[
                    getCycleBgColor(getVal(row, col)),
                    'px-2 py-1 rounded border text-xs font-bold w-full transition-all cursor-pointer'
                  ]"
                >
                  {{ getVal(row, col) === '-' ? '' : getVal(row, col) }}
                </button>

                <!-- 3. Widget Rating Scale -->
                <select
                  v-else-if="activeMatrix.widgetType === 'scale'"
                  :value="getVal(row, col) === '-' ? '' : getVal(row, col)"
                  @change="setVal(row, col, ($event.target as HTMLSelectElement).value || '-')"
                  class="border rounded px-1.5 py-1 text-xs w-full text-center outline-none focus:ring-1 focus:ring-primary border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="">-</option>
                  <option v-for="num in scaleRange" :key="num" :value="num">{{ num }}</option>
                </select>

                <!-- 4. Widget Custom Set Options -->
                <select
                  v-else-if="activeMatrix.widgetType === 'set'"
                  :value="getVal(row, col) === '-' ? '' : getVal(row, col)"
                  @change="setVal(row, col, ($event.target as HTMLSelectElement).value || '-')"
                  class="border rounded px-1.5 py-1 text-xs w-full outline-none focus:ring-1 focus:ring-primary border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="">-</option>
                  <option v-for="opt in getSetOptionsList()" :key="opt" :value="opt">{{ opt }}</option>
                </select>

                <!-- 5. Widget Free Text -->
                <input
                  v-else-if="activeMatrix.widgetType === 'text'"
                  type="text"
                  :value="getVal(row, col) === '-' ? '' : getVal(row, col)"
                  @input="setVal(row, col, ($event.target as HTMLInputElement).value || '-')"
                  placeholder="-"
                  class="border rounded px-1.5 py-1 text-xs w-full outline-none focus:ring-1 focus:ring-primary border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300"
                >
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td :colspan="columns.length + 1" class="text-center text-slate-400 dark:text-slate-500 text-xs italic py-6">
                No items defined in {{ activeMatrix.source }}. Make sure to add items to the hierarchy tree.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { Copy, ChevronDown } from 'lucide-vue-next';
import { useModelStore } from '../../stores/modelStore';
import { useUiStore } from '../../stores/uiStore';
import BlockPill from './BlockPill.vue';
import MatrixPill from './MatrixPill.vue';
import Badge from '../ui/Badge.vue';
import { findNodeByName } from '../../utils/tree';
import { slugify } from '../../utils/sanitize';
import { commitFieldValue } from '../../shared/provenance';

const props = defineProps<{
  matrixIndex: number;
}>();

const emit = defineEmits<{
  'cell-change': [cellKey: string, value: unknown]
}>();

const modelStore = useModelStore();

// ── Matrix definitions stored on root node fields ──
const MATRIX_DEFS_KEY = '__matrix_defs';

interface MatrixDef {
  name: string;
  source: string;
  target: string;
  widgetType: 'boolean' | 'cycle' | 'scale' | 'set' | 'text';
  params: string;
  min_color?: string;
  max_color?: string;
  label?: string;
}

const rootNode = computed(() => {
  if (modelStore.rootIds.length === 0) return null;
  return modelStore.getNode(modelStore.rootIds[0]);
});

const matrixDefs = computed<MatrixDef[]>(() => {
  const root = rootNode.value;
  if (!root) return [];
  const defsField = root.fields[MATRIX_DEFS_KEY];
  if (!defsField || !defsField.value) return [];
  return defsField.value as MatrixDef[];
});

const activeMatrixIndex = ref(props.matrixIndex);
watch(() => props.matrixIndex, (idx) => { activeMatrixIndex.value = idx; });

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const selectMatrix = (idx: number) => {
  activeMatrixIndex.value = idx;
  isOpen.value = false;
  useUiStore().setActiveMatrixIndex(idx);
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const activeMatrix = computed(() => {
  if (matrixDefs.value.length === 0) return null;
  if (activeMatrixIndex.value < 0) return null;
  return matrixDefs.value[activeMatrixIndex.value];
});

// ── Derive rows/cols from modelStore nodes by concept type ──
const rows = computed(() => {
  if (!activeMatrix.value) return [];
  const source = activeMatrix.value.source;
  return Object.values(modelStore.nodes)
    .filter(n => n.type === source)
    .map(n => n.name);
});

const columns = computed(() => {
  if (!activeMatrix.value) return [];
  const target = activeMatrix.value.target;
  return Object.values(modelStore.nodes)
    .filter(n => n.type === target)
    .map(n => n.name);
});

const scaleRange = computed(() => {
  if (!activeMatrix.value) return [];
  const params = activeMatrix.value.params;
  const minMatch = params.match(/min:(\d+)/);
  const maxMatch = params.match(/max:(\d+)/);
  const min = minMatch ? parseInt(minMatch[1]) : 1;
  const max = maxMatch ? parseInt(maxMatch[1]) : 5;
  const range: number[] = [];
  for (let i = min; i <= max; i++) range.push(i);
  return range;
});

// ── Matrix values stored as fields on root node ──
function matrixCellKey(row: string, col: string): string {
  if (!activeMatrix.value) return '';
  return `${activeMatrix.value.name}||${row}||${col}`;
}

const getVal = (row: string, col: string): string | number | boolean => {
  if (!activeMatrix.value) return '';
  const key = matrixCellKey(row, col);
  const root = rootNode.value;
  if (!root) return '-';
  const field = root.fields[key];
  if (!field || field.value === undefined || field.value === null) return '-';
  return field.value as string | number | boolean;
};

const setVal = (row: string, col: string, value: string | number | boolean) => {
  if (!activeMatrix.value) return;
  const root = rootNode.value;
  if (!root) return;
  const key = matrixCellKey(row, col);
  const rootId = modelStore.rootIds[0];
  if (!rootId) return;
  commitFieldValue(modelStore, rootId, key, value, { kind: 'user', id: 'anonymous' });
  emit('cell-change', key, value);
};

const valueDistribution = computed(() => {
  if (!activeMatrix.value || !rows.value.length || !columns.value.length) return {} as Record<string, number>;
  const counts: Record<string, number> = {};
  const root = rootNode.value;
  if (!root) return {};
  const prefix = activeMatrix.value.name + '||';
  for (const row of rows.value) {
    for (const col of columns.value) {
      const key = `${prefix}${row}||${col}`;
      const field = root.fields[key];
      const val = field?.value;
      const strVal = val === undefined || val === null || val === '-' ? '-' : String(val);
      counts[strVal] = (counts[strVal] || 0) + 1;
    }
  }
  return counts;
});

// ── Color helpers ──
const getCycleBgColor = (val: string | number | boolean): string => {
  if (val === '-' || val === '' || val === undefined) return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400';
  const colorScale: Record<string, string> = {
    '1': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
    '2': 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
    '3': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
    '4': 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/30 dark:text-lime-300',
    '5': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
  };
  return colorScale[String(val)] || 'bg-primary/10 text-primary border-primary/30';
};

const getDistClasses = (value: string): string => {
  if (value === '-') return 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600';
  return getCycleBgColor(value);
};

const getHeatmapClasses = (row: string, col: string): string => {
  const val = getVal(row, col);
  if (val === '-' || val === '' || val === undefined || val === null) return '';
  return getCycleBgColor(val);
};

/** Alias to satisfy template callback type inference. */

// ── Utility functions ──
const getSetOptionsList = (): string[] => {
  if (!activeMatrix.value) return [];
  const params = activeMatrix.value.params;
  return params.split(/[;,]/).map(s => s.trim()).filter(s => s.length > 0);
};

const rotateCycle = (row: string, col: string) => {
  if (!activeMatrix.value) return;
  const current = getVal(row, col);
  const options = getSetOptionsList();
  if (options.length === 0) {
    // Default cycle: 1-2-3-4-5
    const defaultCycle = ['1', '2', '3', '4', '5'];
    const idx = current === '-' ? 0 : defaultCycle.indexOf(String(current));
    const next = idx >= defaultCycle.length - 1 ? '-' : defaultCycle[idx + 1];
    setVal(row, col, next);
  } else {
    const idx = current === '-' ? 0 : options.indexOf(String(current));
    const next = idx >= options.length - 1 ? '-' : options[idx + 1];
    setVal(row, col, next);
  }
};

const resolveBlockId = (name: string, _conceptType: string): string | undefined => {
  const node = Object.values(modelStore.nodes).find(n => n.name === name);
  return node?.id;
};

const copyMatrixMarkdown = () => {
  if (!activeMatrix.value) return;
  let md = `| ${activeMatrix.value.source} \\ ${activeMatrix.value.target} | ` + columns.value.join(' | ') + ' |\n';
  md += `| :--- | ` + columns.value.map(() => ':---:').join(' | ') + ' |\n';
  rows.value.forEach(row => {
    const colsVal = columns.value.map(col => {
      const val = getVal(row, col);
      return val !== undefined && val !== null ? String(val) : '-';
    });
    md += `| ${row} | ` + colsVal.join(' | ') + ' |\n';
  });

  navigator.clipboard.writeText(md);
};
</script>
