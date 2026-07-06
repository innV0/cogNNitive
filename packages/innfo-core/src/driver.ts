import type { ParsedModel } from './types'

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
