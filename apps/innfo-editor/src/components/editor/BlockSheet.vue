<template>
  <div
    data-testid="block-sheet"
    class="rounded-lg bg-slate-50 dark:bg-slate-800/50 transition-all duration-200 flex flex-col relative border border-slate-200 dark:border-slate-700"
  >
    <!-- Header: concept label + markers + controls -->
    <div
      class="flex items-center rounded-lg px-3 py-2.5 transition-all duration-150 gap-2 select-none text-slate-700 dark:text-slate-300"
    >
      <!-- Title: icon + name(s) -->
      <div class="flex items-center gap-1.5 min-w-0 flex-1">
        <template v-if="kind === 'concept'">
          <IconRenderer
            :icon="conceptIcon || 'layers'"
            custom-class="w-5 h-5 shrink-0"
            :class="[palette.text]"
          />
          <span class="font-bold text-2xl truncate" :class="[palette.text]">{{
            cleanConceptName
          }}</span>
          <span class="font-normal text-sm text-slate-500 dark:text-slate-400 shrink-0"
            >({{ conceptType }})</span
          >
        </template>
        <template v-else>
          <IconRenderer
            :icon="conceptIcon || 'layers'"
            custom-class="w-4 h-4 shrink-0"
            :class="[palette.text]"
          />
          <span class="font-bold text-sm" :class="[palette.text]">{{ cleanConceptName }}</span>
          <span class="text-slate-300 dark:text-slate-600 mx-0.5">:</span>
          <button
            v-if="!isEditing"
            @click.stop="navigateToInstance"
            class="font-semibold text-2xl text-slate-800 dark:text-slate-200 hover:text-primary hover:underline transition-colors cursor-pointer text-left truncate min-w-0"
            :title="block.name || '(Empty)'"
          >
            {{ block.name || '(Empty)' }}
          </button>
          <input
            v-else
            :value="block.name"
            @input="onNameInput"
            class="flex-1 border border-slate-200 dark:border-slate-600 rounded-md p-1 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 min-w-0"
            placeholder="Enter block name"
          />
        </template>
      </div>

      <!-- Marker cycling toolbar -->
      <template v-if="hasMarkers && block.id">
        <component
          v-for="marker in allMarkers"
          :key="marker.name"
          :is="getMarkerIcon(marker.name)"
          @click.stop="cycleMarker(marker.name)"
          class="cursor-pointer"
          :class="markerClassesFor(marker.name)"
        />
        <span class="w-px h-3.5 bg-current/20 mx-0.5"></span>
      </template>

      <!-- Add child -->
      <button
        v-if="showAddChild"
        @click.stop="$emit('add-child')"
        aria-label="Add child"
        class="p-0.5 hover:bg-current/10 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
      >
        <PlusCircle class="w-3.5 h-3.5" />
      </button>

      <!-- Reorder controls -->
      <template v-if="showReorder">
        <button
          @click.stop="$emit('move-up')"
          :disabled="isFirst"
          aria-label="Move up"
          class="p-0.5 hover:bg-current/10 disabled:opacity-20 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <ArrowUp class="w-3 h-3" />
        </button>
        <button
          @click.stop="$emit('move-down')"
          :disabled="isLast"
          aria-label="Move down"
          class="p-0.5 hover:bg-current/10 disabled:opacity-20 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <ArrowDown class="w-3 h-3" />
        </button>
      </template>

      <!-- Pencil edit button -->
      <button
        @click.stop="$emit('edit-toggle')"
        aria-label="Edit"
        class="p-0.5 hover:bg-current/10 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
        :class="isEditing ? 'text-current' : 'text-current/60'"
      >
        <component :is="isEditing ? Check : Pencil" class="w-3.5 h-3.5" />
      </button>

      <!-- Delete -->
      <button
        v-if="showDelete"
        @click.stop="$emit('delete')"
        aria-label="Delete"
        class="p-0.5 text-current/50 hover:text-rose-600 hover:scale-105 active:scale-95 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>

      <!-- Chevron expand/collapse (far right) -->
      <button
        v-if="!disableExpand"
        @click.stop="$emit('update:collapsed', !collapsed)"
        aria-label="Toggle expand"
        class="p-0.5 hover:bg-current/10 rounded transition-colors cursor-pointer flex items-center justify-center shrink-0"
      >
        <ChevronDown
          class="w-3.5 h-3.5 transition-transform duration-200"
          :class="{ '-rotate-90': collapsed }"
        />
      </button>
    </div>

    <!-- Tree path breadcrumb -->
    <div
      v-if="treePath.length > 0 && !collapsed && !isEditing"
      class="flex items-center flex-wrap gap-x-1 gap-y-0.5 px-3 pb-1 text-2xs text-slate-400 dark:text-slate-500 select-none"
    >
      <template v-for="(seg, i) in treePath" :key="i">
        <span v-if="i > 0" class="text-slate-300 dark:text-slate-600 mx-0.5">&rsaquo;</span>
        <span>{{ seg }}</span>
      </template>
      <span v-if="treeSiblings.length > 0" class="text-slate-300 dark:text-slate-600 mx-1">|</span>
      <span class="text-slate-400 dark:text-slate-500">Siblings:</span>
      <span
        v-for="sib in treeSiblings"
        :key="sib"
        class="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
      >{{ sib }}</span>
    </div>

    <!-- Tab bar (read mode only, when expanded) -->
    <div
      v-if="!collapsed && !isEditing"
      class="flex items-center gap-1 px-3 border-b border-slate-200 dark:border-slate-700 select-none"
    >
      <button
        v-for="tab in tabDefs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer -mb-px"
        :class="
          activeTab === tab.id
            ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        "
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Expandable body / edit form -->
    <div
      v-show="(!collapsed && !disableExpand) || isEditing"
      class="overflow-hidden transition-all duration-300"
    >
      <div class="px-3 pb-4 pt-2 space-y-6 flex flex-col">
        <!-- Edit-mode field inputs -->
        <template v-if="isEditing">
          <div
            v-if="conceptFields && conceptFields.length"
            class="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div v-for="field in conceptFields" :key="field.name" class="flex flex-col gap-1">
              <label
                class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
                >{{ field.name.replace(/_/g, ' ') }}</label
              >
              <WidgetField
                :node-id="blockIdForFields"
                :field-key="field.name"
                :widget-type="field.type || 'string'"
                :field-definition="field"
              />
            </div>
          </div>

          <!-- Description textarea -->
          <div class="flex flex-col min-h-[100px]">
            <label
              class="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >Description / Details</label
            >
            <textarea
              :value="block.description"
              @input="onInput"
              rows="4"
              class="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none flex-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              placeholder="Enter description (supports basic markdown)..."
            ></textarea>
          </div>
        </template>

        <!-- Read-mode tabbed content -->
        <template v-else>
          <!-- ═══ View Tab (default) ═══ -->
          <div v-if="activeTab === 'view'" class="space-y-6">
            <!-- Content section: full Markdown rendering -->
            <div
              v-if="renderedDescription"
              class="border-t border-slate-200 dark:border-slate-700 pt-5"
            >
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                Content
              </div>
              <div
                class="prose prose-slate max-w-none text-lg text-slate-600 dark:text-slate-300 leading-relaxed break-words bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-100 dark:border-slate-700"
                v-html="renderedDescription"
              ></div>
            </div>

            <!-- Fields via FieldViewer -->
            <div
              v-if="conceptFields && conceptFields.length > 0"
              class="border-t border-slate-200 dark:border-slate-700 pt-5"
            >
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                Fields
              </div>
              <div
                class="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-4"
              >
                <FieldViewer
                  :node-id="blockIdForFields"
                  :field-definitions="conceptFields"
                  :readonly="!isEditing"
                />
              </div>
            </div>

            <!-- Relationships via BlockRelationships -->
            <div
              v-if="hasRelationships"
              class="border-t border-slate-200 dark:border-slate-700 pt-5"
            >
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                Relationships
              </div>
              <div
                class="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-4"
              >
                <BlockRelationships
                  :relationships="relationshipsList"
                  :on-navigate="navigateToNode"
                />
              </div>
            </div>

            <!-- Matrix participation via BlockMatrixSummary -->
            <div
              v-if="hasMatrices && block.id"
              class="border-t border-slate-200 dark:border-slate-700 pt-5"
            >
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                Matrix
              </div>
              <div
                class="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-4"
              >
                <BlockMatrixSummary
                  :root-node-id="rootNodeId"
                  :node-concept="conceptType"
                  :node-id="block.id"
                />
              </div>
            </div>

            <!-- Media: image gallery + file attachments via NodeMedia -->
            <div v-if="block.id" class="border-t border-slate-200 dark:border-slate-700 pt-5">
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                Media &amp; Attachments
              </div>
              <NodeMedia :assets="assetItems" />
            </div>
          </div>

          <!-- ═══ Visual Tab: inline GraphViewer ═══ -->
          <div v-else-if="activeTab === 'visual'" class="pt-2">
            <GraphViewer v-if="block.id" :inline="true" :local-node-id="block.id" :height="320" />
            <p v-else class="text-xs text-slate-400 dark:text-slate-500 italic px-3 py-2">
              No node selected for graph view.
            </p>
          </div>

          <!-- ═══ History Tab ═══ -->
          <div v-else-if="activeTab === 'history'">
            <div class="border-t border-slate-200 dark:border-slate-700 pt-5 space-y-3">
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                History
              </div>
              <div
                class="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-4 space-y-3 text-sm"
              >
                <div class="flex items-start gap-2">
                  <span class="font-semibold text-slate-500 dark:text-slate-400 w-24 shrink-0"
                    >Name</span
                  >
                  <span class="text-slate-700 dark:text-slate-300">{{
                    block.name || '(Empty)'
                  }}</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="font-semibold text-slate-500 dark:text-slate-400 w-24 shrink-0"
                    >Path</span
                  >
                  <span class="text-slate-700 dark:text-slate-300 font-mono text-xs break-all">{{
                    nodePath
                  }}</span>
                </div>
                <div v-if="lastSaved" class="flex items-start gap-2">
                  <span class="font-semibold text-slate-500 dark:text-slate-400 w-24 shrink-0"
                    >Last saved</span
                  >
                  <span class="text-slate-700 dark:text-slate-300">{{ lastSaved }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ Compliance Tab ═══ -->
          <div v-else-if="activeTab === 'compliance'">
            <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                Compliance
              </div>
              <ComplianceTab :report="complianceReport" :concept-type="conceptType" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronDown, ArrowUp, ArrowDown, Pencil, Check, Trash2, PlusCircle } from 'lucide-vue-next'
