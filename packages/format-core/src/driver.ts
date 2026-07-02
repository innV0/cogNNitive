import type { ParsedModel } from './types'
import { FileDriver } from './driver-file'
import { FolderDriver } from './driver-folder'

export type DriverType = 'FILE' | 'FOLDER'

export interface ModelEntry {
  name: string
  uri: string
  kind: 'element' | 'asset' | 'concept'
}

export interface ModelDriver {
  readModel(uri: string): Promise<ParsedModel>
  writeModel(uri: string, model: ParsedModel): Promise<void>
  listChildren(uri: string): Promise<ModelEntry[]>
  listAssets(uri: string): Promise<string[]>
}

export function createDriver(type: DriverType, baseUri: string): ModelDriver {
  switch (type) {
    case 'FILE':
      return new FileDriver(baseUri)
    case 'FOLDER':
      return new FolderDriver(baseUri)
  }
}
