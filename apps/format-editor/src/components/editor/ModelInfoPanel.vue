<template>
  <div class="space-y-6 max-w-4xl mx-auto p-1">
    <!-- Header Section -->
    <div class="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
      <div class="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
        <span class="font-mono text-lg font-black text-primary select-none leading-none">_F</span>
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
            FORMAT Metadata
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
import { FolderOpen, FileText, Settings, Copy, Check } from 'lucide-vue-next';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useModelStore } from '../../stores/modelStore';
import { DEFAULT_FORMAT_VERSION, DEFAULT_TEMPLATE_NAME, DEFAULT_TEMPLATE_VERSION, buildSpecificationUrl, buildDocumentationLocation } from '../../utils/constants';

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
  return extractFrontmatterField('spec_version') || DEFAULT_FORMAT_VERSION;
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
</script>
