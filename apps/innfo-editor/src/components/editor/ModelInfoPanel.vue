<template>
  <div class="space-y-6 max-w-4xl mx-auto p-1">
    <!-- Header Section -->
    <div class="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
      <div class="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
        <span class="font-mono text-lg font-black text-primary select-none leading-none">_NN</span>
      </div>
      <div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Model Information & Workspace</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">Manage your workspace files, inspect metamodel configurations, and view raw model data.</p>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

      <!-- Left Column: Workspace & Files -->
      <div class="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderOpen class="w-4 h-4 text-primary" />
            Workspace Directory
          </h3>
          <span
            :class="workspaceStore.handle ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-900/30 dark:text-amber-400'"
            class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
          >
            {{ workspaceStore.handle ? 'Connected' : 'Demo Mode' }}
          </span>
        </div>

        <!-- Connected State -->
        <div v-if="workspaceStore.handle" class="space-y-3">
          <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md border border-slate-200 dark:border-slate-700">
            <span class="truncate font-mono font-semibold text-slate-900 dark:text-slate-100">{{ workspaceStore.handle.name }}</span>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block px-1">Model Info</label>
            <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-500">Root Node:</span>
                <span class="font-medium text-slate-900 dark:text-slate-100 font-mono">{{ rootNodeId }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Total Nodes:</span>
                <span class="font-medium text-slate-900 dark:text-slate-100">{{ nodeCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Disconnected State -->
        <div v-else class="py-8 text-center space-y-4">
          <FolderOpen class="w-12 h-12 text-slate-400/45 mx-auto" />
          <div class="space-y-1">
            <p class="text-xs text-slate-500 dark:text-slate-400">No workspace directory connected. Load a model from the home page.</p>
          </div>
        </div>
      </div>

      <!-- Right Column: Model Metadata -->
      <div class="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div class="border-b border-slate-200 dark:border-slate-700 pb-3">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings class="w-4 h-4 text-primary" />
            iNNfo Metadata
          </h3>
        </div>

        <div class="space-y-3.5 text-xs">
          <div class="grid grid-cols-2 gap-4">
            <div class="p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900/50 space-y-1">
              <span class="text-slate-500 dark:text-slate-400 block text-xs uppercase font-bold tracking-wider">Format Version</span>
              <span class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ formatVersion }}</span>
            </div>
            <div class="p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900/50 space-y-1">
              <span class="text-slate-500 dark:text-slate-400 block text-xs uppercase font-bold tracking-wider">Specification</span>
              <span class="text-xs font-mono text-primary truncate block mt-1">{{ specUrl }}</span>
            </div>
          </div>

          <div class="pt-2 divide-y divide-slate-200/60 dark:divide-slate-700/60">
            <div class="flex justify-between py-2">
              <span class="text-slate-500 dark:text-slate-400">Template Name:</span>
              <span class="font-medium text-slate-900 dark:text-slate-100 font-mono">{{ templateName }}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-slate-500 dark:text-slate-400">Template Version:</span>
              <span class="font-medium text-slate-900 dark:text-slate-100 font-mono">{{ templateVersion }}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-slate-500 dark:text-slate-400">Model Version:</span>
              <span class="font-medium text-slate-900 dark:text-slate-100 font-mono">{{ modelVersion }}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-slate-500 dark:text-slate-400">Last Saved:</span>
              <span class="font-medium text-slate-900 dark:text-slate-100">{{ lastSaved }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Version Management Section -->
    <div class="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
      <div
        class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 cursor-pointer select-none"
        @click="showVersionPanel = !showVersionPanel"
      >
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Tag class="w-4 h-4 text-primary" />
          Version Management
        </h3>
        <div class="flex items-center gap-2">
          <span v-if="currentVersionStr" class="text-xs font-mono text-slate-400">{{ currentVersionStr }}</span>
          <ChevronDown v-if="showVersionPanel" class="w-4 h-4 text-slate-400" />
          <ChevronRight v-else class="w-4 h-4 text-slate-400" />
        </div>
      </div>

      <div v-if="showVersionPanel" class="space-y-4">
        <!-- Current version display -->
        <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-200 dark:border-slate-700">
          <span class="text-xs text-slate-500 dark:text-slate-400">Current Version</span>
          <span class="font-mono font-bold text-slate-900 dark:text-slate-100">{{ currentVersionStr || '—' }}</span>
        </div>

        <!-- Bump buttons with hover preview -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Bump Level</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="level in bumpLevels"
              :key="level"
              :disabled="isVersionDisabled"
              :title="versionButtonTitle(level)"
              :class="[
                'relative px-3 py-2 rounded-md text-xs font-semibold border transition-all duration-150',
                isVersionDisabled
                  ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-primary/50 hover:bg-primary/5 active:scale-95',
                selectedLevel === level ? 'ring-2 ring-primary border-primary' : '',
              ]"
              @click="selectedLevel = level"
            >
              {{ level.charAt(0).toUpperCase() + level.slice(1) }}
              <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">{{ versionPreview(level) }}</span>
            </button>
          </div>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
            <strong>Major</strong>: breaking changes &middot;
            <strong>Minor</strong>: additive changes &middot;
            <strong>Patch</strong>: fixes and refinements
          </p>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center justify-between pt-1">
          <p v-if="versionDisabledReason" class="text-xs text-amber-500 italic">{{ versionDisabledReason }}</p>
          <div v-else></div>
          <button
            :disabled="isVersionDisabled || !selectedLevel"
            :title="!selectedLevel ? 'Select a bump level first' : ''"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition-all duration-150 shadow-xs"
            :class="isVersionDisabled || !selectedLevel
              ? 'opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-400'
              : 'bg-primary text-white hover:brightness-110 active:scale-95'"
            @click="saveVersion"
          >
            <Save class="w-3.5 h-3.5" />
            Save New Version
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom Section: Plain Text View -->
    <div class="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileText class="w-4 h-4 text-primary" />
          Plain Text Model View
        </h3>

        <div class="flex items-center gap-2">
          <label class="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              v-model="showPlainTextView"
              class="sr-only peer"
            >
            <div class="w-9 h-5 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            <span class="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">Show Source Code</span>
          </label>
        </div>
      </div>

      <!-- Plain Text Content Display -->
      <div v-if="showPlainTextView" class="space-y-3">
        <div class="relative rounded-md border border-slate-200 dark:border-slate-700 bg-slate-900 overflow-hidden shadow-inner">
          <textarea
            readonly
            :value="rawContent"
            rows="16"
            class="w-full bg-slate-950 text-slate-200 font-mono text-xs p-4 focus:outline-none resize-none border-none outline-none leading-relaxed select-all selection:bg-primary selection:text-white"
          ></textarea>
        </div>
      </div>

      <div v-else class="py-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
        Toggle "Show Source Code" to display the raw Markdown model representation.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { FolderOpen, FileText, Settings, Tag, Save, ChevronDown, ChevronRight } from 'lucide-vue-next';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useModelStore } from '../../stores/modelStore';
