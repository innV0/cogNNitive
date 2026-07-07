import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { parseFrontmatter } from '@innv0/innfo-core'
import type { SpecCache, SpecDocument, SpecFrontmatter, ResolverOptions } from '@innv0/innfo-core'

const MAX_DEPTH_DEFAULT = 10

function normalizeVersion(versionStr: string): string {
  let v = versionStr.replace(/^[vV]_?/, '')
  v = v.replace(/[_-]/g, '.')
  return v.trim()
}

function parseSpecName(name: string) {
  // Strip file extensions and NN/FORMAT suffixes
  const clean = name.replace(/\.(md|markdown)$/i, '').replace(/_(NN|FORMAT)$/i, '')
  // Split at _V_ to extract base and version
  const parts = clean.split(/_V_/i)
  const base = parts[0].toLowerCase()
  const rawVersion = parts[1]
  const version = rawVersion ? normalizeVersion(rawVersion) : undefined
  return { base, version }
}

async function getMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await getMarkdownFiles(fullPath)))
      } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
        files.push(fullPath)
      }
    }
  } catch {
    // Ignore directory reading issues
  }
  return files
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const { access } = await import('node:fs/promises')
    await access(path)
    return true
  } catch {
    return false
  }
}

async function download(url: string, timeout: number): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const resp = await fetch(url, { signal: controller.signal })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
    return await resp.text()
  } finally {
    clearTimeout(timer)
  }
}

async function findLocalSpec(specsDir: string, reqName: string): Promise<string | null> {
  const reqParsed = parseSpecName(reqName)
  const localFiles = await getMarkdownFiles(specsDir)

  for (const filePath of localFiles) {
    const filename = basename(filePath)
    const fileParsed = parseSpecName(filename)

    if (fileParsed.base === reqParsed.base) {
      if (reqParsed.version) {
        if (fileParsed.version && fileParsed.version === reqParsed.version) {
          return filePath
        }
        if (!fileParsed.version) {
          try {
            const content = await readFile(filePath, 'utf-8')
            const fm = parseFrontmatter(content)
            const fmVer = fm?.spec_version ?? fm?.specification_version
            if (fmVer && normalizeVersion(String(fmVer)) === reqParsed.version) {
              return filePath
            }
          } catch {
            // Read or parse error, skip to next file
          }
        }
      } else {
        return filePath
      }
    }
  }
  return null
}

export async function resolveParentChainNode(
  rootDir: string,
  parentUrl: string,
  parentName: string,
  cacheDir: string,
  options: ResolverOptions = {},
): Promise<SpecCache> {
  const maxDepth = options.maxDepth ?? MAX_DEPTH_DEFAULT
  const timeout = options.timeout ?? 10000
  const specsDir = join(rootDir, 'specs')
  const specs = new Map<string, SpecDocument>()
  const chain: string[] = []

  let currentUrl: string | undefined = parentUrl
  let currentName: string | undefined = parentName
  let depth = 0

  await mkdir(cacheDir, { recursive: true })

  while (currentUrl && currentName && depth < maxDepth) {
    let content: string | null = null

    // 1. Try local specs/ directory recursively
    const localPath = await findLocalSpec(specsDir, currentName)
    if (localPath) {
      content = await readFile(localPath, 'utf-8')
    }

    // 2. Try cache directory
    if (content === null) {
      const cachePath = join(cacheDir, `${currentName}_NN.md`)
      if (await fileExists(cachePath)) {
        content = await readFile(cachePath, 'utf-8')
      }
    }

    // 3. Download from network and save to cache directory
    if (content === null) {
      content = await download(currentUrl, timeout)
      const cachePath = join(cacheDir, `${currentName}_NN.md`)
      await writeFile(cachePath, content, 'utf-8')
    }

    const fm = parseFrontmatter(content) ?? ({} as SpecFrontmatter)
    const doc: SpecDocument = {
      name: currentName,
      level: fm.level ?? 0,
      parentName: fm.parent_spec?.name,
      parentUrl: fm.parent_spec?.url,
      frontmatter: fm,
      rawContent: content,
    }
    specs.set(currentName, doc)
    chain.push(currentName)

    currentName = doc.parentName
    currentUrl = doc.parentUrl
    depth++
  }

  if (depth >= maxDepth && currentUrl) {
    throw new Error(`Circular parent chain detected at depth ${maxDepth}`)
  }

  return { specs, chain }
}
