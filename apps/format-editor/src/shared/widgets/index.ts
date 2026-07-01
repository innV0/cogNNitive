import type { Component } from 'vue'
import TextWidget from './TextWidget.vue'
import WeightWidget from './WeightWidget.vue'
import CategoryWidget from './CategoryWidget.vue'

export { default as FallbackWidget } from './FallbackWidget.vue'
export { TextWidget, WeightWidget, CategoryWidget }

/**
 * Widget types actually ported this slice, scoped to what the `models/*`
 * fixture metamodels exercise (task 6.1 inventory: concept types "text",
 * "category", "weight" — see design.md "Widget port scope" decision).
 * Any type not in this registry has no ported widget and the caller must
 * fall back to `FallbackWidget` (R15).
 */
const registry: Record<string, Component> = {
  text: TextWidget,
  weight: WeightWidget,
  category: CategoryWidget,
}

/** Resolves a widget type to its ported Vue component, or `undefined` if not yet ported (R15). */
export function resolveWidgetComponent(widgetType: string): Component | undefined {
  return registry[widgetType]
}
