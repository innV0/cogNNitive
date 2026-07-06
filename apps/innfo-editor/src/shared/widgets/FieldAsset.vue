<script setup lang="ts">
/**
 * Renders an asset field (image/file/video/audio).
 * Part of the unified widget registry (FR-003).
 * Uses v-model contract: modelValue / update:modelValue.
 *
 * widgetType determines rendering:
 * - 'image': thumbnail preview
 * - 'file': file icon + filename
 * - 'video': video player
 * - 'audio': audio player
 *
 * Shows a warning if the path appears stale (placeholder — UI can refine later).
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    widgetType?: string
    fieldDefinition?: {
      name: string
      type: string
      options?: string[]
      target_concepts?: string[]
      default?: unknown
    }
  }>(),
  { widgetType: 'file' },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const assetType = computed(() => props.fieldDefinition?.type ?? props.widgetType)

const assetPath = computed(() => props.modelValue ?? '')

const fileName = computed(() => {
  const p = assetPath.value
  return p.split('/').pop() ?? p.split('\\').pop() ?? p
})

const isImage = computed(() => assetType.value === 'image')
const isVideo = computed(() => assetType.value === 'video')
const isAudio = computed(() => assetType.value === 'audio')
const isFile = computed(() => assetType.value === 'file')

/** For image thumbnails, display the path as image source. */
const thumbnailSrc = computed(() => {
  if (!assetPath.value) return ''
  // In a real app this would be resolved to an absolute/relative URL.
  // For now, pass the path as-is for the parent to resolve.
  return assetPath.value
})

function onInput(e: Event): void {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="field-asset">
    <!-- Image thumbnail -->
    <div v-if="isImage && assetPath" class="field-asset__preview">
      <img
        :src="thumbnailSrc"
        :alt="fileName"
        class="field-asset__image"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <span v-if="!assetPath" class="field-asset__placeholder">No image selected</span>
    </div>

    <!-- Video player -->
    <div v-else-if="isVideo && assetPath" class="field-asset__preview">
      <video :src="assetPath" controls class="field-asset__video" preload="metadata">
        Your browser does not support the video element.
      </video>
    </div>

    <!-- Audio player -->
    <div v-else-if="isAudio && assetPath" class="field-asset__preview">
      <audio :src="assetPath" controls class="field-asset__audio" preload="metadata">
        Your browser does not support the audio element.
      </audio>
    </div>

    <!-- File icon + name (default fallback for file type) -->
    <div v-else-if="isFile && assetPath" class="field-asset__file">
      <span class="field-asset__file-icon">📄</span>
      <span class="field-asset__file-name">{{ fileName }}</span>
    </div>

    <!-- Editable path input -->
    <div class="field-asset__input-row">
      <input
        type="text"
        class="field-asset__input"
        :value="modelValue"
        :placeholder="`Enter ${assetType} path...`"
        @input="onInput"
      />
      <span class="field-asset__type-badge">{{ assetType }}</span>
    </div>

    <!-- Missing file warning (placeholder) -->
    <div v-if="assetPath" class="field-asset__warning">
      <span class="field-asset__warning-icon">⚠️</span>
      Asset path validation is not yet implemented. Verify the file exists at:
      <code>{{ assetPath }}</code>
    </div>
  </div>
</template>

<style scoped>
.field-asset {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-asset__preview {
  max-width: 100%;
  border: 1px solid var(--border-soft, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
  background: #f8fafc;
}

.field-asset__image {
  display: block;
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.field-asset__video {
  display: block;
  max-width: 100%;
  max-height: 240px;
}

.field-asset__audio {
  display: block;
  width: 100%;
}

.field-asset__file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-soft, #e2e8f0);
  border-radius: 6px;
  background: #f8fafc;
}

.field-asset__file-icon {
  font-size: 1.25rem;
}

.field-asset__file-name {
  font-size: 13px;
  color: #334155;
  font-family: monospace;
}

.field-asset__input-row {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.field-asset__input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  font-size: 13px;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 6px;
  background: #fff;
  font-family: monospace;
  box-sizing: border-box;
}

.field-asset__input:focus {
  outline: none;
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}

.field-asset__type-badge {
  font-size: 11px;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: #e2e8f0;
  color: #475569;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.field-asset__placeholder {
  display: block;
  padding: 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.field-asset__warning {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 12px;
  color: #d97706;
  padding: 0.3rem 0.5rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 4px;
}

.field-asset__warning code {
  font-size: 11px;
  background: #fef3c7;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}
</style>
