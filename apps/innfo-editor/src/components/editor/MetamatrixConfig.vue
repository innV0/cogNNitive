<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
      <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dynamic Relational Matrices Definitions</h3>
      <button
        @click="addMatrixRow"
        class="bg-primary hover:bg-primary/90 text-white text-xs px-2.5 py-1.5 rounded font-semibold cursor-pointer"
      >
        + Add New Matrix Config
      </button>
    </div>

    <!-- Table definition matrix -->
    <div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-2xs">
      <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead class="bg-slate-50 dark:bg-slate-900/60">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Matrix Name</th>
            <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Source</th>
            <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target</th>
            <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Label (relaci&oacute;n)</th>
            <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Widget</th>
            <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parameters</th>
            <th class="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
          <tr v-for="(row, index) in matrixDefs" :key="index">
            <td class="px-4 py-2.5">
              <input
                v-model="row.name"
                @input="saveDefs"
                class="border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs w-full outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-slate-800 dark:text-slate-300"
              >
            </td>
            <td class="px-4 py-2.5">
              <select
                v-model="row.source"
                @change="saveDefs"
                class="border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs w-full outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-slate-800 dark:text-slate-300"
              >
                <option v-for="c in instantiableTypes" :key="c" :value="c">{{ c }}</option>
              </select>
            </td>
            <td class="px-4 py-2.5">
              <select
                v-model="row.target"
                @change="saveDefs"
                class="border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs w-full outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-slate-800 dark:text-slate-300"
              >
                <option v-for="c in allTypes" :key="c" :value="c">{{ c }}</option>
              </select>
            </td>
            <td class="px-4 py-2.5">
              <input
                v-model="row.label"
                @input="saveDefs"
                placeholder="e.g. impacts, belongs to"
                class="border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs w-full outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-slate-800 dark:text-slate-300"
              >
            </td>
            <td class="px-4 py-2.5">
              <select
                v-model="row.widgetType"
                @change="saveDefs"
                class="border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs w-full outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="boolean">Boolean Checkbox</option>
                <option value="cycle">Options Cycle Button</option>
                <option value="scale">Rating Scale Input</option>
                <option value="set">Custom Selection Set</option>
                <option value="text">Free Text</option>
              </select>
            </td>
            <td class="px-4 py-2.5">
              <input
                v-model="row.params"
                @input="saveDefs"
                placeholder="e.g. min:1;max:5 or Low;Medium;High"
                class="border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs w-full outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-slate-800 dark:text-slate-300"
              >
            </td>
            <td class="px-4 py-2.5 text-right">
              <button
                @click="removeMatrixRow(index)"
                class="text-xs bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-semibold px-2 py-1 rounded border border-rose-200 dark:border-rose-800 cursor-pointer flex items-center gap-1.5 ml-auto"
              >
                <Trash2 class="w-3 h-3 text-rose-700 dark:text-rose-300" />
                Remove
              </button>
            </td>
          </tr>
          <tr v-if="!matrixDefs.length">
            <td colspan="7" class="text-center text-slate-400 dark:text-slate-500 text-xs italic py-6">
              No relational matrices configured. Click "+ Add New Matrix Config" to define one.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import { useModelStore } from '../../stores/modelStore';
import { commitFieldValue } from '../../shared/provenance';

const modelStore = useModelStore();
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

const matrixDefs = computed<MatrixDef[]>({
  get() {
    const root = rootNode.value;
    if (!root) return [];
    const defsField = root.fields[MATRIX_DEFS_KEY];
    if (!defsField || !defsField.value) return [];
    return defsField.value as MatrixDef[];
  },
  set(_val) {
    // Write-through via saveDefs()
  },
});

// Derive concept types from actual nodes
const allTypes = computed(() => {
  const types = new Set<string>();
  for (const node of Object.values(modelStore.nodes)) {
    if (node.type) types.add(node.type);
  }
  return [...types].sort();
});

const instantiableTypes = computed(() => allTypes.value);

function saveDefs() {
  const rootId = modelStore.rootIds[0];
  if (!rootId) return;
  // Read current defs from the reactive computed
  const raw = rootNode.value?.fields[MATRIX_DEFS_KEY]?.value;
  if (raw) {
    commitFieldValue(modelStore, rootId, MATRIX_DEFS_KEY, raw, { kind: 'user', id: 'anonymous' });
  }
}

function addMatrixRow() {
  const rootId = modelStore.rootIds[0];
  if (!rootId) return;
  const current = matrixDefs.value ? [...matrixDefs.value] : [];
  const newDef: MatrixDef = {
    name: `New Matrix ${current.length + 1}`,
    source: instantiableTypes.value[0] || '',
    target: allTypes.value[0] || '',
    widgetType: 'boolean',
    params: '',
    label: '',
  };
  current.push(newDef);
  commitFieldValue(modelStore, rootId, MATRIX_DEFS_KEY, current, { kind: 'user', id: 'anonymous' });
}

function removeMatrixRow(index: number) {
  const rootId = modelStore.rootIds[0];
  if (!rootId) return;
  const current = matrixDefs.value ? [...matrixDefs.value] : [];
  current.splice(index, 1);
  commitFieldValue(modelStore, rootId, MATRIX_DEFS_KEY, current, { kind: 'user', id: 'anonymous' });
}
</script>