import IconRenderer from './IconRenderer.vue'
import WidgetField from '../../shared/widgets/WidgetField.vue'
import { getMarkerIcon, getMarkerClasses } from './MarkerIcons'
import { renderMarkdown } from '../../utils/markdown'
import { useModelStore } from '../../stores/modelStore'
import { commitMarkerValue } from '../../shared/provenance'
import { MARKER_CYCLE_COUNT } from '../../utils/constants'
import { getColorClasses } from '../../utils/colors'
import type { BlockKind } from '../../utils/conceptVisuals'

// Tab dependencies
import GraphViewer from './GraphViewer.vue'
import FieldViewer from './FieldViewer.vue'
import BlockRelationships from './BlockRelationships.vue'
import BlockMatrixSummary from './BlockMatrixSummary.vue'
import NodeMedia from './NodeMedia.vue'
import ComplianceTab from './ComplianceTab.vue'
import { parseFrontmatter } from '@innv0/innfo-core'
import type { ValidationReport } from '../../shared/validation-types'

const props = withDefaults(
  defineProps<{
    block: { id?: string; name: string; description: string; fields?: Record<string, any> }
    kind: BlockKind
    conceptType: string
    conceptName: string
    conceptFields?: any[]
    conceptColor?: string
    conceptIcon?: string
    collapsed: boolean
    isEditing: boolean
    disableExpand?: boolean
    hasMarkers?: boolean
    showDelete?: boolean
    showReorder?: boolean
    showAddChild?: boolean
    isFirst?: boolean
    isLast?: boolean
    validationReport?: ValidationReport | null
  }>(),
  {
    conceptFields: () => [],
    conceptColor: '',
    conceptIcon: '',
    disableExpand: false,
    hasMarkers: false,
    showDelete: false,
    showReorder: false,
    showAddChild: false,
    isFirst: false,
    isLast: false,
    validationReport: null,
  },
)

