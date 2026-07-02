/**
 * App re-export — fs-types now live in @innv0/format-core.
 * This file preserves import paths for existing app code.
 */
export type { WritableStreamLike, FileHandleLike, DirectoryHandleLike } from '@innv0/format-core'
export { isDirectoryHandle, isFileHandle } from '@innv0/format-core'
