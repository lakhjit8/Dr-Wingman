#!/usr/bin/env node
// Admin-only spot-check tool (not user-facing) — pulls a recent sample of
// AI-generated compatibility_notes/match_label values and flags anything
// that looks like it violates the persona's hedged-framing or
// no-identifying-detail rules, for periodic manual review (weekly during
// early operation, monthly once stable, per the risk-verification spec).
// Not a product feature — a lightweight monitoring script.
//
// Usage: SUPABASE_PROJECT_REF=... SUPABASE_ACCESS_TOKEN=... node scripts/audit-ai-output.mjs [sampleSize]

const projectRef = process.env.SUPABASE_PROJECT_REF
const accessToken = process.env.SUPABASE_ACCESS_TOKEN
const sampleSize = Number(process.argv[2] ?? 50)

if (!projectRef || !accessToken) {
  console.error('Set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN in the environment.')
  process.exit(1)
}

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`SQL query failed (${res.status}): ${await res.text()}`)
  return res.json()
}

// Heuristics — intentionally simple regex/keyword checks, not NLP. False
// positives are expected and fine; this flags candidates for a human to
// actually read, it doesn't auto-reject anything.
const UNHEDGED_CLAIM = /\b(she|he|they)\s+is\s+\w+/i
const HEDGE_WORDS = /\b(suggests?|may|might|could|reads? as|indicates?|appears?|seems?)\b/i
const PROPER_NAME_LIKE = /\b[A-Z][a-z]{2,}\b/ // capitalized word mid-sentence-ish; very crude
const JOB_TITLE_HINT = /\b(engineer|manager|director|nurse|teacher|lawyer|doctor|founder|ceo)\b/i
const LABEL_PATTERN = /^.+\s\([A-Z][a-z]{2} \d{1,2}\)$/

function checkNote(note) {
  const flags = []
  if (UNHEDGED_CLAIM.test(note) && !HEDGE_WORDS.test(note)) {
    flags.push('unhedged character claim')
  }
  if (JOB_TITLE_HINT.test(note)) {
    flags.push('possible job title')
  }
  return flags
}

function checkLabel(label) {
  const flags = []
  if (!LABEL_PATTERN.test(label)) flags.push('does not match expected label format')
  if (JOB_TITLE_HINT.test(label)) flags.push('possible job title in label')
  // A capitalized word other than the leading word of a sentence/label segment
  // is worth a human glance — cheap proxy for "might be a name".
  const words = label.replace(/\([A-Za-z]{3} \d{1,2}\)$/, '').trim().split(/\s+/)
  if (words.slice(1).some((w) => PROPER_NAME_LIKE.test(w) && w === w[0].toUpperCase() + w.slice(1))) {
    flags.push('capitalized word that might be a name')
  }
  return flags
}

const rows = await runSql(
  `select id, match_label, style_summary ->> 'compatibility_notes' as compatibility_notes, created_at
   from public.matches order by created_at desc limit ${sampleSize};`
)

console.log(`Sampled ${rows.length} match(es).\n`)

let flaggedCount = 0
for (const row of rows) {
  const labelFlags = checkLabel(row.match_label ?? '')
  const noteFlags = row.compatibility_notes ? checkNote(row.compatibility_notes) : []
  const allFlags = [...labelFlags, ...noteFlags]
  if (allFlags.length === 0) continue
  flaggedCount++
  console.log(`⚠ match ${row.id} (${row.created_at})`)
  console.log(`  label: ${row.match_label}`)
  if (row.compatibility_notes) console.log(`  notes: ${row.compatibility_notes.slice(0, 200)}...`)
  console.log(`  flags: ${allFlags.join(', ')}\n`)
}

console.log(`\n${flaggedCount} of ${rows.length} flagged for manual review.`)
console.log(flaggedCount === 0 ? 'PASS' : 'REVIEW NEEDED')
process.exit(flaggedCount === 0 ? 0 : 1)
