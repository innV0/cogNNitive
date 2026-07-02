import type { Component } from 'vue'
import TextWidget from './TextWidget.vue'
import WeightWidget from './WeightWidget.vue'
import CategoryWidget from './CategoryWidget.vue'
import FieldString from './FieldString.vue'
import FieldBoolean from './FieldBoolean.vue'
import FieldNumber from './FieldNumber.vue'
import FieldSelect from './FieldSelect.vue'
import FieldReference from './FieldReference.vue'
import FieldAsset from './FieldAsset.vue'

/**
 * All supported widget type identifiers.
 * Merges concept-type keys (text, weight, category) with field-type keys
 * (string, boolean, number, select, reference) and asset types
 * (image, file, video, audio).
 */
export type WidgetType =
  | 'text'
  | 'weight'
  | 'category'
  | 'string'
  | 'boolean'
  | 'number'
  | 'select'
  | 'reference'
  | 'image'
  | 'file'
  | 'video'
  | 'audio'

/**
 * UNIFIED_WIDGET_REGISTRY merges concept-type widgets (from format-editor's
 * original registry) with field-type widgets (ported from file-format).
 *
 * Dispatch key resolution:
 *   - Field-level:  field.type from the concept's fields[] array
 *   - Concept-level: concept.type from the concept declaration
 *
 * Any type not present in this registry will render FallbackWidget
 * (read-only display of raw value + type badge).
 */
export const UNIFIED_WIDGET_REGISTRY: Record<string, Component> = {
  // concept-type widgets (from format-editor)
  text: TextWidget,
  weight: WeightWidget,
  category: CategoryWidget,
  // field-type widgets (ported from file-format, v-model contract)
  string: FieldString,
  boolean: FieldBoolean,
  number: FieldNumber,
  select: FieldSelect,
  reference: FieldReference,
  // asset field-type widgets (FR-003)
  image: FieldAsset,
  file: FieldAsset,
  video: FieldAsset,
  audio: FieldAsset,
}
