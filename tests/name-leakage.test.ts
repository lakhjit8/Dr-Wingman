import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestUser, deleteTestUser, type TestUser } from './helpers/testUser'
import { invokeFunction, uploadFixture } from './helpers/functions'
import { runSql, queryFunctionLogs } from './helpers/managementApi'

// Section 1.2: No name leakage. tests/fixtures/name-leak-test.png contains
// "SARAH" both as what looks like a name label and inside bio-style body
// text — the two patterns the spec calls out ("name in a prompt answer text
// vs. name in the platform's UI chrome"). This calls the real Claude API
// (no mocking — the thing being tested is model behavior against the
// persona's instructions, which can only be verified with a real call).

const TEST_NAME = /sarah/i

describe('no name leakage', () => {
  let user: TestUser
  let matchId: string

  beforeAll(async () => {
    user = await createTestUser()
  }, 30_000)

  afterAll(async () => {
    if (matchId) await runSql(`delete from public.matches where id = '${matchId}';`)
    await deleteTestUser(user.id)
  })

  it('never returns the name in the API response', async () => {
    const path = await uploadFixture(user, 'name-leak-test.png')
    const { status, json } = await invokeFunction(user, 'analyze-match-profile', {
      paths: [path],
      platform: 'test-fixture',
    })
    expect(status).toBe(200)
    expect(json.matchId).toBeTruthy()
    matchId = json.matchId as string

    expect(JSON.stringify(json)).not.toMatch(TEST_NAME)
  })

  it('never stores the name in match_label or style_summary', async () => {
    expect(matchId, 'previous test must have created a match').toBeTruthy()
    const rows = await runSql<{ match_label: string; style_summary: unknown }>(
      `select match_label, style_summary from public.matches where id = '${matchId}';`
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].match_label).not.toMatch(TEST_NAME)
    expect(JSON.stringify(rows[0].style_summary)).not.toMatch(TEST_NAME)
  })

  it('never stores the name in the coach chat message content/metadata', async () => {
    const rows = await runSql<{ content: string; metadata: unknown }>(
      `select content, metadata from public.match_messages where match_id = '${matchId}';`
    )
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.content).not.toMatch(TEST_NAME)
      expect(JSON.stringify(row.metadata)).not.toMatch(TEST_NAME)
    }
  })

  it('never logs the name during the request', async () => {
    // Log ingestion has a short delay; give it a moment before querying.
    await new Promise((r) => setTimeout(r, 15_000))
    const logs = await queryFunctionLogs(5)
    const offending = logs.filter((l) => TEST_NAME.test(l.event_message))
    expect(offending).toEqual([])
  }, 30_000)
})
