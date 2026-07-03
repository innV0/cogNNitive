<template>
  <header class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-6 py-3 shrink-0">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2.5">
        <span class="font-mono text-lg font-black text-primary select-none leading-none">_F</span>
        <h1 class="text-sm font-semibold tracking-tight">FORMAT Modeler</h1>
      </div>

      <!-- Model Info Section -->
      <div v-if="hasRootNode" class="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400">
        <!-- Format Version -->
        <div class="flex items-center gap-1">
          <span>Format:</span>
          <span class="font-mono">{{ formatVersion }}</span>
        </div>

        <!-- Template Info -->
        <div class="flex items-center gap-1">
          <span>Template:</span>
          <span>{{ templateName }}</span>
          <span>{{ templateVersion }}</span>
        </div>

        <!-- Model Version -->
        <div class="flex items-center gap-1">
          <span>Model:</span>
          <span class="font-mono">{{ modelVersion || '—' }}</span>
        </div>

        <!-- Status Badge -->
        <div class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-bold ring-1 ring-inset"
          :class="unsavedChanges
            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-amber-600/20'
            : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20'"
        >
          {{ unsavedChanges ? 'Unsaved changes' : 'Saved' }}
        </div>

        <!-- File path from root node source -->
        <div class="flex items-center gap-1">
          <span class="font-mono max-w-[200px] truncate">{{ filePath }}</span>
          <button @click="copyFilePath" class="p-0.5 rounded text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer" title="Copy path">
            <Copy class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <!-- Save Button -->
      <div class="relative" ref="saveDropdownRef">
        <div class="relative inline-flex rounded-md shadow-xs">
          <button
            @click="handleSave"
            class="inline-flex items-center gap-1.5 rounded-l-md px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-all cursor-pointer"
            :class="unsavedChanges
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-red-300 dark:ring-red-700 hover:bg-red-100 dark:hover:bg-red-900/50'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'"
          >
            <Save class="w-3.5 h-3.5" />
            {{ unsavedChanges ? 'Update' : 'Save' }}
          </button>
          <button
            @click="toggleSaveDropdown"
            class="inline-flex items-center rounded-r-md px-2 py-1.5 text-xs font-semibold ring-1 ring-inset transition-all cursor-pointer border-l"
            :class="unsavedChanges
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-red-300 dark:ring-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-200 dark:border-red-700'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-600'"
          >
            <ChevronDown class="w-3.5 h-3.5" />
          </button>

          <!-- Save Dropdown -->
          <div
            v-if="saveDropdownOpen"
            class="absolute right-0 top-full mt-1.5 w-72 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-600 py-2 z-50"
          >
            <div class="px-3 pt-1">
              <div class="flex items-center justify-between mb-1.5">
                <span class="flex items-center gap-1 text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Model Version
                </span>
                <span class="font-mono text-xs font-semibold text-primary">{{ modelVersion }}</span>
              </div>
              <p v-if="bumpError" class="text-2xs text-red-600 dark:text-red-400 mb-1.5 leading-tight">{{ bumpError }}</p>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  v-for="lvl in (['major', 'minor', 'patch'] as const)"
                  :key="lvl"
                  @click="bumpVersion(lvl)"
                  class="rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-1.5 text-2xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer capitalize"
                >
                  {{ lvl }}
                </button>
              </div>
              <p class="text-2xs text-slate-400 dark:text-slate-500 mt-1.5 leading-tight">
                Saves a new versioned file, keeping the current one.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Info button -->
      <button
        class="p-1.5 rounded transition-colors cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        title="View Model Status"
      >
        <Info class="w-4 h-4" />
      </button>

      <!-- External links -->
      <div class="flex items-center gap-0.5 pl-2">
        <a
          href="https://format.innv0.com"
          target="_blank"
          rel="noopener noreferrer"
          class="px-2 py-1 rounded text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
        >Open web</a>
        <a
          href="https://format.innv0.com/documentation/"
          target="_blank"
          rel="noopener noreferrer"
          class="px-2 py-1 rounded text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
        >Open docs</a>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Copy, Save, ChevronDown, Info } from 'lucide-vue-next';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useModelStore } from '../../stores/modelStore';
