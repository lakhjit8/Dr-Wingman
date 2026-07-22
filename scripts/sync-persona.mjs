#!/usr/bin/env node
// Regenerates supabase/functions/_shared/persona.ts from docs/dr-wingman-persona.md
// so the Edge Functions (which can't read files outside their own directory at
// deploy time) always ship the same system prompt documented in docs/.
// Run this after editing the persona doc, before `supabase functions deploy`.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const source = join(root, 'docs', 'dr-wingman-persona.md')
const target = join(root, 'supabase', 'functions', '_shared', 'persona.ts')

const markdown = readFileSync(source, 'utf-8')

const output = `// GENERATED FILE — do not edit directly.
// Source of truth: docs/dr-wingman-persona.md
// Regenerate with: npm run sync-persona

export const DR_WINGMAN_PERSONA = ${JSON.stringify(markdown)}
`

writeFileSync(target, output)
console.log(`Synced ${source} -> ${target} (${markdown.length} chars)`)
