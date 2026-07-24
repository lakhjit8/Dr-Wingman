import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestUser, deleteTestUser, type TestUser } from './helpers/testUser'
import { invokeFunction, listUserScreenshots, uploadFixture } from './helpers/functions'

// Section 1.1: No image persistence. Proves the explicit delete-after-analysis
// behavior actually holds, on both the happy path and a forced-failure path,
// by checking storage directly rather than trusting the app's own response.

describe('no image persistence', () => {
  let user: TestUser

  beforeAll(async () => {
    user = await createTestUser()
  })

  afterAll(async () => {
    await deleteTestUser(user.id)
  })

  it('deletes the screenshot after a successful analysis', async () => {
    const path = await uploadFixture(user, 'name-leak-test.png')
    expect(await listUserScreenshots(user.id)).toContain(path.split('/')[1])

    const { status } = await invokeFunction(user, 'analyze-profile-photos', { paths: [path] })
    expect(status).toBe(200)

    const remaining = await listUserScreenshots(user.id)
    expect(remaining).not.toContain(path.split('/')[1])
  })

  it('still deletes the screenshot when the Claude call fails mid-processing', async () => {
    const path = await uploadFixture(user, 'name-leak-test.png')
    expect(await listUserScreenshots(user.id)).toContain(path.split('/')[1])

    const { status } = await invokeFunction(
      user,
      'analyze-profile-photos',
      { paths: [path] },
      { forceError: true }
    )
    expect(status).toBe(500)

    const remaining = await listUserScreenshots(user.id)
    expect(remaining).not.toContain(path.split('/')[1])
  })
})
