<script setup lang="ts">
/**
 * Renders any field whose resolved widget type has not been ported yet
 * (R15): shows the raw value plus a type badge instead of crashing or
 * showing a blank field.
 */
defineProps<{
  modelValue: unknown
  widgetType: string
}>()

function displayValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>

<template>
  <div class="fallback-widget">
    <span class="fallback-widget__value">{{ displayValue(modelValue) }}</span>
    <span class="fallback-widget__badge">{{ widgetType }}</span>
  </div>
</template>
