<script setup lang="ts">
/** Ported widget for the fixture-exercised concept type "text" (R15). */
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <input type="text" class="text-widget" :value="modelValue" @input="onInput" />
</template>
