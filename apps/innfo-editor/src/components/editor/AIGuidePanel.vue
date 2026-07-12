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
            Edit your iNNfo models using AI agents
          </p>
        </div>
      </div>

      <!-- Description card -->
      <div
        class="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border border-purple-200/60 dark:border-purple-800/30 rounded-xl p-5"
      >
        <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Edit and view your models here in cogNNitive, or drive them with
          <strong>OpenCode</strong>
          — the supported AI agent for cogNNitive. Follow the steps below — they're saved as you go,
          so you only set up your agent once.
        </p>
      </div>

      <!-- Steps section -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h2
            class="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2"
          >
            <ListOrdered class="w-4 h-4 text-purple-500" />
            Steps
            <span
              class="text-2xs font-medium text-slate-400 dark:text-slate-500 normal-case tracking-normal"
            >
              {{ completedCount }}/{{ steps.length }}
            </span>
          </h2>
          <button
            v-if="completedCount > 0"
            @click="resetSteps"
            class="inline-flex items-center gap-1 text-2xs font-medium text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
          >
            <RotateCcw class="w-3 h-3" />
            Reset
          </button>
        </div>

        <!-- All done banner -->
        <div
          v-if="allDone"
          class="mb-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 rounded-xl p-4 flex items-start gap-3"
        >
          <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p class="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-0.5">
              You're all set
            </p>
            <p class="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
              Your agent is ready. Expand any step to review it, or hit <strong>Reset</strong> to
              start over.
            </p>
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="step in steps"
            :key="step.id"
            class="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden transition-colors"
            :class="
              isExpanded(step.id)
                ? 'border-purple-300 dark:border-purple-700'
                : 'border-slate-200 dark:border-slate-700'
            "
          >
            <!-- Step header (click to expand/collapse) -->
            <div
              data-step-header
              class="flex items-center gap-3 p-3 cursor-pointer select-none"
              @click="toggleStep(step.id)"
            >
              <!-- Checkbox / number badge (click to mark done) -->
              <button
                type="button"
                @click.stop="toggleDone(step.id)"
                class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer"
                :class="
                  isDone(step.id)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                "
                :title="isDone(step.id) ? 'Mark as not done' : 'Mark as done'"
                :aria-pressed="isDone(step.id)"
              >
                <Check v-if="isDone(step.id)" class="w-4 h-4" />
                <span v-else>{{ stepNumber(step.id) }}</span>
              </button>

              <h3
                class="flex-1 min-w-0 text-sm font-semibold transition-colors"
                :class="
                  isDone(step.id)
                    ? 'text-slate-400 dark:text-slate-500'
                    : 'text-slate-800 dark:text-slate-200'
                "
              >
                {{ step.title }}
              </h3>

              <ChevronDown
                class="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform"
                :class="isExpanded(step.id) ? 'rotate-180' : ''"
              />
            </div>

            <!-- Step body (collapsible) -->
            <div v-if="isExpanded(step.id)" class="pl-[3.25rem] pr-4 pb-4">
      <p
        class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
        v-html="step.description"
      ></p>

      <!-- Step 2.5: MCP tools -->
      <div v-if="step.id === 'mcp'" class="mt-3 space-y-3">
        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          OpenCode needs the <strong>innfo-mcp</strong> server to validate model structure and
          apply changes correctly. Open OpenCode in your workspace and tell it:
          <em>"Load the innv0-innfo skill and check that innfo-mcp is configured"</em>.
          The skill detects if the MCP server is set up and guides you through any steps.
        </p>
        <div
          class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-lg px-4 py-3 text-xs text-amber-700 dark:text-amber-400 leading-relaxed"
        >
          If OpenCode reports that innfo-mcp tools are not available, tell it to read
          <code class="text-2xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded"
            >docs/mcp-setup.md</code
          >
          for the current configuration paths or ask it to research your client's MCP registration
          mechanism.
        </div>
      </div>

              <!-- Step 1: agent download cards -->
              <div v-if="step.id === 'agent'" class="mt-3 space-y-2">
                <a
                  v-for="tool in tools"
                  :key="tool.name"
                  :href="tool.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm transition-all group cursor-pointer"
                >
                  <div
                    class="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xs font-bold text-slate-400 dark:text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors shrink-0"
                  >
                    {{ tool.initials }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p
                      class="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center gap-1.5"
                    >
                      {{ tool.name }}
                      <span
                        v-if="tool.recommended"
                        class="text-2xs font-medium px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                      >
                        Recommended
                      </span>
                    </p>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {{ tool.description }}
                    </p>
                  </div>
                  <ExternalLink
                    class="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors shrink-0"
                  />
                </a>

                <button
                  type="button"
                  @click="markAgentDone"
                  class="w-full text-left text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 px-3 py-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors cursor-pointer"
                >
                  Already use an AI agent? Skip this step →
                </button>
              </div>

              <!-- Step 2: locate the workspace folder -->
              <div v-else-if="step.id === 'workspace'" class="mt-3 space-y-2">
                <template v-if="workspaceName">
                  <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Your workspace folder is named
                    <code
                      class="text-2xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-700 dark:text-slate-300"
                      >{{ workspaceName }}</code
                    >:
                  </p>
                  <ul
                    class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1 list-disc pl-4"
                  >
                    <li>
                      Desktop / IDE agents: use <strong>File → Open Folder</strong> and pick
                      <code
                        class="text-2xs bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono"
                        >{{ workspaceName }}</code
                      >.
                    </li>
                    <li>
                      CLI / TUI agents:
                      <code class="text-2xs bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono"
                        >cd</code
                      >
                      into that folder, then start the agent there.
                    </li>
                  </ul>
                  <p class="text-2xs text-slate-500 dark:text-slate-500 leading-relaxed">
                    It's wherever you created it — commonly under your
                    <strong>Documents</strong> folder (e.g.
                    <code class="text-2xs bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono"
                      >Documents\{{ workspaceName }}</code
                    >). For security, the browser can't reveal or open the full path, so use the
                    folder name to find it.
                  </p>
                </template>
                <p v-else class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Open a model in cogNNitive first — this step will then show your workspace folder
                  name so you can locate it.
                </p>
              </div>

              <!-- Step 3: copyable kickoff prompt -->
              <div
                v-else-if="step.id === 'chat'"
                class="mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
              >
                <div class="p-3">
                  <code class="block text-xs text-slate-700 dark:text-slate-300 font-mono">{{
                    CHAT_PROMPT
                  }}</code>
                </div>
                <div
                  class="flex items-center justify-end px-3 py-2 border-t border-slate-200 dark:border-slate-700"
                >
                  <button
                    type="button"
                    @click="copyChatPrompt"
                    class="inline-flex items-center gap-1.5 text-2xs font-medium px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                  >
                    <Check v-if="chatCopied" class="w-3 h-3" />
                    <Copy v-else class="w-3 h-3" />
                    {{ chatCopied ? 'Copied' : 'Copy' }}
                  </button>
                </div>
              </div>

              <!-- Explicit completion action (unambiguous vs collapsing the header) -->
              <div class="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  @click="toggleDone(step.id)"
                  class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  :class="
                    isDone(step.id)
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  "
                >
                  <Check class="w-3.5 h-3.5" />
                  {{
                    isDone(step.id)
                      ? 'Mark as not done'
                      : isLastStep(step.id)
                        ? 'Mark as done'
                        : 'Done — next step'
                  }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Export / Transform section -->
      <section>
        <h2
          class="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2"
        >
          <FileOutput class="w-4 h-4 text-purple-500" />
          Export / Transform
        </h2>

        <div
          v-if="!hasWorkspace"
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
        >
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Open a model to see export options.
          </p>
        </div>

        <div
          v-else-if="!templatesReady"
          class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-xl p-4"
        >
          <div class="flex items-start gap-3">
            <AlertTriangle class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p class="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                traNNsform not found
              </p>
              <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                The
                <code class="text-2xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded"
                  >traNNsform/</code
                >
                folder was not found in your workspace. Create a new workspace to set it up, or
                download it from
                <a
                  href="https://github.com/innV0/cogNNitive/tree/main/traNNsform"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline font-medium hover:text-amber-800 dark:hover:text-amber-200"
                >
                  the repository </a
                >.
              </p>
            </div>
          </div>
        </div>

        <div v-else class="space-y-3">
          <p class="text-xs text-slate-500 dark:text-slate-400">Tell OpenCode:</p>
          <div
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
          >
            <div
              class="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700"
            >
              <code
                class="block text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono"
                >Load the innv0-innfo skill — generate an HTML visualizer for {{ modelFilename }} following traNNsform/AGENT.md</code
              >
            </div>
            <div class="flex items-center justify-end gap-2 px-4 py-2 bg-white dark:bg-slate-900">
              <button
                @click="copyExportPrompt"
                class="inline-flex items-center gap-1.5 text-2xs font-medium px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
              >
                <Copy class="w-3 h-3" />
                Copy
              </button>
            </div>
          </div>
          <div
            class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-lg px-4 py-3 text-xs text-amber-700 dark:text-amber-400 leading-relaxed"
          >
            <strong>Important:</strong> The innv0-innfo skill knows to follow
            <code class="text-2xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded"
              >traNNsform/AGENT.md</code
            >
            for the exact output path (<code
              class="text-2xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded"
              >traNNsform/output/</code
            >) and naming conventions. If OpenCode saves the file elsewhere, tell it to read
            <code class="text-2xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded"
              >traNNsform/AGENT.md</code
            >
            for the correct location.
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  ExternalLink,
  ListOrdered,
  FileOutput,
  Copy,
  AlertTriangle,
  Check,
  ChevronDown,
  CheckCircle2,
  RotateCcw,
} from 'lucide-vue-next'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useModelStore } from '../../stores/modelStore'

