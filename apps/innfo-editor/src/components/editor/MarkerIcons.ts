import { h } from 'vue';
import type { Component } from 'vue';

// Solid Completion Icon: Filled circle with a white checkmark
export const SolidCompletionIcon = (props: any, { attrs }: any) => {
  return h('svg', {
    ...attrs,
    viewBox: '0 0 24 24',
    fill: 'none',
    class: attrs.class
  }, [
    h('circle', { cx: '12', cy: '12', r: '10', fill: 'currentColor' }),
    h('path', {
      d: 'M8.5 12.5l2.5 2.5 4.5-4.5',
      stroke: 'white',
      'stroke-width': '2.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      fill: 'none'
    })
  ]);
};

// Solid Certainty Icon: Filled circle with a white question mark
export const SolidCertaintyIcon = (props: any, { attrs }: any) => {
  return h('svg', {
    ...attrs,
    viewBox: '0 0 24 24',
    fill: 'none',
    class: attrs.class
  }, [
    h('circle', { cx: '12', cy: '12', r: '10', fill: 'currentColor' }),
    h('path', {
      d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3',
      stroke: 'white',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      fill: 'none'
    }),
    h('circle', { cx: '12', cy: '17', r: '1.25', fill: 'white' })
  ]);
};

// Solid Priority Icon: Filled Flag
export const SolidPriorityIcon = (props: any, { attrs }: any) => {
  return h('svg', {
    ...attrs,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: attrs.class
  }, [
    h('path', { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' }),
    h('line', { x1: '4', y1: '22', x2: '4', y2: '15' })
  ]);
};

// Solid Rating Icon: Filled Star
export const SolidRatingIcon = (props: any, { attrs }: any) => {
  return h('svg', {
    ...attrs,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: attrs.class
  }, [
    h('polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' })
  ]);
};

// Solid Weight Icon: Filled Weight
export const SolidWeightIcon = (props: any, { attrs }: any) => {
  return h('svg', {
    ...attrs,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: attrs.class
  }, [
    h('circle', { cx: '12', cy: '5', r: '3' }),
    h('path', { d: 'M4.5 12h15' }),
    h('path', { d: 'M4.5 12a3 3 0 0 0-3 3v4a2 2 0 0 0 2 2h17a2 2 0 0 0 2-2v-4a3 3 0 0 0-3-3' })
  ]);
};

/** Resolve the glyph component for a marker by its canonical name. */
export const getMarkerIcon = (markerName: string): Component => {
  switch (markerName) {
    case 'completion':
      return SolidCompletionIcon;
    case 'certainty':
      return SolidCertaintyIcon;
    case 'priority':
      return SolidPriorityIcon;
    case 'rating':
      return SolidRatingIcon;
    case 'weight':
      return SolidWeightIcon;
    default:
      return SolidCertaintyIcon;
  }
};

/** Base color (no opacity) for a marker's glyph by name. */
const MARKER_COLORS: Record<string, string> = {
  completion: 'text-emerald-600 dark:text-emerald-400',
  certainty: 'text-blue-600 dark:text-blue-400',
  priority: 'text-rose-600 dark:text-rose-400',
  rating: 'text-amber-500 dark:text-amber-400',
  weight: 'text-indigo-500 dark:text-indigo-400'
};

/**
 * Resolve the full class string for a marker glyph given its 0-3 score.
 * Higher score → higher opacity; score 0 renders as a faint placeholder.
 */
export const getMarkerClasses = (markerName: string, score: number): string => {
  const base = 'transition-all duration-200 ease-in-out inline-flex items-center justify-center cursor-pointer shrink-0 overflow-hidden w-3.5 h-3.5';

  if (score <= 0) {
    return `${base} text-slate-400 dark:text-slate-600 opacity-20 hover:opacity-40`;
  }

  const opacity =
    score === 1 ? 'opacity-40 hover:opacity-60' :
    score === 2 ? 'opacity-70 hover:opacity-85' :
    'opacity-100';

  const color = MARKER_COLORS[markerName] || 'text-slate-500';
  return `${base} ${color} ${opacity}`;
};
