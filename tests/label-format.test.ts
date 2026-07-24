import { describe, expect, it } from 'vitest'
import { runSql } from './helpers/managementApi'

// Section 1.5: Label format compliance. Checked against whatever real
// match_label data already exists (per the spec's suggested order — this is
// meant to run once there's real usage, not synthetic data generated fresh
// each CI run, since generating a batch would mean a batch of real,
// billed Claude calls just to exercise a regex check).

const LABEL_PATTERN = /^.+\s\([A-Z][a-z]{2} \d{1,2}\)$/
const DIGITS_ONLY_TRAITS = /^#?\d+$/
const COUNTER_STYLE = /^match\s*#?\d*$/i
// crude heuristic for an obviously identifying detail slipping into the label
const JOB_TITLE_HINT = /\b(engineer|manager|director|nurse|teacher|lawyer|doctor|founder|ceo)\b/i

describe('match_label format compliance', () => {
  it('every stored match_label matches the expected shape', async () => {
    const rows = await runSql<{ id: string; match_label: string }>(
      `select id, match_label from public.matches;`
    )

    if (rows.length === 0) {
      console.warn('No matches exist yet — nothing to check. Re-run once there is real usage data.')
      return
    }

    const violations = rows.filter(({ match_label }) => {
      const traitsPart = match_label.replace(/\s\([A-Za-z]{3} \d{1,2}\)$/, '')
      return (
        !LABEL_PATTERN.test(match_label) ||
        DIGITS_ONLY_TRAITS.test(traitsPart) ||
        COUNTER_STYLE.test(traitsPart) ||
        JOB_TITLE_HINT.test(match_label)
      )
    })

    expect(violations, `labels that need manual review: ${JSON.stringify(violations)}`).toEqual([])
  })
})
