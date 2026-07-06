<template>
  <div class="space-y-2">
    <div v-if="!neighborhood" class="text-muted-foreground text-xs italic text-center p-4">
      This concept is not part of any perspective.
    </div>

    <div
      v-else-if="neighborhood.parents.length === 0 && neighborhood.children.length === 0"
      class="text-muted-foreground text-xs italic text-center p-4"
    >
      No taxonomy neighbors for this concept.
    </div>

    <div v-else class="rounded-lg border border-border bg-background/60 p-2.5 space-y-1.5">
      <!-- Perspective header -->
      <div
        class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"
      >
        <IconRenderer :icon="neighborhood.perspective.icon" custom-class="w-3 h-3 text-primary" />
        <span>{{ neighborhood.perspective.name }}</span>
      </div>

      <!-- Stacked tiers: parents ▲ / active ● / children ▼ -->
      <!-- Parent tier -->
      <div v-if="neighborhood.parents.length" class="perspective-tier">
        <span class="perspective-tier__label">Parent</span>
        <div class="flex items-center flex-wrap gap-1">
          <button
            v-for="p in neighborhood.parents"
            :key="'p-' + p"
            class="perspective-chip"
            @click="selectConcept(p)"
          >
            <IconRenderer
              :icon="iconFor(p)"
              custom-class="w-3 h-3 shrink-0 text-muted-foreground"
            />
            <span class="truncate">{{ p }}</span>
          </button>
        </div>
      </div>

      <!-- Connector -->
      <div v-if="neighborhood.parents.length" class="perspective-connector"></div>

      <!-- Active tier -->
      <div class="perspective-tier">
        <span class="perspective-tier__label perspective-tier__label--active">Active</span>
        <span class="perspective-chip perspective-chip--active">
          <IconRenderer :icon="iconFor(conceptName)" custom-class="w-3 h-3 shrink-0 text-primary" />
          <span class="truncate">{{ conceptName }}</span>
        </span>
      </div>

      <!-- Connector -->
      <div v-if="neighborhood.children.length" class="perspective-connector"></div>

      <!-- Children tier -->
      <div v-if="neighborhood.children.length" class="perspective-tier">
        <span class="perspective-tier__label">Children</span>
        <div class="flex items-center flex-wrap gap-1">
          <button
            v-for="c in neighborhood.children"
            :key="'c-' + c"
            class="perspective-chip"
            @click="selectConcept(c)"
          >
            <IconRenderer
              :icon="iconFor(c)"
              custom-class="w-3 h-3 shrink-0 text-muted-foreground"
            />
            <span class="truncate">{{ c }}</span>
          </button>
        </div>
      </div>

      <!-- Sibling count -->
      <div v-if="siblingCount > 0" class="text-xs text-muted-foreground pt-1 text-right">
        {{ siblingCount }} sibling{{ siblingCount !== 1 ? 's' : '' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMetamodelStore } from '../../stores/metamodelStore'
import { useUiStore } from '../../stores/uiStore'
import IconRenderer from './IconRenderer.vue'

const props = defineProps<{
  conceptName: string
}>()

const emit = defineEmits<{
  (e: 'select', name: string): void
}>()

const metamodelStore = useMetamodelStore()
const uiStore = useUiStore()

const neighborhood = computed(() => {
  if (!props.conceptName) return null
  return metamodelStore.getNeighborhood(props.conceptName)
})

const siblingCount = computed(() => {
  if (!props.conceptName) return 0
  const edges = metamodelStore.taxonomyEdges
  // Find parent concepts of the current concept
  const parentNames = edges.filter((e) => e.child === props.conceptName).map((e) => e.parent)
  if (parentNames.length === 0) return 0
  // Count other children of those parents
  const siblingNames = new Set(
    edges
      .filter((e) => parentNames.includes(e.parent) && e.child !== props.conceptName)
      .map((e) => e.child),
  )
  return siblingNames.size
})

function iconFor(name: string): string {
  const concept = metamodelStore.getConceptByName(name)
  return concept?.icon || ''
}

function selectConcept(name: string): void {
  uiStore.setActivePerspective(`taxonomy-${name}`)
  emit('select', name)
}
</script>

<style scoped>
/* ── Tiers: each level (parent / active / children) is its own row ──── */
.perspective-tier {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.perspective-tier__label {
  flex-shrink: 0;
  width: 3.5rem;
  padding-top: 0.1875rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
}
.perspective-tier__label--active {
  color: rgb(79 70 229);
}

/* Vertical connector linking the tiers, aligned under the labels */
.perspective-connector {
  width: 1px;
  height: 0.5rem;
  margin-left: 1.5rem;
  background: var(--border);
}

.perspective-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 11rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  line-height: 1.125rem;
  border: 1px solid var(--border);
  background: var(--background);
  color: var(--foreground);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}
.perspective-chip:hover {
  background: var(--accent);
}
.perspective-chip--active {
  cursor: default;
  font-weight: 600;
  border-color: rgb(165 180 252);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}
</style>
