import { parseModel } from '@innv0/format-core'
import type { ValidationCheck, ValidationReport } from './validation-types'

const VERSION_RE = /^V_\d+-\d+-\d+$/
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g
const SECTION_FM_RE = /^#\s+_F\s+(?:(matrices):\s*(.*)|(.*))$/gm

export function validateFormatContent(
  content: string,
  fileName: string,
  declaredMode?: string
): ValidationReport {
  const checks: ValidationCheck[] = []
  const parsed = parseModel(content)
  const fm = parsed.frontmatter

  const rawMode = declaredMode || (typeof fm.mode === 'string' ? fm.mode : 'FILE')
  const mode: 'FILE' | 'FOLDER' = rawMode === 'BOTH' ? 'FILE' : rawMode as 'FILE' | 'FOLDER'
  const isFileMode = mode === 'FILE' || rawMode === 'BOTH'

  // ── Frontmatter ────────────────────────────────────────────────

  // 1. level
  const levelOk = fm.level === 3
  checks.push({
    id: 'fm-level',
    label: 'Model level is 3',
    description: 'FORMAT models must declare level: 3',
    category: 'frontmatter',
    severity: 'error',
    passed: levelOk,
    message: levelOk ? undefined
      : fm.level === undefined ? 'Missing level field'
      : `Expected level 3, got ${fm.level}`,
  })

  // 2. parent
  const parentOk = !!(fm.parent && typeof fm.parent === 'object' && fm.parent.name && fm.parent.url)
  checks.push({
    id: 'fm-parent',
    label: 'Parent reference (name + URL)',
    description: 'Every model must declare its parent template with a name and immutable URL',
    category: 'frontmatter',
    severity: 'error',
    passed: parentOk,
    message: parentOk ? undefined
      : !fm.parent ? 'Missing parent field'
      : !fm.parent.name ? 'Parent missing name'
      : 'Parent missing url',
  })

  // 3. model_version present
  const hasVersion = typeof fm.model_version === 'string' && fm.model_version.length > 0
  checks.push({
    id: 'fm-version',
    label: 'Model version declared',
    description: 'model_version field must be present',
    category: 'frontmatter',
    severity: 'error',
    passed: hasVersion,
    message: hasVersion ? undefined : 'Missing model_version',
  })

  // 4. model_version format
  const versionFormatOk = hasVersion && VERSION_RE.test(fm.model_version as string)
  if (hasVersion) {
    checks.push({
      id: 'fm-version-format',
      label: 'Version follows V_MAJOR-MINOR-PATCH',
      description: 'model_version must match V_x-y-z (e.g. V_0-1-0)',
      category: 'frontmatter',
      severity: 'warning',
      passed: versionFormatOk,
      message: versionFormatOk ? undefined
        : `"${fm.model_version}" does not match V_x-y-z format`,
    })
  }

  // 5. mode
  const fmRawMode = fm.mode
  const fmm = fmRawMode ? (Array.isArray(fmRawMode) ? fmRawMode : [fmRawMode]) : []
  const validMode = fmm.length > 0 && fmm.every((m: unknown) => m === 'FILE' || m === 'FOLDER')
  checks.push({
    id: 'fm-mode',
    label: 'Valid mode declaration (FILE / FOLDER)',
    description: 'Model must declare mode as FILE, FOLDER, or both',
    category: 'frontmatter',
    severity: 'error',
    passed: validMode,
    message: validMode ? undefined
      : !fmRawMode ? 'Missing mode field'
      : `Invalid mode value: ${JSON.stringify(fmRawMode)}`,
  })

  // 6. title
  const titleOk = typeof fm.title === 'string' && fm.title.length > 0
  checks.push({
    id: 'fm-title',
    label: 'Title present',
    description: 'Model must declare a title',
    category: 'frontmatter',
    severity: 'error',
    passed: titleOk,
    message: titleOk ? undefined : 'Missing title',
  })

  // 7. specification_version
  const specVersionOk = typeof fm.specification_version === 'string' && fm.specification_version.length > 0
  checks.push({
    id: 'fm-spec-version',
    label: 'Specification version declared',
    description: 'specification_version field must be present',
    category: 'frontmatter',
    severity: 'error',
    passed: specVersionOk,
    message: specVersionOk ? undefined : 'Missing specification_version',
  })

  // ── Body syntax ────────────────────────────────────────────────

  const body = content.replace(/^---[\s\S]*?---\n?/, '').trim()
  const hasBody = body.length > 0

  // 8. Document notice
  if (hasBody) {
    const hasNote = /^> \[!NOTE\]/m.test(body)
    checks.push({
      id: 'body-note',
      label: 'Document notice blockquote',
      description: 'Body should start with a > [!NOTE] blockquote identifying the FORMAT document',
      category: 'body',
      severity: 'warning',
      passed: hasNote,
      message: hasNote ? undefined : 'Missing [!NOTE] document notice in body',
    })
  }

  // 9. Index section
  const hasIndex = parsed.taxonomy.length > 0
  if (isFileMode) {
    checks.push({
      id: 'body-index',
      label: 'Taxonomy index section',
      description: 'FILE-mode models must have a # _F index section with [[wikilinks]]',
      category: 'body',
      severity: 'error',
      passed: hasIndex,
      message: hasIndex ? undefined : 'No _F index section found',
    })
  } else if (hasIndex) {
    checks.push({
      id: 'body-index',
      label: 'Taxonomy index section',
      description: 'FOLDER-mode root may declare an index for top-level concepts',
      category: 'body',
      severity: 'info',
      passed: true,
      message: hasIndex ? 'Index section present' : undefined,
    })
  }

  // 10. Concept section markers
  const sectionMatches = [...content.matchAll(SECTION_FM_RE)]
  const conceptSectionCount = sectionMatches.filter(m => {
    const name = m[1] === 'matrices' ? m[2] : m[3]
    return m[1] !== 'matrices' && name != null && name.trim().toLowerCase() !== 'index'
  }).length
  if (isFileMode && hasBody) {
    const allValid = sectionMatches.every(m => m[1] === 'matrices' || (m[3] != null && m[3].trim().length > 0))
    checks.push({
      id: 'body-concept-sections',
      label: 'Valid concept section markers',
      description: 'Each concept section must use # _F <ConceptName> syntax',
      category: 'body',
      severity: 'error',
      passed: conceptSectionCount > 0 && allValid,
      message: !allValid ? 'Some section headers have invalid _F markers'
        : conceptSectionCount === 0 ? 'No concept sections found (body is empty or malformed)'
        : undefined,
    })
  }

  // 11. Element marker syntax
  const visMarkerRe = /^\s*[*\-]\s+_F\s+([\w\s-]+?):\s+(.+)$/gm
  const hidMarkerRe = /^\s*[*\-]\s+<!--\s+(?:_F\s+([\w\s-]+?):|block:\s*([\w\s-]+?))\s*-->\s*(.*)$/gm
  const visibleMarkers = [...body.matchAll(visMarkerRe)]
  const hiddenMarkers = [...body.matchAll(hidMarkerRe)]
  const totalMarkers = visibleMarkers.length + hiddenMarkers.length

  const suspectLines: string[] = []
  const lines = body.split('\n')
  let inIndexSection = false
  for (const line of lines) {
    if (/^#\s+_F\s+index\s*$/im.test(line.trim())) {
      inIndexSection = true
      continue
    }
    if (inIndexSection) {
      if (/^#\s/.test(line.trim())) inIndexSection = false
      else continue
    }
    const trimmed = line.trim()
    if ((trimmed.startsWith('* ') || trimmed.startsWith('- '))
      && !trimmed.startsWith('* _F ') && !trimmed.startsWith('- _F ')
      && !trimmed.startsWith('* <!--') && !trimmed.startsWith('- <!--')) {
      suspectLines.push(trimmed.substring(0, 60))
    }
  }

  if (isFileMode && hasBody) {
    checks.push({
      id: 'body-element-markers',
      label: 'Valid element markers',
      description: 'Elements must use `* _F ConceptName: Element` or `* <!-- _F ConceptName: --> Element` syntax',
      category: 'body',
      severity: 'error',
      passed: suspectLines.length === 0 && totalMarkers > 0,
      message: suspectLines.length > 0
        ? `${suspectLines.length} bullet(s) look like elements but use wrong marker syntax:\n${suspectLines.slice(0, 3).join('\n')}`
        : totalMarkers === 0 ? 'No _F element markers found'
        : undefined,
    })
  }

  // ── Conventions ────────────────────────────────────────────────

  // 12. File naming
  const namingOk = fileName.endsWith('_FORMAT.md')
  checks.push({
    id: 'conv-file-naming',
    label: 'File naming convention',
    description: 'FORMAT files must end with _FORMAT.md',
    category: 'convention',
    severity: 'warning',
    passed: namingOk,
    message: namingOk ? undefined : `"${fileName}" does not end with _FORMAT.md`,
  })

  // 13. Wikilinks reference
  if (hasIndex) {
    const allWikilinks = [...content.matchAll(WIKILINK_RE)].map(m => m[1].toLowerCase())
    const conceptNames = new Set<string>()
    for (const key of parsed.elements.keys()) {
      conceptNames.add(key.toLowerCase())
    }
    // Also collect concept section titles
    for (const m of sectionMatches) {
      const isMatrix = m[1] === 'matrices'
      const name = (isMatrix ? (m[2] || '') : (m[3] || '')).trim().toLowerCase()
      if (name && name !== 'index') conceptNames.add(name)
    }
    const undefinedRefs = [...new Set(allWikilinks.filter(w => !conceptNames.has(w)))]

    checks.push({
      id: 'conv-wikilinks',
      label: 'All [[wikilinks]] reference existing concepts',
      description: 'Every wikilink in the index should match a concept section or element',
      category: 'convention',
      severity: 'warning',
      passed: undefinedRefs.length === 0,
      message: undefinedRefs.length > 0
        ? `${undefinedRefs.length} undefined reference(s): ${undefinedRefs.slice(0, 5).join(', ')}${undefinedRefs.length > 5 ? '…' : ''}`
        : undefined,
    })
  }

  // ── Summary ────────────────────────────────────────────────────

  const all = checks.length
  const passed = checks.filter(c => c.passed).length
  const errors = checks.filter(c => !c.passed && c.severity === 'error').length
  const warnings = checks.filter(c => !c.passed && c.severity === 'warning').length

  // Only show active checks (skip info and passed warnings from totals)
  const activeChecks = checks.filter(c => c.severity !== 'info')

  return {
    mode: mode as 'FILE' | 'FOLDER',
    checks,
    summary: {
      total: activeChecks.length,
      passed: activeChecks.filter(c => c.passed).length,
      errors,
      warnings,
    },
  }
}
