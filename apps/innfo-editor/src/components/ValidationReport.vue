<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ValidationReport, ValidationCheck } from '../shared/validation-types'

const props = defineProps<{
  report: ValidationReport
}>()

const categories = [
  { key: 'frontmatter', label: 'Frontmatter' },
  { key: 'body', label: 'Body Syntax' },
  { key: 'convention', label: 'Conventions' },
] as const

const collapsed = ref<Record<string, boolean>>({
  frontmatter: false,
  body: false,
  convention: false,
})

function toggle(cat: string) {
  collapsed.value[cat] = !collapsed.value[cat]
}

const checksByCategory = computed(() => {
  const grouped: Record<string, ValidationCheck[]> = {}
  for (const check of props.report.checks) {
    if (!grouped[check.category]) grouped[check.category] = []
    grouped[check.category].push(check)
  }
  return grouped
})

const passedCountByCategory = computed(() => {
  const counts: Record<string, number> = {}
  for (const check of props.report.checks) {
    if (check.passed) {
      counts[check.category] = (counts[check.category] || 0) + 1
    }
  }
  return counts
})

const categoriesWithIssues = computed(() => {
  const withIssues = new Set<string>()
  for (const check of props.report.checks) {
    if (!check.passed) withIssues.add(check.category)
  }
  return withIssues
})

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
    <div class="summary-bar" :class="{
      'summary-bar--all-pass': report.summary.errors === 0 && report.summary.warnings === 0,
      'summary-bar--has-warn': report.summary.errors === 0 && report.summary.warnings > 0,
      'summary-bar--has-error': report.summary.errors > 0,
    }">
      <span class="summary-bar__text">
        Validation: <strong>{{ report.summary.passed }}/{{ report.summary.total }}</strong> passed
        <template v-if="report.summary.errors">, <strong class="summary-bar__errors">{{ report.summary.errors }} error{{ report.summary.errors !== 1 ? 's' : '' }}</strong></template>
        <template v-if="report.summary.warnings">, <strong class="summary-bar__warnings">{{ report.summary.warnings }} warning{{ report.summary.warnings !== 1 ? 's' : '' }}</strong></template>
      </span>
      <span v-if="report.summary.errors === 0 && report.summary.warnings === 0" class="summary-bar__ok">All good</span>
    </div>

    <div v-for="cat in categories" :key="cat.key" class="category">
      <button class="category__header" :class="{ 'category__header--issues': categoriesWithIssues.has(cat.key) }" @click="toggle(cat.key)">
        <span class="category__arrow" :class="{ 'category__arrow--open': !collapsed[cat.key] }">&#9654;</span>
        <span class="category__label">{{ cat.label }}</span>
        <span class="category__count">
          {{ passedCountByCategory[cat.key] ?? 0 }}/{{ checksByCategory[cat.key]?.length ?? 0 }}
        </span>
      </button>

      <div v-if="!collapsed[cat.key]" class="category__body">
        <div v-for="check in checksByCategory[cat.key] || []" :key="check.id" class="check" :class="statusClass(check)">
          <span class="check__icon">{{ statusIcon(check) }}</span>
          <div class="check__content">
            <span class="check__label">{{ check.label }}</span>
            <span v-if="!check.passed && check.message" class="check__message">{{ check.message }}</span>
          </div>
        </div>
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
  background: #E8F5E9;
  color: #2E7D32;
}

.summary-bar--has-warn {
  background: #FFF8E1;
  color: #8D6E00;
}

.summary-bar--has-error {
  background: #FFEBEE;
  color: #C62828;
}

.summary-bar__errors {
  color: #C62828;
}

.summary-bar__warnings {
  color: #8D6E00;
}

.summary-bar__ok {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  background: #FFFDE7;
}

.check--error {
  background: #FFF5F5;
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

.check__message {
  display: block;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-muted);
  margin-top: 1px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
