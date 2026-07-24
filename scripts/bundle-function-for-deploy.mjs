#!/usr/bin/env node
// Inlines supabase/functions/_shared/* into a single-file bundle for a given
// function, so it can be deployed via the Management API's simple
// {slug, body} endpoint (one JSON POST) instead of the multi-asset eszip
// upload path, which times out in some sandboxed environments. The repo's
// modular supabase/functions/<name>/index.ts + _shared/* stays canonical;
// this is only used to produce a deploy payload.
//
// Usage: node scripts/bundle-function-for-deploy.mjs <function-name> > out.ts

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const fnName = process.argv[2]
if (!fnName) {
  console.error('Usage: node scripts/bundle-function-for-deploy.mjs <function-name>')
  process.exit(1)
}

const sharedDir = join(root, 'supabase', 'functions', '_shared')
const entryPath = join(root, 'supabase', 'functions', fnName, 'index.ts')

// Fixed dependency order for our known _shared graph.
const sharedOrder = ['persona.ts', 'cors.ts', 'supabaseAdmin.ts', 'claude.ts', 'modeInstructions.ts', 'testMode.ts']

function stripLocalImports(src) {
  // Handles both single-line (`import X from '../y.ts'`) and multi-line
  // brace imports (`import {\n  X,\n} from '../y.ts'`) referencing local files.
  // External (https://) imports are left in place — ES module import
  // declarations are hoisted regardless of where they appear at the top
  // level, so there's no need to relocate them to the top of the bundle.
  return src.replace(/^import\s+[\s\S]*?from\s+['"]\.\.?\/[^'"]+['"]\s*\n/gm, '')
}

const sharedBodies = sharedOrder.map((file) => {
  const src = readFileSync(join(sharedDir, file), 'utf-8')
  return `// --- ${file} ---\n${stripLocalImports(src)}`
})

const entrySrc = readFileSync(entryPath, 'utf-8')
const entryBody = `// --- index.ts ---\n${stripLocalImports(entrySrc)}`

const output = [...sharedBodies, entryBody].join('\n')

process.stdout.write(output)
