<template>
  <div class="flex-1 overflow-y-auto p-6">
    <div class="max-w-3xl mx-auto space-y-8">

      <!-- Header -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm">
          <span class="text-white font-bold text-sm">AI</span>
        </div>
        <div>
          <h1 class="text-lg font-bold text-slate-900 dark:text-slate-100">Use cogNNitive with AI</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Edit your iNNfo models using AI agents</p>
        </div>
      </div>

      <!-- Description card -->
      <div class="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border border-purple-200/60 dark:border-purple-800/30 rounded-xl p-5">
        <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          You can use cogNNitive through its UI to edit and view models.
          You can also edit models using AI agents like <strong>anti-gravity</strong>,
          <strong>Claude Code</strong>, or <strong>OpenCode</strong> through their
          desktop, CLI, or TUI versions.
        </p>
      </div>

      <!-- Tools section -->
      <section>
        <h2 class="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Wrench class="w-4 h-4 text-purple-500" />
          Tools
        </h2>
        <div class="grid gap-3">
          <a v-for="tool in tools" :key="tool.name" :href="tool.url" target="_blank" rel="noopener noreferrer"
            class="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm transition-all group cursor-pointer"
          >
            <div class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors shrink-0">
              {{ tool.initials }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{{ tool.name }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ tool.description }}</p>
            </div>
            <ExternalLink class="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors shrink-0" />
          </a>
        </div>
      </section>

      <!-- Steps section -->
      <section>
        <h2 class="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ListOrdered class="w-4 h-4 text-purple-500" />
          Steps
        </h2>
        <div class="space-y-3">
          <div v-for="(step, i) in steps" :key="i"
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
          >
            <div class="flex items-start gap-3">
              <span class="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold shrink-0 mt-0.5">
                {{ i + 1 }}
              </span>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{{ step.title }}</h3>
                <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed" v-html="step.description"></p>
                <div v-if="step.links" class="flex flex-wrap gap-2 mt-3">
                  <a v-for="link in step.links" :key="link.url" :href="link.url" target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-2xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline"
                  >
                    <ExternalLink class="w-3 h-3" />
                    {{ link.label }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Prompt tip -->
      <div class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <Lightbulb class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p class="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Quick start</p>
            <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Once your workspace is set up, just tell your agent:
              <br>
              <code class="inline-block mt-1.5 px-3 py-1.5 bg-amber-100/80 dark:bg-amber-900/40 rounded-lg text-xs font-medium text-amber-800 dark:text-amber-300">
                "I want to edit a model in the chat"
              </code>
            </p>
          </div>
        </div>
      </div>

      <!-- Right sidebar prompts tip -->
      <div class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/30 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <PanelRightOpen class="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p class="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Right sidebar prompts</p>
            <p class="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              When viewing a model in cogNNitive, the <strong>right sidebar</strong>
              shows suggested prompts for each concept. Copy and paste them into your AI agent
              to dive deeper into that concept or element.
            </p>
          </div>
        </div>
      </div>

      <!-- Export / Transform section -->
      <section>
        <h2 class="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileOutput class="w-4 h-4 text-purple-500" />
          Export / Transform
        </h2>

        <div v-if="!hasWorkspace" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Open a model to see export options.
          </p>
        </div>

        <div v-else-if="downloadError" class="bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-800/30 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <AlertTriangle class="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p class="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Templates not found</p>
              <p class="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                Could not download export templates automatically.
                Download them from
                <a :href="transformRepoUrl" target="_blank" rel="noopener noreferrer"
                   class="underline font-medium hover:text-red-800 dark:hover:text-red-200">
                  the repository
                </a>
                and place the <code class="text-2xs bg-red-100 dark:bg-red-900/40 px-1 rounded">traNNsform/</code>
                folder in your workspace root.
              </p>
            </div>
          </div>
        </div>

        <div v-else-if="!templatesReady" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div class="flex items-center gap-2">
            <Loader class="w-4 h-4 text-purple-500 animate-spin" />
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Checking export templates...
            </p>
          </div>
        </div>

        <div v-else class="space-y-3">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Tell your AI agent:
          </p>
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div class="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
              <code class="block text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">Generate an export for {{ modelFilename }} following traNNsform/AGENT.md</code>
            </div>
            <div class="flex items-center justify-end gap-2 px-4 py-2 bg-white dark:bg-slate-900">
              <button @click="copyExportPrompt"
                class="inline-flex items-center gap-1.5 text-2xs font-medium px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer">
                <Copy class="w-3 h-3" />
                Copy
              </button>
            </div>
          </div>
          <div class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-lg px-4 py-3 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            <strong>Important:</strong> Some agents may try to use their own export format and save the file in the wrong location.
            The <code class="text-2xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">traNNsform/AGENT.md</code> file tells them exactly where to save
            (<code class="text-2xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">traNNsform/outputs/</code>) and how to name the file so it appears here.
            If your agent doesn't follow the protocol, direct it to read <code class="text-2xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">traNNsform/AGENT.md</code> first.
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Wrench, ExternalLink, ListOrdered, Lightbulb, PanelRightOpen, FileOutput, Copy, AlertTriangle, Loader } from 'lucide-vue-next'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useModelStore } from '../../stores/modelStore'

