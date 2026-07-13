#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { validateGate, integrateGate } from '../packages/pipeline-gates/dist/index.js'

const [cmd, ...args] = process.argv.slice(2)

function usage() {
  console.log(`
Usage:
  node scripts/pipeline-gate.mjs validate <file> [--skip-mcp]
  node scripts/pipeline-gate.mjs integrate <file> [--target-dir <path>] [--dry-run]

Commands:
  validate   Check iNNfo naming, frontmatter, notice, and MCP validation
  integrate  Increment patch version, update index.md, move file
`)
  process.exit(1)
}

if (!cmd || args.length === 0) usage()

const filePath = args[0]
if (!existsSync(filePath)) {
  console.error(`File not found: ${filePath}`)
  process.exit(1)
}

if (cmd === 'validate') {
  const skipMcp = args.includes('--skip-mcp')
  const result = await validateGate({ filePath, skipMcp })
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.passed ? 0 : 1)
} else if (cmd === 'integrate') {
  const dryRun = args.includes('--dry-run')
  const targetIdx = args.indexOf('--target-dir')
  const targetDir = targetIdx >= 0 && targetIdx + 1 < args.length ? args[targetIdx + 1] : undefined
  const result = await integrateGate({ filePath, targetDir, dryRun })
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.passed ? 0 : 1)
} else {
  console.error(`Unknown command: ${cmd}`)
  usage()
}