import { DEFAULT_INNFO_VERSION, DEFAULT_TEMPLATE_NAME, DEFAULT_TEMPLATE_VERSION, buildSpecificationUrl, buildDocumentationLocation } from '../../utils/constants';
import { bumpVersion, formatVersionString, parseFormatFilename, buildFormatFilename } from '../../utils/version';
import type { BumpLevel, SemVer } from '../../utils/version';

const props = defineProps<{
  rootNodeId: string;
}>();

const workspaceStore = useWorkspaceStore();
const modelStore = useModelStore();

const showPlainTextView = ref(false);

// ── Frontmatter resolution from root node rawContent ──
const rootNode = computed(() => modelStore.getNode(props.rootNodeId));

const rawContent = computed(() => rootNode.value?.rawContent ?? '');

const nodeCount = computed(() => Object.keys(modelStore.nodes).length);

function extractFrontmatterField(field: string): string | null {
  const content = rawContent.value;
  if (!content) return null;

  // Try YAML-like frontmatter between --- markers
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const yaml = fmMatch[1];
  // Support dotted paths like "template.name"
  const parts = field.split('.');
  let current: any = yaml;
  for (const part of parts) {
    // Simple YAML line matching
    const regex = new RegExp(`^${part}:\\s*(.+)$`, 'm');
    const match = current.match(regex);
    if (!match) return null;
    current = match[1].trim().replace(/^["']|["']$/g, '');
  }
  return current || null;
}

const formatVersion = computed(() => {
  return extractFrontmatterField('spec_version') || DEFAULT_INNFO_VERSION;
});

const templateName = computed(() => {
  // Try template.name which is nested YAML
  const content = rawContent.value;
  if (!content) return DEFAULT_TEMPLATE_NAME;
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return DEFAULT_TEMPLATE_NAME;
  const yaml = fmMatch[1];
  const match = yaml.match(/^template:\s*\n\s+name:\s*["']?(.+?)["']?\s*$/m);
  return match ? match[1].trim() : DEFAULT_TEMPLATE_NAME;
});

const templateVersion = computed(() => {
  const content = rawContent.value;
  if (!content) return DEFAULT_TEMPLATE_VERSION;
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return DEFAULT_TEMPLATE_VERSION;
  const yaml = fmMatch[1];
  const match = yaml.match(/^template:\s*\n\s+version:\s*["']?(.+?)["']?\s*$/m);
  return match ? match[1].trim() : DEFAULT_TEMPLATE_VERSION;
});

const modelVersion = computed(() => {
  return extractFrontmatterField('model_version') || extractFrontmatterField('version') || '1.0.0';
});

const lastSaved = computed(() => {
  const raw = extractFrontmatterField('last_saved');
  if (!raw) return 'Unknown';
  try {
    return new Date(raw).toLocaleString();
  } catch {
    return raw;
  }
});

const specUrl = computed(() => buildSpecificationUrl(formatVersion.value));

// ── Version Management ─────────────────────────────────────────────────

const showVersionPanel = ref(false);
const selectedLevel = ref<BumpLevel | null>(null);

const bumpLevels: BumpLevel[] = ['major', 'minor', 'patch'];

/** Parses a "V_Major-Minor-Patch" string into a SemVer tuple. */
function parseVersionString(str: string): SemVer | null {
  const match = str.match(/^V_(\d+)-(\d+)-(\d+)$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/** The raw model_version field value (e.g. "V_1-2-3") from frontmatter. */
const rawModelVersion = computed(() => {
  return extractFrontmatterField('model_version') || extractFrontmatterField('version') || 'V_1-0-0';
});

/** Parsed SemVer of the current model version. */
const currentModelSemVer = computed((): SemVer | null => parseVersionString(rawModelVersion.value));

/** Formatted version string for display (e.g. "V_1-2-3"). */
const currentVersionStr = computed(() => {
  const semver = currentModelSemVer.value;
  return semver ? formatVersionString(semver) : rawModelVersion.value;
});

/**
 * Computes the preview version for a given bump level.
 * Returns "V_X-Y-Z" string or "—" if the current version can't be parsed.
 */
function versionPreview(level: BumpLevel): string {
  const current = currentModelSemVer.value;
  if (!current) return '—';
  const bumped = bumpVersion(current, level);
  return formatVersionString(bumped);
}

/**
 * Computes the tooltip text for a bump button, e.g.
 * "V_1-0-0 → V_2-0-0"
 */
function versionButtonTitle(level: BumpLevel): string {
  if (isVersionDisabled.value) return versionDisabledReason.value || 'Version management is unavailable';
  const current = currentVersionStr.value;
  const preview = versionPreview(level);
  return `${current} → ${preview}`;
}

// ── Disabled states ─────────────────────────────────────────────────────

const isVersionDisabled = computed(() => {
  return !workspaceStore.handle || workspaceStore.saving || modelStore.rootIds.length === 0;
});

const versionDisabledReason = computed(() => {
  if (!workspaceStore.handle) return 'Connect a workspace to save versions';
  if (workspaceStore.saving) return 'Workspace is currently saving';
  if (modelStore.rootIds.length === 0) return 'No root node available';
  return null;
});

// ── Save action ─────────────────────────────────────────────────────────

async function saveVersion(): Promise<void> {
  if (!selectedLevel.value || isVersionDisabled.value) return;
  const level = selectedLevel.value;

  try {
    await workspaceStore.saveActiveFileWithVersionBump(level);
    selectedLevel.value = null;
  } catch (err) {
    console.error('Version save failed:', err);
  }
}
</script>
