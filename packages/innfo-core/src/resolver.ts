import { SpecCache, SpecDocument, ResolverOptions } from './types'

export interface SpecResolver {
  resolveParentChain(
    parentUrl: string,
    parentName: string,
    cacheDir: string,
    options?: ResolverOptions,
  ): Promise<SpecCache>
}

export class SpecResolutionError extends Error {
  constructor(
    message: string,
    public readonly url?: string,
  ) {
    super(message)
    this.name = 'SpecResolutionError'
  }
}

export function getSpecForLevel(cache: SpecCache, level: number): SpecDocument | undefined {
  for (const doc of cache.specs.values()) {
    if (doc.level === level) return doc
  }
  return undefined
}

export function getTemplate(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 3) ?? getSpecForLevel(cache, 2)
}

export function getFormatSpec(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 1)
}

export function getDefiNNe(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 0)
}