const emit = defineEmits<{
  'update:collapsed': [val: boolean]
  'edit-toggle': []
  'move-up': []
  'move-down': []
  delete: []
  'add-child': []
  change: []
  'update:field': [fieldName: string, value: unknown]
  'navigate-to-node': [nodeId: string]
}>()

const modelStore = useModelStore()

// ── Tab state ───────────────────────────────────────────────────

const tabDefs = [
  { id: 'view', label: 'View' },
  { id: 'visual', label: 'Visual' },
  { id: 'history', label: 'History' },
  { id: 'compliance', label: 'Compliance' },
] as const

const activeTab = ref<'view' | 'visual' | 'history' | 'compliance'>('view')

// ── Palette ─────────────────────────────────────────────────────

const palette = computed(() => getColorClasses(props.conceptColor))

// ── Tree path breadcrumb ─────────────────────────────────────────

const treePath = computed(() => {
  if (!props.block.id) return []
  const segments: string[] = []
  let current = modelStore.getNode(props.block.id)
  while (current) {
    segments.unshift(current.name)
    if (!current.parentId) break
    current = modelStore.getNode(current.parentId)
  }
  return segments
})

const treeSiblings = computed(() => {
  if (!props.block.id) return []
  const node = modelStore.getNode(props.block.id)
  if (!node?.parentId) return []
  const parent = modelStore.getNode(node.parentId)
  if (!parent) return []
  return parent.childIds
    .map((id) => modelStore.getNode(id)?.name)
    .filter((n): n is string => !!n && n !== node.name)
})

