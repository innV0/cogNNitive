<template>
  <component
    :is="as"
    ref="triggerEl"
    :class="pillClasses"
    :style="pillStyle"
    @mouseenter="showInfoIcon = true"
    @mouseleave="showInfoIcon = false"
  >
    <!-- Identity row: icon + name + active markers -->
    <div class="flex items-center gap-1.5 w-full min-w-0">
      <IconRenderer
        v-if="visuals.iconToShow.value === 'icon' && visuals.resolvedIcon.value"
        :icon="visuals.resolvedIcon.value"
        custom-class="shrink-0 w-3.5 h-3.5 text-current/80"
      />
      <component
        v-else
        :is="visuals.typeIcon.value"
        class="shrink-0 w-3.5 h-3.5 text-current/70"
      />
      <span
        class="leading-tight text-left flex-1 min-w-0"
        :class="{ italic: isEmpty, 'text-slate-400': isEmpty }"
      >
        <slot>
          <template v-if="conceptLabel">
            <span class="font-medium">{{ conceptLabel }}:</span>
            {{ name }}
          </template>
          <template v-else>{{ name }}</template>
        </slot>
        <span v-if="isEmpty" class="ml-1 text-slate-400 dark:text-slate-500 text-2xs italic">Empty</span>
      </span>

      <!-- Active markers, read-only, rendered inside the pill -->
      <Info
        v-if="blockId && showInfoIcon"
        :class="infoIconClass"
        @click.stop="togglePopup"
      />
      <span
        v-if="activeMarkers.length > 0"
        class="flex items-center gap-1 shrink-0"
      >
        <component
          v-for="marker in activeMarkers"
          :key="marker.name"
          :is="getMarkerIcon(marker.name)"
          class="pointer-events-none"
          :class="markerClassesFor(marker.name)"
        />
      </span>
    </div>

    <!-- Info popup (only when blockId is provided) -->
    <Teleport v-if="blockId" to="body">
      <Transition name="fade-fast">
        <div
          v-if="popupVisible"
          :style="popupStyle"
          class="fixed z-[998] w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl p-4 text-xs select-none"
        >
          <!-- Close button -->
          <X
            class="absolute top-2 right-2 w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
            @click.stop="popupVisible = false"
          />
          <!-- Header -->
          <div class="flex items-center gap-1.5 mb-2">
            <component
              v-if="visuals.iconToShow.value === 'type'"
              :is="visuals.typeIcon.value"
              class="shrink-0 w-4 h-4 text-slate-500"
            />
            <IconRenderer
              v-else-if="visuals.resolvedIcon.value"
              :icon="visuals.resolvedIcon.value"
              custom-class="shrink-0 w-4 h-4 text-slate-500"
            />
            <button
              class="font-semibold text-sm text-slate-800 dark:text-slate-200 break-words hover:text-primary transition-colors cursor-pointer text-left"
              @click="navigateToBlock"
            >
              {{ name || '(Empty)' }}
            </button>
          </div>

          <!-- Fields -->
          <div v-if="visibleFields.length" class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="field in visibleFields"
              :key="field.name"
              class="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200/60 dark:border-slate-600"
            >
              <span class="text-slate-400 dark:text-slate-500 mr-1 uppercase font-bold">{{ field.name.replace(/_/g, ' ') }}:</span>
              <span v-if="field.isWikiLink" class="text-primary underline decoration-dotted">[[{{ field.value }}]]</span>
              <span v-else>{{ field.value }}</span>
            </span>
          </div>

          <!-- Description -->
          <p v-if="description && description.trim()" class="text-slate-600 dark:text-slate-400 leading-relaxed text-xs mb-3 break-words">
            {{ description }}
          </p>
          <p v-else class="text-slate-400 dark:text-slate-500 italic text-xs mb-3">No content.</p>

          <!-- Marker cycling toolbar -->
          <div v-if="showMarkers && allMarkers.length" class="border-t border-slate-100 dark:border-slate-600 pt-2.5">
            <div class="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Markers</div>
            <div class="flex items-center gap-1.5">
              <component
                v-for="marker in allMarkers"
                :key="marker.name"
                :is="getMarkerIcon(marker.name)"
                @click.stop="cycleMarker(marker.name)"
                class="cursor-pointer"
                :class="markerClassesFor(marker.name)"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </component>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Info, X } from 'lucide-vue-next';
