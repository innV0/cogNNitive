/** A single check result within a validation report. */
export interface ValidationCheck {
  id: string
  label: string
  description: string
  category: 'frontmatter' | 'body' | 'convention'
  severity: 'error' | 'warning' | 'info'
  passed: boolean
  message?: string
}

export interface ValidationSummary {
  total: number
  passed: number
  errors: number
  warnings: number
}

export interface ValidationReport {
  mode: 'FILE' | 'FOLDER'
  checks: ValidationCheck[]
  summary: ValidationSummary
}

/** Recent folder entry stored in IndexedDB-backed history. */
export interface FolderHistoryEntry {
  name: string
  handleKey: string
  timestamp: number
}

/** Onboarding sample model entry. */
export interface SampleFolder {
  id: string
  name: string
  description: string
  mode: string
  path: string
  items: number
}
