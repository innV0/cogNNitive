import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import type { IntegrateOptions, IntegrateResult } from './types.js'
import { extractVersionFromFilename, incrementPatch, replaceVersionInFilename } from './version.js'

export async function integrateGate(opts: IntegrateOptions): Promise<IntegrateResult> {
  const errors: string[] = []
  const warnings: string[] = []

  const content = await readFile(opts.filePath, 'utf-8')
  const fileName = basename(opts.filePath)
  const currentVersion = extractVersionFromFilename(fileName)
  if (!currentVersion) {
    return { passed: false, errors: ['Cannot extract version from filename'], warnings: [] }
  }

  const newVersion = incrementPatch(currentVersion)
  if (!newVersion) {
    return { passed: false, errors: [`Cannot increment version: ${currentVersion}`], warnings: [] }
  }

  const newFileName = replaceVersionInFilename(fileName, newVersion)
  const updatedContent = content.replace(
    new RegExp(`model_version:\\s*['"]?${escapeRegex(currentVersion)}['"]?`, 'm'),
    `model_version: "${newVersion}"`,
  )

  const targetDir = opts.targetDir ?? process.cwd()
  const targetPath = join(targetDir, newFileName)
  const modelName = newFileName.replace(/_NN\.md$/, '')
  const relativeIndexEntry = `- [[${modelName}]]`

  if (opts.dryRun) {
    return {
      passed: true,
      errors: [],
      warnings: ['Dry-run mode — no files modified'],
      newFilePath: targetPath,
      newVersion,
      indexEntry: relativeIndexEntry,
    }
  }

  const oldPath = opts.filePath
  const newPath = targetPath

  if (oldPath !== newPath) {
    await mkdir(dirname(newPath), { recursive: true })
    await writeFile(newPath, updatedContent, 'utf-8')
    await unlink(oldPath)
  } else {
    await writeFile(oldPath, updatedContent, 'utf-8')
  }

  await updateIndexFile(resolve(targetDir), relativeIndexEntry, modelName)

  return {
    passed: true,
    errors: [],
    warnings: [],
    newFilePath: newPath,
    newVersion,
    indexEntry: relativeIndexEntry,
  }
}

async function updateIndexFile(workspaceRoot: string, entry: string, modelName: string): Promise<void> {
  const indexPath = join(workspaceRoot, 'index.md')
  let indexContent: string
  try {
    indexContent = await readFile(indexPath, 'utf-8')
  } catch {
    indexContent = '# Workspace index\n'
  }

  if (indexContent.includes(`[[${modelName}]]`)) {
    return
  }

  const modelsHeading = indexContent.match(/^## Models$/m)
  if (modelsHeading) {
    indexContent = indexContent.replace(
      /^## Models$/m,
      `## Models\n${entry}`,
    )
  } else {
    indexContent += `\n## Models\n${entry}\n`
  }

  await writeFile(indexPath, indexContent, 'utf-8')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
