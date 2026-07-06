<script setup lang="ts">
/**
 * Renders rendered Markdown in read mode via `marked`,
 * and a textarea with a simple formatting toolbar in edit mode.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'markdown' in the unified widget registry.
 */
import { ref } from 'vue'
import { marked } from 'marked'

withDefaults(
  defineProps<{
    modelValue: string
    fieldDefinition?: {
      name: string
      type: string
      options?: string[]
      target_concepts?: string[]
      default?: unknown
    }
    readonly?: boolean
  }>(),
  { readonly: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

function renderMarkdown(md: string): string {
  if (!md) return ''
  try {
    return marked.parse(md, { async: false }) as string
  } catch {
    return md
  }
}

function insertFormat(before: string, after: string): void {
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const text = ta.value
  const selected = text.substring(start, end)
  const newText = text.substring(0, start) + before + selected + after + text.substring(end)
  emit('update:modelValue', newText)
  // Restore focus and selection after next tick
  requestAnimationFrame(() => {
    ta.focus()
    ta.selectionStart = start + before.length
    ta.selectionEnd = start + before.length + selected.length
  })
}

function insertBullet(): void {
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  const text = ta.value
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const newText = text.substring(0, lineStart) + '- ' + text.substring(lineStart)
  emit('update:modelValue', newText)
}

function insertHeading(): void {
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  const text = ta.value
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const newText = text.substring(0, lineStart) + '## ' + text.substring(lineStart)
  emit('update:modelValue', newText)
}
</script>

<template>
  <div class="widget-markdown">
    <div v-if="!readonly" class="widget-markdown-edit">
      <div class="widget-markdown-toolbar">
        <button
          class="widget-markdown-tb-btn"
          @click="insertFormat('**', '**')"
          title="Bold"
          type="button"
        >
          <strong>B</strong>
        </button>
        <button
          class="widget-markdown-tb-btn"
          @click="insertFormat('*', '*')"
          title="Italic"
          type="button"
        >
          <em>I</em>
        </button>
        <button
          class="widget-markdown-tb-btn"
          @click="insertBullet()"
          title="Bullet list"
          type="button"
        >
          •
        </button>
        <button
          class="widget-markdown-tb-btn"
          @click="insertHeading()"
          title="Heading"
          type="button"
        >
          H
        </button>
      </div>
      <textarea
        ref="textareaRef"
        class="widget-markdown-textarea"
        :value="modelValue"
        @input="onInput"
        placeholder="Enter Markdown..."
      ></textarea>
    </div>
    <div
      v-else-if="modelValue"
      class="widget-markdown-rendered"
      v-html="renderMarkdown(modelValue)"
    />
    <span v-else class="widget-markdown-empty">—</span>
  </div>
</template>

<style scoped>
.widget-markdown {
  font-family: system-ui, sans-serif;
}
.widget-markdown-edit {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.widget-markdown-toolbar {
  display: flex;
  gap: 2px;
  padding: 0.25rem;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  background: #f8fafc;
}
.widget-markdown-tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 26px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: #475569;
  transition: all 0.1s ease;
}
.widget-markdown-tb-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}
.widget-markdown-textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.5rem;
  font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid #e2e8f0;
  border-radius: 0 0 6px 6px;
  background: #fafbfc;
  resize: vertical;
  outline: none;
  color: #1e293b;
}
.widget-markdown-textarea:focus {
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
  background: #fff;
}
.widget-markdown-textarea::placeholder {
  color: #94a3b8;
}
.widget-markdown-rendered {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  line-height: 1.6;
  color: #1e293b;
}
.widget-markdown-rendered :deep(p) {
  margin: 0 0 0.5rem 0;
}
.widget-markdown-rendered :deep(p:last-child) {
  margin-bottom: 0;
}
.widget-markdown-rendered :deep(strong) {
  font-weight: 600;
}
.widget-markdown-rendered :deep(em) {
  font-style: italic;
}
.widget-markdown-rendered :deep(code) {
  font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  background: #f1f5f9;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}
.widget-markdown-rendered :deep(pre) {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 0.5rem;
  overflow-x: auto;
}
.widget-markdown-rendered :deep(pre code) {
  background: none;
  padding: 0;
}
.widget-markdown-rendered :deep(ul),
.widget-markdown-rendered :deep(ol) {
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.widget-markdown-rendered :deep(h1),
.widget-markdown-rendered :deep(h2),
.widget-markdown-rendered :deep(h3) {
  margin: 0.5rem 0 0.25rem 0;
  font-weight: 600;
}
.widget-markdown-empty {
  font-size: 13px;
  color: #94a3b8;
}
</style>
