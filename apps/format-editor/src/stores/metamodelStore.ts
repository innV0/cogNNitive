import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useModelStore } from './modelStore'
import { useWorkspaceStore } from './workspaceStore'
import { resolveEffectiveMetamodel } from '../model/metamodel'
import { parseMetamodelDocumentation } from '../utils/documentationParser'
import { parseFormatFilename } from '../utils/version'
import type { MetamodelConcept, MetamodelMarker } from '../model/types'
import type { DocumentationEntry } from '../utils/documentationParser'
import type { DirectoryHandleLike } from './workspaceStore'

/**
 * Thin Pinia adapter over `resolveEffectiveMetamodel()`. Replaces
 * file-format's `metamodelStore` imports: exposes `concepts`, `markers`,
 * `getConceptByName`, and `getConceptFields` by resolving the effective
 * metamodel from the root node (or active node) in `modelStore`.
 */
export const useMetamodelStore = defineStore('metamodel', () => {
  const modelStore = useModelStore()

  const rootId = computed(() => modelStore.rootIds[0])

  const concepts = computed<MetamodelConcept[]>(() => {
    if (!rootId.value) return []
    const metamodel = resolveEffectiveMetamodel(rootId.value, modelStore.nodes)
    return metamodel.concepts
  })

  const markers = computed<MetamodelMarker[]>(() => {
    if (!rootId.value) return []
    const metamodel = resolveEffectiveMetamodel(rootId.value, modelStore.nodes)
    return metamodel.markers
  })

  function getConceptByName(name: string): MetamodelConcept | undefined {
    return concepts.value.find((c) => c.name === name)
  }

  function getConceptFields(name: string): MetamodelConcept['fields'] {
    const concept = getConceptByName(name)
    return concept?.fields ?? []
  }

  /* ── Documentation state ── */

  const documentation = ref<Record<string, DocumentationEntry>>({})
  const docsLoading = ref(false)
  const docsError = ref<string | null>(null)

  async function loadDocumentation(
    handle: DirectoryHandleLike,
    templateName: string,
    templateVersion: string,
  ): Promise<void> {
    if (Object.keys(documentation.value).length > 0) return
    docsLoading.value = true
    docsError.value = null
    try {
      const fileHandle = await handle.getFileHandle(
        `docs/documentation/templates/${templateName}/${templateVersion}/documentation.md`,
      )
      const file = await fileHandle.getFile()
      const markdown = await file.text()
      documentation.value = parseMetamodelDocumentation(markdown)
    } catch (err) {
      docsError.value = err instanceof Error ? err.message : String(err)
    } finally {
      docsLoading.value = false
    }
  }

  /* ── Guidance accessors ── */

  function getConceptGuidance(conceptName: string): DocumentationEntry | null {
    const key = conceptName.toLowerCase()
    if (documentation.value[key]) return documentation.value[key]

    // Lazy load if documentation is empty and not currently loading
    if (Object.keys(documentation.value).length === 0 && !docsLoading.value) {
      const ws = useWorkspaceStore()
      if (ws.handle) {
        const rootNode = modelStore.getNode(modelStore.rootIds[0])
        if (rootNode) {
          const parsed = parseFormatFilename(rootNode.source.path)
          const templateName = parsed?.templateName ?? ''
          // Extract template version from frontmatter raw content
          const templateVersion = extractTemplateVersionFromRaw(rootNode.rawContent ?? '')
          if (templateName && templateVersion) {
            loadDocumentation(ws.handle, templateName, templateVersion)
          }
        }
      }
    }

    return documentation.value[key] ?? null
  }

  function getCleanPrompts(conceptName: string): string[] {
    return getConceptGuidance(conceptName)?.prompts ?? []
  }

  function getMatrixGuidance(matrixDef: {
    name: string
    source: string
    target: string
  }): { sourceEntry: DocumentationEntry | null; targetEntry: DocumentationEntry | null } {
    return {
      sourceEntry: getConceptGuidance(matrixDef.source),
      targetEntry: getConceptGuidance(matrixDef.target),
    }
  }

  /**
   * Extracts the template version string from a FORMAT document's raw frontmatter.
   * Tries `template.version` first, then falls back to `model_version`.
   */
  function extractTemplateVersionFromRaw(rawContent: string): string {
    // Try template: { name: ..., version: ... } block
    const templateSection = rawContent.match(/^template:\s*\n((?:\s+[^\n]+\n)*)/m)
    if (templateSection) {
      const versionMatch = templateSection[1].match(/version:\s*["']([^"'\n]+)["']/)
      if (versionMatch) return versionMatch[1]
    }
    // Fallback to top-level model_version
    const modelVersionMatch = rawContent.match(/^model_version:\s*["']([^"'\n]+)["']/m)
    if (modelVersionMatch) return modelVersionMatch[1]
    return ''
  }

  return {
    concepts,
    markers,
    getConceptByName,
    getConceptFields,
    documentation,
    docsLoading,
    docsError,
    loadDocumentation,
    getConceptGuidance,
    getCleanPrompts,
    getMatrixGuidance,
  }
})
