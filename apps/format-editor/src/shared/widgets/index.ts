import type { Component } from 'vue'
import TextWidget from './TextWidget.vue'
import WeightWidget from './WeightWidget.vue'
import CategoryWidget from './CategoryWidget.vue'
import FieldString from './FieldString.vue'
import FieldNumber from './FieldNumber.vue'
import FieldAsset from './FieldAsset.vue'
import { UNIFIED_WIDGET_REGISTRY } from './registry'

export { default as FallbackWidget } from './FallbackWidget.vue'
export { TextWidget, WeightWidget, CategoryWidget, FieldString, FieldNumber, FieldAsset }
export { UNIFIED_WIDGET_REGISTRY }
export type { WidgetType } from './registry'

/**
 * Resolves a widget type to its ported Vue component, or `undefined` if the
 * type has no registered widget (caller should render FallbackWidget).
 *
 * Reads from the UNIFIED_WIDGET_REGISTRY which merges concept-type widgets
 * (text, weight, category) with field-type widgets (string, boolean, number,
 * select, reference) and asset widgets (image, file, video, audio).
 */
export function resolveWidgetComponent(widgetType: string): Component | undefined {
  return UNIFIED_WIDGET_REGISTRY[widgetType]
}
