import { computed } from 'vue'
import type { MaybeRef, ComputedRef, Component } from 'vue'
import { toValue } from 'vue'
import { getColorClasses } from '../utils/colors'
import { getConceptTypeIcon } from '../utils/conceptVisuals'
import type { BlockKind, ConceptType } from '../utils/conceptVisuals'
import type { ColorPalette } from '../utils/colors'

export interface BlockVisualsOptions {
  kind: MaybeRef<BlockKind>
  conceptType?: MaybeRef<string | undefined>
  color?: MaybeRef<string | undefined>
  icon?: MaybeRef<string | undefined>
  typeName?: MaybeRef<ConceptType | undefined>
}

export interface BlockVisuals {
  resolvedColor: ComputedRef<string>
  resolvedIcon: ComputedRef<string>
  resolvedType: ComputedRef<ConceptType>
  typeIcon: ComputedRef<Component>
  palette: ComputedRef<ColorPalette>
  iconToShow: ComputedRef<'type' | 'icon'>
  containerClasses: ComputedRef<string[]>
}

/**
 * Resolves visual properties (color, icon, palette classes) for a concept block.
 *
 * NOTE: In Phase 1, metamodel-based resolution is stubbed out. When opts.color
 * or opts.conceptType are provided, this uses them directly. Full metamodel
 * resolution through `useMetamodelStore` will be wired in Phase 6.
 */
export function useBlockVisuals(opts: BlockVisualsOptions): BlockVisuals {
  // Stub: direct color and icon from opts only.
  // Phase 6: import useMetamodelStore and resolve getConceptByName() for
  // concept types that don't have color/icon specified.

  const resolvedColor = computed<string>(() => {
    const color = toValue(opts.color)
    if (color) return color
    return ''
  })

  const resolvedIcon = computed<string>(() => {
    const icon = toValue(opts.icon)
    if (icon !== undefined) return icon
    return ''
  })

  const resolvedType = computed<ConceptType>(() => {
    const tn = toValue(opts.typeName)
    if (tn) return tn
    const ct = toValue(opts.conceptType)
    // Phase 6: resolve from metamodelStore.getConceptByName(ct)?.type
    return ct ?? null
  })

  const typeIcon = computed<Component>(() => getConceptTypeIcon(resolvedType.value))

  const palette = computed<ColorPalette>(() => getColorClasses(resolvedColor.value))

  const iconToShow = computed<'type' | 'icon'>(() => 'icon')

  const containerClasses = computed<string[]>(() => {
    const p = palette.value
    if (toValue(opts.kind) === 'concept') {
      return [p.bg, 'border', 'border-solid', p.text, p.border]
    }
    return [p.bg, p.text]
  })

  return {
    resolvedColor,
    resolvedIcon,
    resolvedType,
    typeIcon,
    palette,
    iconToShow,
    containerClasses,
  }
}