import IconRenderer from './IconRenderer.vue';
import { getMarkerIcon, getMarkerClasses } from './MarkerIcons';
import { useBlockVisuals } from '../../composables/useBlockVisuals';
import { useConceptVisuals, getHexColorLight, textColor as yiqTextColor } from '../../composables/useConceptVisuals';
import { useModelStore } from '../../stores/modelStore';
import { commitMarkerValue } from '../../shared/provenance';
import { MARKER_CYCLE_COUNT } from '../../utils/constants';
import type { BlockKind, ConceptType } from '../../utils/conceptVisuals';

const props = withDefaults(defineProps<{
  name?: string;
  kind?: BlockKind;
  conceptType?: string;
  color?: string;
  icon?: string;
  iconMode?: 'type' | 'own';
  typeName?: ConceptType;
  selected?: boolean;
  interactive?: boolean;
  fullWidth?: boolean;
  as?: string;
  /** Block id — enables popup, active markers, and content-aware (empty) state. */
  blockId?: string;
  /** Node id for parent-chain color resolution (V_0-1-5). When set, overrides `color` prop. */
  nodeId?: string;
  /** Shown in the popup and used to detect the empty state. */
  description?: string;
  fields?: Record<string, any>;
  /** Field definitions for labelled field chips in the popup. */
  conceptFields?: any[];
  /** Number of child instances. An instanciable block with instances counts as having content. */
  instanceCount?: number;
  /** Show the marker-cycling toolbar inside the popup. */
  showMarkers?: boolean;
}>(), {
  selected: false,
  interactive: false,
  fullWidth: false,
  as: 'div',
  kind: 'instance',
  showMarkers: false,
  conceptFields: () => [],
});

const modelStore = useModelStore();
const conceptVisuals = useConceptVisuals();

// ── Node-based color resolution (V_0-1-5 parent chain) ─────────
function resolveNodeColor(nodeId: string | undefined): string {
  if (!nodeId) return ''
  const node = modelStore.getNode(nodeId)
  if (!node) return ''
  return conceptVisuals.resolveColor(node)
}

// In Phase 2, markers come from a hardcoded default list since the metamodel
// adapter is not yet in place. Phase 6 will wire useMetamodelStore().
const allMarkers = computed(() => {
  return [
    { name: 'completion', icon: 'check-circle', color: 'emerald' },
    { name: 'certainty', icon: 'help-circle', color: 'blue' },
    { name: 'priority', icon: 'flag', color: 'rose' },
    { name: 'rating', icon: 'star', color: 'amber' },
    { name: 'weight', icon: 'scale', color: 'indigo' },
  ];
});

// Resolved color via parent chain (nodeId) or fallback to color prop
const effectiveColor = computed(() => {
  const nodeBased = resolveNodeColor(props.nodeId)
  if (nodeBased) return nodeBased
  return props.color || ''
})

const visuals = useBlockVisuals({
  kind: computed(() => props.kind ?? 'instance'),
  conceptType: computed(() => props.conceptType),
  color: effectiveColor,
  icon: computed(() => props.icon),
  typeName: computed(() => props.typeName),
});

// ── Empty state ─────────────────────────────────────────────────
const isEmpty = computed(() => {
  const hasDescription = !!props.description && props.description.trim().length > 0;
  const hasFields = !!props.fields && Object.values(props.fields).some(
    v => v !== undefined && v !== null && v !== '' && v !== false
  );
  const hasInstances = (props.instanceCount ?? 0) > 0;
  return !hasDescription && !hasFields && !hasInstances;
});

// For element pills (instances), prefix the name with the concept's name.
const conceptLabel = computed(() => {
  if (props.kind !== 'instance') return '';
  return props.conceptType || '';
});

// ── Markers ─────────────────────────────────────────────────────