const workspaceStore = useWorkspaceStore()
const modelStore = useModelStore()

const hasWorkspace = computed(() => workspaceStore.hasHandle)
/** Folder name of the open workspace. Browsers never expose the full path. */
const workspaceName = computed(() => workspaceStore.handle?.name ?? null)
const templatesReady = ref(false)

const CHAT_PROMPT = 'Load the innv0-innfo skill — I need to edit a model'

// ── AI agents (download links) ──────────────────────────────────────────────
const tools = [
  {
    name: 'OpenCode',
    initials: 'OC',
    description: 'Supported AI agent for cogNNitive. Open-source terminal-native coding agent.',
    url: 'https://opencode.ai/download',
    recommended: true,
  },
]

// ── Steps ───────────────────────────────────────────────────────────────────
interface Step {
  id: string
  title: string
  description: string
}

const steps: Step[] = [
  {
    id: 'agent',
    title: 'Install OpenCode',
    description:
      "cogNNitive works with <strong>OpenCode</strong> — download and install it below. OpenCode reads project skills natively and discovers them automatically. This is a one-time setup, so it stays checked next time.",
  },
  {
    id: 'workspace',
    title: 'Open the workspace folder in your AI agent',
    description:
      'Point your agent at the same folder you opened in cogNNitive — agents work directly on the file system, so sharing the folder is all they need.',
  },
  {
    id: 'mcp',
    title: 'Configure MCP tools for your agent',
    description:
      'OpenCode needs the innfo-mcp MCP server to validate models. When you say "Load the innv0-innfo skill and check that innfo-mcp is configured", OpenCode loads the skill which detects if the MCP server is set up and guides you through activation.',
  },
  {
    id: 'chat',
    title: 'Edit models via chat',
    description:
      "Once configured, tell OpenCode what you want. Start by pasting the prompt below — it loads the innv0-innfo skill so OpenCode knows how to work with iNNfo models. Then describe the changes you need: add concepts, change fields, restructure sections, and more:",
  },
  {
    id: 'sidebar',
    title: 'Use right sidebar prompts to go deeper',
    description:
      'When viewing a model in cogNNitive, the <strong>right sidebar</strong> shows <strong>suggested prompts</strong> for each concept. Copy them into OpenCode to explore a specific concept or element in more detail.',
  },
]

