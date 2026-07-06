<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ValidationReport, ValidationCheck } from '../shared/validation-types'
import { useModelStore } from '../stores/modelStore'

const props = defineProps<{
  report: ValidationReport
}>()

const modelStore = useModelStore()

const copyFeedback = ref('')
let copyTimer: ReturnType<typeof setTimeout> | undefined

function formatLog(): string {
  const rootId = modelStore.rootIds[0]
  const root = rootId ? modelStore.nodes[rootId] : undefined
  const path = root?.source?.path ?? ''
  const fileName = path.split('/').pop() || path || '(unsaved)'
  const modelName = root?.name ?? '(unknown)'
  const lines: string[] = []
  const now = new Date()
  lines.push('VALIDATION REPORT')
  lines.push('='.repeat(60))
  lines.push(`Date:    ${now.toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push(`File:    ${fileName}`)
  lines.push(`Model:   ${modelName}`)
  lines.push('')
  lines.push(`Summary: ${totalPassed.value}/${totalChecks.value} passed — ${totalErrors.value} error${totalErrors.value !== 1 ? 's' : ''}, ${totalWarnings.value} warning${totalWarnings.value !== 1 ? 's' : ''}`)
  lines.push('')

  const grouped = checksByCategory.value
  for (const cat of categories) {
    const checks = grouped[cat.key]
    if (!checks || checks.length === 0) continue
    lines.push(`── ${cat.label} ──`)
    for (const check of checks) {
      const status = check.passed ? 'PASS' : check.severity === 'error' ? 'ERROR' : 'WARN'
      const icon = check.passed ? '[✓]' : check.severity === 'error' ? '[✗]' : '[!]'
      lines.push(`  ${icon} [${status}] ${check.label}`)
      if (check.description) lines.push(`       ${check.description}`)
      if (!check.passed && check.message) lines.push(`       > ${check.message}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function copyReport(): void {
  copyFeedback.value = 'Copied!'
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copyFeedback.value = '' }, 2000)

  const text = formatLog()
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  })
}

const categories = [
  { key: 'parser', label: 'Model Load & Parser' },
  { key: 'frontmatter', label: 'Frontmatter' },
  { key: 'body', label: 'Body Syntax' },
  { key: 'convention', label: 'Conventions' },
] as const

const collapsed = ref<Record<string, boolean>>({
  parser: false,
  frontmatter: false,
  body: false,
  convention: false,
})

function toggle(cat: string) {
  collapsed.value[cat] = !collapsed.value[cat]
}

const allChecks = computed(() => {
  const list = [...props.report.checks]

  // Add virtual parser checks
  if (modelStore.parseIssues.length === 0) {
    list.push({
      id: 'parser-load-ok',
      label: 'Model Structure & Load',
      description: 'No duplicates or structural parsing errors detected during model file load.',
      category: 'parser' as 'frontmatter',
      severity: 'info',
      passed: true,
    })
  } else {
    modelStore.parseIssues.forEach((issue, idx) => {
      list.push({
        id: `parser-issue-${idx}`,
        label: `Structure warning in ${issue.path.split('/').pop() || issue.path}`,
        description: issue.message,
        category: 'parser' as 'frontmatter',
        severity: 'warning',
        passed: false,
        message: issue.message,
      })
    })
  }

  return list
})

const checksByCategory = computed(() => {
  const grouped: Record<string, ValidationCheck[]> = {}
  for (const check of allChecks.value) {
    if (!grouped[check.category]) grouped[check.category] = []
    grouped[check.category].push(check)
  }
  return grouped
})

const passedCountByCategory = computed(() => {
  const counts: Record<string, number> = {}
  for (const check of allChecks.value) {
    if (check.passed) {
      counts[check.category] = (counts[check.category] || 0) + 1
    }
  }
  return counts
})

const categoriesWithIssues = computed(() => {
  const withIssues = new Set<string>()
  for (const check of allChecks.value) {
    if (!check.passed) withIssues.add(check.category)
  }
  return withIssues
})