const workspaceStore = useWorkspaceStore()
const modelStore = useModelStore()

const hasWorkspace = computed(() => workspaceStore.hasHandle)
const templatesReady = ref(false)
const downloadError = ref(false)

const TRANSFORM_BASE_URL = 'https://raw.githubusercontent.com/innV0/cogNNitive/main/traNNsform'
const transformRepoUrl = 'https://github.com/innV0/cogNNitive/tree/main/traNNsform'

/** Returns the model filename for display. */
const modelFilename = computed(() => {
  const rootId = modelStore.rootIds[0]
  if (!rootId) return 'your model'
  const rootNode = modelStore.getNode(rootId)
  const path = rootNode?.source?.path
  return path?.split(/[/\\]/).pop() ?? 'your model'
})

/** Check if traNNsform/ exists in the workspace, try to download if not. */
async function ensureTemplates(): Promise<void> {
  const handle = workspaceStore.handle
  if (!handle) {
    templatesReady.value = false
    return
  }

  // Check if traNNsform/ already exists
  try {
    await handle.getDirectoryHandle('traNNsform')
    templatesReady.value = true
    return
  } catch {
    // Not found — try to download
  }

  // Try to create and populate traNNsform/
  try {
    const transformDir = await handle.getDirectoryHandle('traNNsform', { create: true })
    const templatesDir = await transformDir.getDirectoryHandle('templates', { create: true })
    const snippetsDir = await transformDir.getDirectoryHandle('snippets', { create: true })

    // List of files to download
    const files = [
      { path: '', name: 'README.md' },
      { path: 'templates', name: 'business.md' },
      { path: 'templates', name: 'procedures.md' },
      { path: 'templates', name: 'catalog.md' },
      { path: 'templates', name: '_generic.md' },
      { path: 'snippets', name: 'chart-patterns.md' },
    ]

    for (const file of files) {
      const url = `${TRANSFORM_BASE_URL}/${file.path}/${file.name}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`Failed to fetch ${file.name}`)
      const text = await resp.text()

      const dir = file.path === ''
        ? transformDir
        : file.path === 'templates' ? templatesDir : snippetsDir

      const fileHandle = await dir.getFileHandle(file.name, { create: true })
      if (fileHandle.createWritable) {
        const w = await fileHandle.createWritable()
        await w.write(text)
        await w.close()
      }
    }

    templatesReady.value = true
  } catch {
    downloadError.value = true
    templatesReady.value = true
  }
}

/** Copies the export instruction to clipboard. */
function copyExportPrompt(): void {
  const text = `Generate an export for ${modelFilename.value} following traNNsform/AGENT.md`
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  })
}

onMounted(() => {
  ensureTemplates()
})

const tools = [
  {
    name: 'Claude Code',
    initials: 'CC',
    description: 'Recommended. Powerful AI agent with a generous free tier. Desktop, CLI, and TUI versions.',
    url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    name: 'OpenCode',
    initials: 'OC',
    description: 'Open-source TUI/CLI client for editing code and models with AI.',
    url: 'https://github.com/anomalyco/opencode',
  },
  {
    name: 'anti-gravity',
    initials: 'AG',
    description: 'AI tool specialized for editing models and documentation.',
    url: 'https://docs.antigravity.ai',
  },
]

const steps = [
  {
    title: 'Download and choose an AI agent',
    description: 'Download and choose one of the tools from the <strong>Tools</strong> section above. You can use their desktop, CLI, or TUI versions. Pick the one you\'re most comfortable with. We recommend <strong>Claude Code</strong> by default — it has a generous free tier.',
    links: tools.map(t => ({ label: `Download ${t.name}`, url: t.url })),
  },
  {
    title: 'Open the workspace folder in your AI agent',
    description: 'Add a workspace pointing to the same folder you use in cogNNitive. You can find the exact path at the top of the header, in the info icon <strong>(i)</strong>. All AI agents work directly on the file system, so sharing the folder is all you need.',
  },
  {
    title: 'Edit models via chat',
    description: 'Once configured, just tell your agent: <em>"I want to edit a model in the chat"</em>. The agent will activate and you can ask for modifications in natural language: add concepts, change fields, restructure sections, and more.',
  },
  {
    title: 'Use right sidebar prompts to go deeper',
    description: 'When viewing a model in cogNNitive, the <strong>right sidebar</strong> shows <strong>suggested prompts</strong> for each concept. Copy and paste them into your AI agent to dive deeper into that specific concept or element.',
  },
]
</script>
