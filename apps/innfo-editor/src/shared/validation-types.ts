/**
 * App re-export — validation check types now live in @innv0/innfo-core.
 * This file preserves import paths for existing app code.
 */
export type {
  ValidationCheck,
  ValidationSummary,
  ValidationReport,
} from '@innv0/innfo-core'

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
