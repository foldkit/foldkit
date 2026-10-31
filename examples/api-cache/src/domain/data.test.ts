import { Effect, Exit } from 'effect'
import { expect, test } from 'vitest'

import { FLAKY_POST_ID, fetchPostDetail } from './data'

test('a regular post resolves with its detail', async () => {
  const detail = await Effect.runPromise(fetchPostDetail('model-is-the-cache'))

  expect(detail.title).toBe('The Model Is the Cache')
})

test('the flaky post fails on the first fetch and succeeds on retry', async () => {
  const firstAttempt = await Effect.runPromiseExit(
    fetchPostDetail(FLAKY_POST_ID),
  )

  expect(Exit.isFailure(firstAttempt)).toBe(true)

  const secondAttempt = await Effect.runPromise(fetchPostDetail(FLAKY_POST_ID))

  expect(secondAttempt.id).toBe(FLAKY_POST_ID)
})

test('an unknown post id fails', async () => {
  const attempt = await Effect.runPromiseExit(fetchPostDetail('does-not-exist'))

  expect(Exit.isFailure(attempt)).toBe(true)
})