const totalChecks = computed(() => allChecks.value.length)
const totalPassed = computed(() => allChecks.value.filter((c) => c.passed).length)
const totalErrors = computed(() => allChecks.value.filter((c) => !c.passed && c.severity === 'error').length)
const totalWarnings = computed(() => allChecks.value.filter((c) => !c.passed && c.severity === 'warning').length)

function statusIcon(check: ValidationCheck): string {
  if (check.passed) return '\u2705'
  if (check.severity === 'error') return '\u274C'
  return '\u26A0\uFE0F'
}

function statusClass(check: ValidationCheck): string {
  if (check.passed) return 'check--pass'
  if (check.severity === 'error') return 'check--error'
  return 'check--warn'
}
</script>

<template>
  <div class="validation-report">
    <div
      class="summary-bar"
      :class="{
        'summary-bar--all-pass': totalErrors === 0 && totalWarnings === 0,
        'summary-bar--has-warn': totalErrors === 0 && totalWarnings > 0,
        'summary-bar--has-error': totalErrors > 0,
      }"
    >
      <span class="summary-bar__text">
        Validation: <strong>{{ totalPassed }}/{{ totalChecks }}</strong> passed
        <template v-if="totalErrors"
          >,
          <strong class="summary-bar__errors"
            >{{ totalErrors }} error{{ totalErrors !== 1 ? 's' : '' }}</strong
          ></template
        >
        <template v-if="totalWarnings"
          >,
          <strong class="summary-bar__warnings"
            >{{ totalWarnings }} warning{{
              totalWarnings !== 1 ? 's' : ''
            }}</strong
          ></template
        >
      </span>
      <span class="summary-bar__actions">
        <span
          v-if="totalErrors === 0 && totalWarnings === 0"
          class="summary-bar__ok"
          >All good</span
        >
        <button class="copy-btn" @click="copyReport" title="Copy report as log">
          <span v-if="copyFeedback" class="copy-btn__feedback">{{ copyFeedback }}</span>
          <span v-else>[Copy log]</span>
        </button>
      </span>
    </div>

    <div v-for="cat in categories" :key="cat.key" class="category">
      <button
        class="category__header"
        :class="{ 'category__header--issues': categoriesWithIssues.has(cat.key) }"
        @click="toggle(cat.key)"
      >
        <span class="category__arrow" :class="{ 'category__arrow--open': !collapsed[cat.key] }"
          >&#9654;</span
        >
        <span class="category__label">{{ cat.label }}</span>
        <span class="category__count">
          {{ passedCountByCategory[cat.key] ?? 0 }}/{{ checksByCategory[cat.key]?.length ?? 0 }}
        </span>
      </button>

      <div v-if="!collapsed[cat.key]" class="category__body">
        <div
          v-for="check in checksByCategory[cat.key] || []"
          :key="check.id"
          class="check"
          :class="statusClass(check)"
        >
          <span class="check__icon">{{ statusIcon(check) }}</span>
          <div class="check__content">
            <span class="check__label">{{ check.label }}</span>
            <span v-if="check.description" class="check__desc">{{ check.description }}</span>
            <span v-if="!check.passed && check.message" class="check__message">{{
              check.message
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Educational & Guide Panel ── -->
    <div class="educational-panel">
      <h4 class="educational-panel__title">How to understand iNNfo Models & Validation</h4>
      <p class="educational-panel__text">
        iNNfo models are defined using Markdown files with a YAML frontmatter. This validation report checks if your model conforms to the iNNfo format specifications:
      </p>
      <ul class="educational-panel__list">
        <li>
          <strong>Model Load & Parser:</strong> Ensures files are read correctly and elements have unique names. Duplicated elements in different files are flagged as warnings to prevent collision.
        </li>
        <li>
          <strong>Frontmatter:</strong> Checks basic metadata like <code>level</code> (must be 3), <code>version</code>, and <code>parent_spec</code> links.
        </li>
        <li>
          <strong>Body Syntax:</strong> Validates elements and relationships against the declared template.
        </li>
        <li>
          <strong>Conventions:</strong> Checks naming conventions and clean file structure.
        </li>
      </ul>
      <div class="educational-panel__tip">
        <strong>Tip:</strong> If a warning is displayed, your model will still load, but you should resolve it to avoid unexpected behaviors or naming collisions. If an error is shown, you must fix it, as it indicates a critical format violation.
      </div>
    </div>
  </div>
</template>

<style scoped>
.validation-report {
  margin-top: var(--space-md);
  border-top: 1px solid var(--border-soft);
  padding-top: var(--space-md);
}

/* ── Summary bar ── */

.summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius);
  margin-bottom: var(--space-md);
  font-size: 13px;
}

