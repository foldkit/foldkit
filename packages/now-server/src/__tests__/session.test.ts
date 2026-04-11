import { UnauthorizedError } from '@foldkit/now-shared'
import { Effect, Exit, Redacted } from 'effect'
import { describe, expect, it } from 'vitest'

import { issueSessionToken, verifySessionToken } from '../auth/session.js'

const SECRET = Redacted.make('test-secret-do-not-use-in-production')
const OTHER_SECRET = Redacted.make('different-secret')

describe('session tokens', () => {
  it('issues a token that verifies against the same secret', async () => {
    const issued = await Effect.runPromise(
      issueSessionToken('admin', SECRET, 300),
    )
    const payload = await Effect.runPromise(
      verifySessionToken(issued.token, SECRET),
    )
    expect(payload.adminId).toBe('admin')
    expect(payload.exp).toBeGreaterThan(payload.iat)
  })

  it('rejects a token signed with a different secret', async () => {
    const issued = await Effect.runPromise(
      issueSessionToken('admin', SECRET, 300),
    )
    const exit = await Effect.runPromiseExit(
      verifySessionToken(issued.token, OTHER_SECRET),
    )
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      const error = exit.cause._tag === 'Fail' ? exit.cause.error : null
      expect(error).toBeInstanceOf(UnauthorizedError)
    }
  })

  it('rejects a token with a tampered payload', async () => {
    const issued = await Effect.runPromise(
      issueSessionToken('admin', SECRET, 300),
    )
    const [encodedPayload, signature] = issued.token.split('.')
    expect(encodedPayload).toBeDefined()
    expect(signature).toBeDefined()
    const tamperedPayload = Buffer.from(
      JSON.stringify({ adminId: 'attacker', iat: 0, exp: 9999999999 }),
    ).toString('base64url')
    const tamperedToken = `${tamperedPayload}.${signature}`

    const exit = await Effect.runPromiseExit(
      verifySessionToken(tamperedToken, SECRET),
    )
    expect(Exit.isFailure(exit)).toBe(true)
  })

  it('rejects an expired token', async () => {
    const issued = await Effect.runPromise(
      issueSessionToken('admin', SECRET, -1),
    )
    const exit = await Effect.runPromiseExit(
      verifySessionToken(issued.token, SECRET),
    )
    expect(Exit.isFailure(exit)).toBe(true)
  })

  it('rejects a malformed token', async () => {
    const exit = await Effect.runPromiseExit(
      verifySessionToken('not-a-valid-token', SECRET),
    )
    expect(Exit.isFailure(exit)).toBe(true)
  })

  it('rejects an empty token', async () => {
    const exit = await Effect.runPromiseExit(verifySessionToken('', SECRET))
    expect(Exit.isFailure(exit)).toBe(true)
  })

  it('rejects a token with extra separators', async () => {
    const exit = await Effect.runPromiseExit(
      verifySessionToken('a.b.c', SECRET),
    )
    expect(Exit.isFailure(exit)).toBe(true)
  })
})
