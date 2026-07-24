import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestUser, deleteTestUser, type TestUser } from './helpers/testUser'
import { invokeFunction, uploadFixture } from './helpers/functions'
import { queryFunctionLogs } from './helpers/managementApi'

// Section 1.3: No image data in logs/errors, on both the success and the
// forced-failure path (error paths are exactly where this kind of leak
// tends to hide — an error message that includes the raw payload).

const BASE64_RUN = /[A-Za-z0-9+/]{120,}={0,2}/ // a long base64-looking run
const STORAGE_URL = /storage\/v1\/object/i

describe('no image data in logs', () => {
  let user: TestUser
  let successPath: string
  let errorPath: string

  beforeAll(async () => {
    user = await createTestUser()
  }, 30_000)

  afterAll(async () => {
    await deleteTestUser(user.id)
  })

  it('triggers a successful and a forced-failure request', async () => {
    successPath = await uploadFixture(user, 'name-leak-test.png')
    const ok = await invokeFunction(user, 'analyze-profile-photos', { paths: [successPath] })
    expect(ok.status).toBe(200)

    errorPath = await uploadFixture(user, 'name-leak-test.png')
    const failed = await invokeFunction(
      user,
      'analyze-profile-photos',
      { paths: [errorPath] },
      { forceError: true }
    )
    expect(failed.status).toBe(500)
  })

  it('logs contain no base64 image data or storage URLs, for either path', async () => {
    await new Promise((r) => setTimeout(r, 15_000))
    const logs = await queryFunctionLogs(5)

    const withBase64 = logs.filter((l) => BASE64_RUN.test(l.event_message))
    const withStorageUrl = logs.filter((l) => STORAGE_URL.test(l.event_message))
    const withEitherPath = logs.filter(
      (l) => l.event_message.includes(successPath) || l.event_message.includes(errorPath)
    )

    expect(withBase64, 'no log line should contain a base64-looking run').toEqual([])
    expect(withStorageUrl, 'no log line should contain a storage object URL').toEqual([])
    expect(withEitherPath, 'no log line should contain the raw screenshot path').toEqual([])
  }, 30_000)
})