.summary-bar--all-pass {
  background: #e8f5e9;
  color: #2e7d32;
}

.summary-bar--has-warn {
  background: #fff8e1;
  color: #8d6e00;
}

.summary-bar--has-error {
  background: #ffebee;
  color: #c62828;
}

.summary-bar__errors {
  color: #c62828;
}

.summary-bar__warnings {
  color: #8d6e00;
}

.summary-bar__ok {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-bar__actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.copy-btn {
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 4px;
  padding: 2px 8px;
  font-family: var(--mono);
  font-size: 11px;
  cursor: pointer;
  opacity: 0.65;
  transition: opacity 0.15s;
  color: inherit;
}

.copy-btn:hover {
  opacity: 1;
}

.copy-btn__feedback {
  font-weight: 600;
}

/* ── Category ── */

.category {
  margin-bottom: var(--space-xs);
}

.category__header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) var(--space-sm);
  border: none;
  background: var(--canvas-inert);
  border-radius: 6px;
  cursor: pointer;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-primary);
  text-align: left;
  transition: background 0.15s;
}

.category__header:hover {
  background: var(--border-soft);
}

.category__header--issues {
  color: var(--ink-primary);
}

.category__arrow {
  font-size: 10px;
  color: var(--ink-muted);
  transition: transform 0.15s;
  line-height: 1;
}

.category__arrow--open {
  transform: rotate(90deg);
}

.category__label {
  flex: 1;
}

.category__count {
  font-weight: 400;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-muted);
}

.category__body {
  padding: var(--space-xs) 0 var(--space-xs) 20px;
}

/* ── Individual check ── */

.check {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
}

.check--warn {
  background: #fffde7;
}

.check--error {
  background: #fff5f5;
}

.check__icon {
  flex-shrink: 0;
  font-size: 13px;
  line-height: 1.5;
}

.check__content {
  flex: 1;
  min-width: 0;
}

.check__label {
  font-weight: 500;
}

.check__desc {
  display: block;
  font-size: 11px;
  color: var(--ink-muted);
  margin-top: 1px;
}

.check__message {
  display: block;
  font-family: var(--mono);
  font-size: 11px;
  color: #c62828;
  margin-top: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  background: rgba(198, 40, 40, 0.04);
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 2px solid #c62828;
}

.educational-panel {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: var(--canvas-inert);
  border-radius: 8px;
  border: 1px solid var(--border-soft);
  font-size: 13px;
  line-height: 1.6;
}

.educational-panel__title {
  margin: 0 0 var(--space-xs) 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-primary);
}

.educational-panel__text {
  margin: 0 0 var(--space-sm) 0;
  color: var(--ink-muted);
}

.educational-panel__list {
  margin: 0 0 var(--space-md) var(--space-md);
  padding: 0;
  list-style-type: disc;
  color: var(--ink-primary);
}

.educational-panel__list li {
  margin-bottom: var(--space-xs);
}

.educational-panel__tip {
  background: #e8f5e9;
  border-left: 4px solid #2e7d32;
  color: #2e7d32;
  padding: var(--space-sm);
  border-radius: 0 4px 4px 0;
  font-size: 12px;
}
</style>