import { DEFAULT_FORMAT_VERSION, DEFAULT_TEMPLATE_NAME, DEFAULT_TEMPLATE_VERSION } from '../../utils/constants';
import { useToast } from '../../shared/useToast';

const workspaceStore = useWorkspaceStore();
const { show } = useToast();
const modelStore = useModelStore();

const saveDropdownOpen = ref(false);
const saveDropdownRef = ref<HTMLElement | null>(null);
const bumpError = ref('');

// ── Root node frontmatter extraction ────────────────────────────

const rootNode = computed(() => {
  const ids = modelStore.rootIds;
  if (ids.length === 0) return null;
  return modelStore.getNode(ids[0]);
});

const hasRootNode = computed(() => rootNode.value !== null);

const filePath = computed(() => {
  const node = rootNode.value;
  if (!node?.source?.path) return '';
  return node.source.path;
});

/**
 * Minimal frontmatter parser for known fields.
 * Extracts formatVersion, templateName, templateVersion from rawContent YAML-like frontmatter.
 */
function parseFrontmatter(rawContent: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!rawContent) return result;

  // Match YAML frontmatter between --- delimiters
  const match = rawContent.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return result;

  const frontmatter = match[1];
  const fieldPatterns: Record<string, RegExp> = {
    formatVersion: /^format_version\s*[=:]\s*(.+)$/im,
    templateName: /^template_name\s*[=:]\s*(.+)$/im,
    templateVersion: /^template_version\s*[=:]\s*(.+)$/im,
    modelVersion: /^version\s*[=:]\s*(.+)$/im,
  };

  for (const [key, pattern] of Object.entries(fieldPatterns)) {
    const fieldMatch = frontmatter.match(pattern);
    if (fieldMatch) {
      result[key] = fieldMatch[1].trim();
    }
  }

  return result;
}

const frontmatter = computed(() => parseFrontmatter(rootNode.value?.rawContent));

const formatVersion = computed(() => frontmatter.value.formatVersion || DEFAULT_FORMAT_VERSION);
const templateName = computed(() => frontmatter.value.templateName || DEFAULT_TEMPLATE_NAME);
const templateVersion = computed(() => frontmatter.value.templateVersion || DEFAULT_TEMPLATE_VERSION);
const modelVersion = computed(() => frontmatter.value.modelVersion || '—');

const unsavedChanges = computed(() => modelStore.dirtyIds.size > 0);

// ── Save flow ───────────────────────────────────────────────────

async function handleSave(): Promise<void> {
  if (!hasRootNode.value) return;
  try {
    await workspaceStore.saveActiveFile();
    saveDropdownOpen.value = false;
    show('Saved successfully.', 'success');
  } catch (err) {
    bumpError.value = err instanceof Error ? err.message : 'Save failed';
  }
}

async function bumpVersion(level: 'major' | 'minor' | 'patch'): Promise<void> {
  bumpError.value = '';
  if (!hasRootNode.value) return;
  try {
    await workspaceStore.saveActiveFileWithVersionBump(level);
    saveDropdownOpen.value = false;
    show('Version bumped to ' + modelVersion.value, 'success');
  } catch (err) {
    bumpError.value = err instanceof Error ? err.message : 'Version bump failed';
  }
}

// ── Dropdown ────────────────────────────────────────────────────

function toggleSaveDropdown(): void {
  bumpError.value = '';
  saveDropdownOpen.value = !saveDropdownOpen.value;
}

function closeDropdown(e: MouseEvent): void {
  if (saveDropdownRef.value && !saveDropdownRef.value.contains(e.target as Node)) {
    saveDropdownOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown);
});

// ── Clipboard ───────────────────────────────────────────────────

async function copyFilePath(): Promise<void> {
  if (filePath.value) {
    try {
      await navigator.clipboard.writeText(filePath.value);
    } catch {
      // clipboard not available
    }
  }
}
</script>
