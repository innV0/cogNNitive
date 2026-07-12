<template>
  <div class="flex-1 overflow-y-auto p-6">
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm"
        >
          <span class="text-white font-bold text-sm">AI</span>
        </div>
        <div>
          <h1 class="text-lg font-bold text-slate-900 dark:text-slate-100">
            Use cogNNitive with AI
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            Edit your iNNfo models using OpenCode
          </p>
        </div>
      </div>

      <!-- Description card -->
      <div
        class="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border border-purple-200/60 dark:border-purple-800/30 rounded-xl p-5"
      >
        <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          cogNNitive works with <strong>OpenCode</strong> — the supported AI agent reads project
          skills natively and discovers them automatically. OpenCode works directly on the file
          system, so sharing the workspace folder is all it needs.
        </p>
        <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-3">
          The full procedure — including setup, workspace configuration, MCP activation, model
          editing, imports, and exports — is documented in the
          <strong>procedure model file</strong> below. This is the single source of truth;
          everything here is generated from it.
        </p>
      </div>

      <!-- Single source of truth card -->
      <div
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
      >
        <div
          class="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700"
        >
          <FileText class="w-4 h-4 text-purple-500" />
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Procedure Model — Source of Truth
          </span>
        </div>
        <div class="p-4 space-y-3">
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            All AI workflow instructions live in this file:
          </p>
          <a
            :href="procedureUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:border-purple-300 dark:hover:border-purple-700 transition-colors group"
          >
            <BookOpen class="w-5 h-5 text-purple-500 shrink-0" />
            <div class="flex-1 min-w-0">
              <p
                class="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors"
              >
                models/UseCogNNitiveWithAI_V_1-0-0_procedures_NN.md
              </p>
              <p class="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                Install OpenCode, open the workspace, configure MCP, edit models via chat,
                import documents, export visualizers
              </p>
            </div>
            <ExternalLink
              class="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors shrink-0"
            />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpen, ExternalLink, FileText } from 'lucide-vue-next'
import { computed } from 'vue'

const procedureUrl = computed(() => {
  // GitHub raw link — always points to the latest version
  return 'https://github.com/innV0/cogNNitive/blob/main/models/UseCogNNitiveWithAI_V_1-0-0_procedures_NN.md'
})
</script>
