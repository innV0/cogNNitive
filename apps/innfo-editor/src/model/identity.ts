/**
 * App re-export — identity and CollisionDiagnostic now live in @innv0/format-core.
 * This file preserves import paths for existing app code.
 */
export type { CollisionDiagnostic } from '@innv0/format-core'
export { IdentityRegistry, buildQualifiedId } from '@innv0/format-core'