const STORAGE_KEY = 'cognnitive:ai-guide:completed-steps'

/** Loads completed step ids from localStorage. */
function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    // ignore malformed / unavailable storage
  }
  return new Set()
}

const completed = ref<Set<string>>(loadCompleted())
// Open the first pending step immediately (no post-mount flash).
const openStep = ref<string | null>(steps.find((s) => !completed.value.has(s.id))?.id ?? null)
const chatCopied = ref(false)

// Persist completion state whenever it changes.
watch(completed, (val) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...val]))
  } catch {
    // ignore unavailable storage
  }
})

const completedCount = computed(() => steps.filter((s) => completed.value.has(s.id)).length)
const allDone = computed(() => steps.every((s) => completed.value.has(s.id)))

/** Returns the id of the first step that isn't completed, or null if all done. */
function firstIncompleteId(): string | null {
  return steps.find((s) => !completed.value.has(s.id))?.id ?? null
}

function isDone(id: string): boolean {
  return completed.value.has(id)
}

function isExpanded(id: string): boolean {
  return openStep.value === id
}

function stepNumber(id: string): number {
  return steps.findIndex((s) => s.id === id) + 1
}

function isLastStep(id: string): boolean {
  return steps[steps.length - 1]?.id === id
}

/** Expands the clicked step, or collapses it if already open. */
function toggleStep(id: string): void {
  openStep.value = openStep.value === id ? null : id
}