// ── Markers ─────────────────────────────────────────────────────

const allMarkers = computed(() => {
  return [
    { name: 'completion', icon: 'check-circle', color: 'emerald' },
    { name: 'certainty', icon: 'help-circle', color: 'blue' },
    { name: 'priority', icon: 'flag', color: 'rose' },
    { name: 'rating', icon: 'star', color: 'amber' },
    { name: 'weight', icon: 'scale', color: 'indigo' },
  ]
})

const getMarkerScore = (markerName: string): number => {
  if (!props.block.id) return 0
  const node = modelStore.getNode(props.block.id)
  if (!node?.markers) return 0
  return (node.markers[markerName] as number) ?? 0
}

const cycleMarker = (markerName: string) => {
  const id = props.block.id
  if (!id) return
  const current = getMarkerScore(markerName)
  commitMarkerValue(modelStore, id, markerName, (current + 1) % MARKER_CYCLE_COUNT)
  emit('change')
}

const markerClassesFor = (markerName: string) =>
  getMarkerClasses(markerName, getMarkerScore(markerName))

// ── Name helpers ────────────────────────────────────────────────

const cleanConceptName = computed(() => {
  const name = props.conceptName
  return name.endsWith('s') ? name.slice(0, -1) : name
})

// ── Markdown rendering ──────────────────────────────────────────

/** Strip everything from the first _NN marker onwards. */
function stripBlockDefinitions(text: string): string {
  const blockPattern = /^[ \t]*(?:[-*+]|\d+\.)?[ \t]*_NN\s+[\w\s-]+?:/m
  const idx = text.search(blockPattern)
  if (idx === -1) return text
  return text.substring(0, idx).trim()
}

