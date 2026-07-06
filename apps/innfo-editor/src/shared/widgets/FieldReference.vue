<script setup lang="ts">
/**
 * Renders a reference field as an autocomplete input that filters
 * suggestions from modelStore.nodes by target_concepts.
 * Part of the unified widget registry (rebuild-format-editor-ui Phase 4).
 * Uses v-model contract: modelValue / update:modelValue.
 * No label — rendered by parent (WidgetField or BlockSheet).
 * Store deps: useModelStore (Pinia singleton — no prop drilling needed).
 */
import { ref, computed } from 'vue'
import { useModelStore } from '../../stores/modelStore'

const props = defineProps<{
  modelValue: string
  fieldDefinition?: { target_concepts?: string[] }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const modelStore = useModelStore()
const showDropdown = ref(false)
const query = ref(props.modelValue || '')

const placeholderText = computed(() => {
  const targets = props.fieldDefinition?.target_concepts || []
  if (targets.length === 0) return 'Search...'
  return targets.join(', ')
})

const filteredSuggestions = computed(() => {
  const targets = props.fieldDefinition?.target_concepts || []
  const lowerQuery = query.value.toLowerCase()
  const matches: string[] = []
  for (const node of Object.values(modelStore.nodes)) {
    if (targets.length === 0 || targets.includes(node.type)) {
      if (!lowerQuery || node.name.toLowerCase().includes(lowerQuery)) {
        matches.push(node.name)
      }
    }
  }
  return matches
})

function onInput(event: Event): void {
  query.value = (event.target as HTMLInputElement).value
  showDropdown.value = true
  if (!query.value) {
    emit('update:modelValue', '')
  }
}

function selectSuggestion(name: string): void {
  query.value = name
  showDropdown.value = false
  emit('update:modelValue', name)
}

function onBlur(): void {
  setTimeout(() => {
    showDropdown.value = false
  }, 100)
}
</script>

<template>
  <div class="field-reference-container">
    <input
      type="text"
      class="field-reference-input"
      :value="query"
      :placeholder="placeholderText"
      @input="onInput"
      @focus="showDropdown = true"
      @blur="onBlur"
    />
    <ul v-if="showDropdown && filteredSuggestions.length > 0" class="field-reference-dropdown">
      <li
        v-for="suggestion in filteredSuggestions"
        :key="suggestion"
        class="field-reference-option"
        @mousedown.prevent="selectSuggestion(suggestion)"
      >
        {{ suggestion }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.field-reference-container {
  position: relative;
}
.field-reference-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 13px;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 6px;
  background: #fff;
  font-family: system-ui, sans-serif;
  box-sizing: border-box;
}
.field-reference-input:focus {
  outline: none;
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}
.field-reference-dropdown {
  position: absolute;
  z-index: 50;
  margin-top: 0.25rem;
  width: 100%;
  max-height: 10rem;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  font-size: 0.75rem;
  list-style: none;
  padding: 0;
}
.field-reference-option {
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  color: #334155;
}
.field-reference-option:hover {
  background-color: rgba(77, 14, 78, 0.05);
}
</style>
