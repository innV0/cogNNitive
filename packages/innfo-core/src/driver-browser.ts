/**
 * Browser-safe re-export of driver types and a no-op createDriver stub.
 *
 * In the browser, the app uses the File System Access API directly
 * (DirectoryHandleLike) instead of the Node.js-based ModelDriver
 * implementations. createDriver is provided as a value export that
 * matches the ModelDriver interface so imports compile and resolve,
 * but any actual read/write call throws a descriptive error — the
 * app's handle-based fallback must be used instead.
 *
 * The real Node.js implementation lives in driver-unified.ts,
 * which imports node:fs/promises and is excluded from the browser
 * entry point.
 */

import type { ParsedModel } from './types'
import type { ModelDriver, ModelEntry } from './driver'
export type { ModelDriver, ModelEntry }

/**
 * Creates a browser-safe no-op driver. The returned driver methods all
 * throw an error — the browser code path uses File System Access API
 * handles directly and should never call driver methods.
 *
 * A future version may implement a real browser-based driver using
 * the File System Access API (showDirectoryPicker, createWritable, etc.)
 * for environments where the handle-based fallback is insufficient.
 */
export function createDriver(_baseUri: string): ModelDriver {
  const notAvailable = (method: string) => {
    throw new Error(
      `ModelDriver.${method}() is not available in the browser. ` +
        'Use the File System Access API handle-based code path instead.',
    )
  }
  return {
    readModel: (_uri: string) => notAvailable('readModel'),
    writeModel: (_uri: string, _model: ParsedModel) => notAvailable('writeModel'),
    listChildren: (_uri: string) => notAvailable('listChildren'),
    listAssets: (_uri: string) => notAvailable('listAssets'),
  }
}