const renderedDescription = computed(() => {
  const text =
    props.kind === 'concept'
      ? stripBlockDefinitions(props.block.description)
      : props.block.description
  return renderMarkdown(text)
})

// ── Node from store (full model data) ───────────────────────────

const nodeFromStore = computed(() =>
  props.block.id ? modelStore.getNode(props.block.id) : undefined,
)

// ── Relationships ───────────────────────────────────────────────

const hasRelationships = computed(() => {
  if (!props.block.id) return false
  const node = modelStore.getNode(props.block.id)
  return node && node.relationships && node.relationships.length > 0
})

const relationshipsList = computed(() => {
  if (!props.block.id) return []
  const node = modelStore.getNode(props.block.id)
  return node?.relationships ?? []
})

// ── Matrix summaries ────────────────────────────────────────────

const rootNodeId = computed(() => {
  if (!props.block.id) return modelStore.rootIds[0] ?? ''
  let curr = modelStore.getNode(props.block.id)
  while (curr && curr.parentId) {
    curr = modelStore.getNode(curr.parentId)
  }
  return curr ? curr.id : (modelStore.rootIds[0] ?? '')
})

const hasMatrices = computed(() => {
  if (!rootNodeId.value) return false
  const root = modelStore.getNode(rootNodeId.value)
  if (!root?.rawContent) return false
  const fm = parseFrontmatter(root.rawContent)
  const matrices: unknown[] = (fm as any)?.matrices ?? []
  return matrices.length > 0
})

// ── Assets / Media ──────────────────────────────────────────────

const assetItems = computed<Array<{ filename: string; url: string }>>(() => {
  const node = nodeFromStore.value
  if (!node?.assets || node.assets.length === 0) return []
  return node.assets.map((path: string) => ({
    filename: path.split('/').pop() || path,
    url: path,
  }))
})

// ── History tab ─────────────────────────────────────────────────

const nodePath = computed(() => {
  const node = nodeFromStore.value
  return node?.source?.path ?? ''
})

const lastSaved = computed<string | null>(() => {
  const node = nodeFromStore.value
  if (!node?.rawContent) return null
  try {
    const fm = parseFrontmatter(node.rawContent)
    return (fm as any)?.last_saved ?? null
  } catch {
    return null
  }
})

// ── Compliance tab ──────────────────────────────────────────────

const emptyReport: ValidationReport = {
  checks: [],
  summary: { total: 0, passed: 0, errors: 0, warnings: 0 },
}

const complianceReport = computed(() => props.validationReport ?? emptyReport)

// ── Field viewer node ID ────────────────────────────────────────

const blockIdForFields = computed(() => props.block.id || '')

// ── Navigation ──────────────────────────────────────────────────

const navigateToNode = (targetId: string) => {
  emit('navigate-to-node', targetId)
}

const navigateToInstance = () => {
  if (!props.block.name || !props.conceptName) return
  emit('navigate-to-node', props.block.name)
  emit('update:collapsed', false)
}

// ── Input handlers ──────────────────────────────────────────────

const onInput = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement
  const val = textarea.value
  props.block.description = val
  if (props.block.id) {
    const node = modelStore.getNode(props.block.id)
    if (node) {
      modelStore.upsertNode({
        ...node,
        rawSections: { ...node.rawSections, description: val },
      })
    }
  }
  modelStore.markDirty(props.block.id || '')
  emit('change')
}

const onNameInput = (event: Event) => {
  const newName = (event.target as HTMLInputElement).value
  props.block.name = newName
  if (props.block.id) {
    const existing = modelStore.getNode(props.block.id)
    if (existing) {
      modelStore.upsertNode({ ...existing, name: newName })
    }
  }
  modelStore.markDirty(props.block.id || '')
  emit('change')
}
</script>