/** Toggles a step's done state and advances the accordion accordingly. */
function toggleDone(id: string): void {
  const next = new Set(completed.value)
  if (next.has(id)) {
    next.delete(id)
    completed.value = next
    openStep.value = id // reopen to review
  } else {
    next.add(id)
    completed.value = next
    openStep.value = firstIncompleteId() // advance to the next pending step
  }
}

/** Convenience action for users who already have an agent installed. */
function markAgentDone(): void {
  if (!isDone('agent')) toggleDone('agent')
}

/** Clears all progress and reopens the first step. */
function resetSteps(): void {
  completed.value = new Set()
  openStep.value = steps[0].id
}

/** Returns the model filename for display. */
const modelFilename = computed(() => {
  const rootId = modelStore.rootIds[0]
  if (!rootId) return 'your model'
  const rootNode = modelStore.getNode(rootId)
  const path = rootNode?.source?.path
  return path?.split(/[/\\]/).pop() ?? 'your model'
})

/** Check if traNNsform/ exists in the workspace. */
async function checkTemplatesExist(): Promise<void> {
  const handle = workspaceStore.handle
  if (!handle) {
    templatesReady.value = false
    return
  }
  try {
    await handle.getDirectoryHandle('traNNsform')
    templatesReady.value = true
  } catch {
    templatesReady.value = false
  }
}

/** Copies arbitrary text to the clipboard with a legacy fallback. */
function copyText(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  })
}

/** Copies the kickoff chat prompt and shows brief feedback. */
function copyChatPrompt(): void {
  copyText(CHAT_PROMPT)
  chatCopied.value = true
  setTimeout(() => {
    chatCopied.value = false
  }, 2000)
}

/** Copies the export instruction to clipboard. */
function copyExportPrompt(): void {
  copyText(`Load the innv0-innfo skill — generate an HTML visualizer for ${modelFilename.value} following traNNsform/AGENT.md`)
}

onMounted(() => {
  checkTemplatesExist()
})
</script>
