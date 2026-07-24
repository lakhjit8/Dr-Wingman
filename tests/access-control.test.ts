import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, createTestUser, deleteTestUser, type TestUser } from './helpers/testUser'

// Section 1.4: Row-level access control. Creates a match owned by User A,
// then has User B query for it directly via the REST API (PostgREST, not
// our own backend) using B's own real session — proving RLS blocks this at
// the database layer, not just something hidden by the app's UI.

describe('row-level access control', () => {
  let userA: TestUser
  let userB: TestUser
  let matchId: string

  beforeAll(async () => {
    userA = await createTestUser()
    userB = await createTestUser()

    const { data, error } = await adminClient
      .from('matches')
      .insert({ user_id: userA.id, match_label: 'Access control test (RLS)' })
      .select()
      .single()
    if (error) throw error
    matchId = data.id
  }, 30_000)

  afterAll(async () => {
    await adminClient.from('matches').delete().eq('id', matchId)
    await deleteTestUser(userA.id)
    await deleteTestUser(userB.id)
  })

  it('lets the owning user read their own match', async () => {
    const { data, error } = await userA.client.from('matches').select('*').eq('id', matchId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it("blocks a different user from reading another user's match via the API directly", async () => {
    const { data, error } = await userB.client.from('matches').select('*').eq('id', matchId)
    // RLS filters the row out rather than raising an authorization error —
    // the request succeeds but returns nothing, which is the behavior to assert.
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it("blocks a different user from updating another user's match via the API directly", async () => {
    const { data, error } = await userB.client
      .from('matches')
      .update({ match_label: 'hijacked' })
      .eq('id', matchId)
      .select()
    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: stillOriginal } = await adminClient.from('matches').select('match_label').eq('id', matchId).single()
    expect(stillOriginal?.match_label).toBe('Access control test (RLS)')
  })
})