const getMarkerScore = (markerName: string): number => {
  if (!props.blockId) return 0;
  const node = modelStore.getNode(props.blockId);
  if (!node?.markers) return 0;
  return (node.markers[markerName] as number) ?? 0;
};

const activeMarkers = computed(() => {
  if (!props.blockId) return [];
  return allMarkers.value.filter(m => getMarkerScore(m.name) > 0);
});

const cycleMarker = (markerName: string) => {
  if (!props.blockId) return;
  const current = getMarkerScore(markerName);
  const next = (current + 1) % MARKER_CYCLE_COUNT;
  commitMarkerValue(modelStore, props.blockId, markerName, next);
};

const markerClassesFor = (markerName: string) =>
  getMarkerClasses(markerName, getMarkerScore(markerName));

// ── Navigation ──────────────────────────────────────────────────
const navigateToBlock = () => {
  popupVisible.value = false;
};

// ── Popup ───────────────────────────────────────────────────────
const triggerEl = ref<HTMLElement | null>(null);
const popupVisible = ref(false);
const showInfoIcon = ref(false);
const coords = ref({ top: 0, left: 0 });

const togglePopup = () => {
  if (!popupVisible.value) {
    const rect = triggerEl.value?.getBoundingClientRect();
    if (!rect) return;
    coords.value = { left: rect.left, top: rect.bottom + 6 };
  }
  popupVisible.value = !popupVisible.value;
};

const popupStyle = computed(() => ({
  top: `${coords.value.top}px`,
  left: `${coords.value.left}px`,
}));

// ── Visible fields for popup ────────────────────────────────────
const visibleFields = computed(() => {
  if (!props.conceptFields?.length || !props.fields) return [];
  return props.conceptFields
    .map((field: any) => {
      const val = props.fields?.[field.name];
      if (val === undefined || val === '' || val === null || val === false) return null;
      const isReference = field.type === 'reference';
      return {
        name: field.name,
        value: typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val,
        isWikiLink: isReference,
      };
    })
    .filter((f: { name: string; value: any; isWikiLink: boolean } | null): f is { name: string; value: any; isWikiLink: boolean } => f !== null);
});

// ── Info icon class ─────────────────────────────────────────────
const infoIconClass = computed(() => {
  const base = 'shrink-0 w-3.5 h-3.5 cursor-pointer transition-colors';
  if (props.selected && props.kind === 'concept') {
    return `${base} text-white/80 hover:text-white`;
  }
  return `${base} text-slate-400 hover:text-primary`;
});

// ── YIQ contrast text color ────────────────────────────────────
const contrastTextColor = computed(() => {
  if (!effectiveColor.value) return ''
  return yiqTextColor(effectiveColor.value)
})

// ── Pill inline style (YIQ background + text contrast) ─────────
const pillStyle = computed(() => {
  if (!effectiveColor.value) return {}
  const style: Record<string, string> = {}
  style.backgroundColor = getHexColorLight(effectiveColor.value)
  if (contrastTextColor.value) {
    style.color = contrastTextColor.value
  }
  // Opacity is handled by the parent row (ConceptTreeNode)
  // to avoid compounding with the row's own ghost opacity.
  return style
})

// ── Pill classes ────────────────────────────────────────────────
const pillClasses = computed(() => {
  const baseClasses = [
    props.fullWidth ? 'flex w-full items-center' : 'inline-flex items-center max-w-full',
    'px-3 py-1.5 text-xs gap-1.5',
    'rounded-lg font-normal whitespace-normal break-words transition-all duration-200 select-none min-w-0',
    props.interactive ? 'cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1' : '',
    isEmpty.value ? 'italic' : '',
  ];

  if (props.selected) {
    const p = visuals.palette.value;
    if (props.kind === 'concept') {
      return [
        ...baseClasses,
        p.selectedBg, 'text-white',
      ];
    }
    return [
      ...baseClasses,
      p.text,
      'border-primary ring-1 ring-primary shadow-xs',
    ];
  }

  return [
    ...baseClasses,
    ...visuals.containerClasses.value,
    props.interactive ? 'hover:shadow-xs' : '',
  ];
});
</script>

<style scoped>
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.12s ease-out, transform 0.12s ease-out;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}
</style>
