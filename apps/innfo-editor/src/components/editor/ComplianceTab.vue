<template>
  <div class="compliance-tab">
    <!-- Summary bar -->
    <div
      class="flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-3"
      :class="summaryClass"
    >
      <span>
        Validation for <strong>{{ conceptType }}</strong
        >: <strong>{{ passedCount }}/{{ totalCount }}</strong> passed
        <template v-if="errorCount > 0">
          ,
          <strong class="text-red-600 dark:text-red-400"
            >{{ errorCount }} error{{ errorCount !== 1 ? 's' : '' }}</strong
          >
        </template>
        <template v-if="warningCount > 0">
          ,
          <strong class="text-amber-600 dark:text-amber-400"
            >{{ warningCount }} warning{{ warningCount !== 1 ? 's' : '' }}</strong
          >
        </template>
      </span>
      <span
        v-if="passedCount === totalCount && totalCount > 0"
        class="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"
      >
        All good
      </span>
    </div>

    <!-- Filtered checks list -->
    <div v-if="scopedChecks.length > 0" class="space-y-1">
      <div
        v-for="check in scopedChecks"
        :key="check.id"
        class="flex items-start gap-2 px-3 py-2 rounded-md text-sm"
        :class="checkClass(check)"
      >
        <!-- Status icon -->
        <span class="shrink-0 mt-0.5">
          <template v-if="check.passed">
            <svg
              class="w-4 h-4 text-emerald-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </template>
          <template v-else-if="check.severity === 'error'">
            <svg
              class="w-4 h-4 text-red-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </template>
          <template v-else>
            <svg
              class="w-4 h-4 text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </template>
        </span>

        <!-- Check content -->
        <div class="flex-1 min-w-0">
          <span
            class="font-medium"
            :class="
              check.passed
                ? 'text-slate-600 dark:text-slate-300'
                : 'text-slate-800 dark:text-slate-200'
            "
          >
            {{ check.label }}
          </span>
          <p
            v-if="!check.passed && check.message"
            class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono"
          >
            {{ check.message }}
          </p>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <p
      v-if="scopedChecks.length === 0"
      class="text-xs text-slate-400 dark:text-slate-500 italic px-3 py-2"
    >
      No validation checks for this concept type.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ValidationReport, ValidationCheck } from '../../shared/validation-types'

const props = defineProps<{
  report: ValidationReport
  conceptType: string
}>()

/**
 * Filter checks to those relevant for the concept type.
 *
 * Inclusion rules:
 * 1. Frontmatter/structural checks apply to all concept types.
 * 2. Checks whose `id`, `label`, or `message` textually reference the
 *    concept type apply to that type.
 * 3. All other checks are excluded — they belong to other concepts.
 */
const scopedChecks = computed<ValidationCheck[]>(() => {
  const concept = props.conceptType.toLowerCase()

  return props.report.checks.filter((check) => {
    // Frontmatter checks apply to all concept types
    if (check.category === 'frontmatter') return true

    // Include checks that reference this concept type by text
    const checkText = [check.id, check.label, check.message].filter(Boolean).join(' ').toLowerCase()
    if (checkText.includes(concept)) return true

    return false
  })
})

const passedCount = computed(() => scopedChecks.value.filter((c) => c.passed).length)
const totalCount = computed(() => scopedChecks.value.length)
const errorCount = computed(
  () => scopedChecks.value.filter((c) => !c.passed && c.severity === 'error').length,
)
const warningCount = computed(
  () => scopedChecks.value.filter((c) => !c.passed && c.severity === 'warning').length,
)

const summaryClass = computed(() => {
  if (errorCount.value > 0)
    return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
  if (warningCount.value > 0)
    return 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
  if (totalCount.value > 0)
    return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
  return 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
})

function checkClass(check: ValidationCheck): string {
  if (check.passed) return ''
  if (check.severity === 'error') return 'bg-red-50/50 dark:bg-red-900/10'
  return 'bg-amber-50/50 dark:bg-amber-900/10'
}
</script>
