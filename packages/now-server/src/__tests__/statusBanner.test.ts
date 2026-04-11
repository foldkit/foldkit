import { StatusBanner } from '@foldkit/now-shared'
import { Effect, Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

const decode = S.decodeUnknown(StatusBanner)

const validPayload = {
  message: 'Building Foldkit',
  avatarUrl: 'https://github.com/devinjameson.png',
  profileHandle: '@devinjameson',
  profileUrl: 'https://x.com/devinjameson',
}

const expectAccepted = async (payload: unknown) => {
  const result = await Effect.runPromiseExit(decode(payload))
  expect(Exit.isSuccess(result)).toBe(true)
}

const expectRejected = async (payload: unknown) => {
  const result = await Effect.runPromiseExit(decode(payload))
  expect(Exit.isFailure(result)).toBe(true)
}

describe('StatusBanner schema', () => {
  it('accepts a valid payload', async () => {
    await expectAccepted(validPayload)
  })

  it('rejects messages longer than 160 characters', async () => {
    await expectRejected({ ...validPayload, message: 'x'.repeat(161) })
  })

  it('rejects empty messages', async () => {
    await expectRejected({ ...validPayload, message: '' })
  })

  it('rejects messages with control characters', async () => {
    await expectRejected({ ...validPayload, message: 'hello\u0000world' })
    await expectRejected({ ...validPayload, message: 'hello\nworld' })
  })

  it('rejects http avatar URLs', async () => {
    await expectRejected({
      ...validPayload,
      avatarUrl: 'http://github.com/devinjameson.png',
    })
  })

  it('rejects avatar URLs on non-allowlisted hosts', async () => {
    await expectRejected({
      ...validPayload,
      avatarUrl: 'https://attacker.example/img.png',
    })
  })

  it('accepts avatar URLs on allowlisted hosts', async () => {
    await expectAccepted({
      ...validPayload,
      avatarUrl: 'https://avatars.githubusercontent.com/u/1',
    })
  })

  it('rejects profile URLs on non-allowlisted hosts', async () => {
    await expectRejected({
      ...validPayload,
      profileUrl: 'https://attacker.example/@devin',
    })
  })

  it('accepts profile URLs on x.com, twitter.com, bsky.app, github.com', async () => {
    await expectAccepted({
      ...validPayload,
      profileUrl: 'https://twitter.com/devinjameson',
    })
    await expectAccepted({
      ...validPayload,
      profileUrl: 'https://bsky.app/profile/devinjameson.bsky.social',
    })
    await expectAccepted({
      ...validPayload,
      profileUrl: 'https://github.com/devinjameson',
    })
  })

  it('rejects handles missing @', async () => {
    await expectRejected({ ...validPayload, profileHandle: 'devinjameson' })
  })

  it('rejects handles with disallowed characters', async () => {
    await expectRejected({ ...validPayload, profileHandle: '@devin jameson' })
    await expectRejected({ ...validPayload, profileHandle: '@devin-jameson' })
  })

  it('rejects handles that are too long', async () => {
    await expectRejected({ ...validPayload, profileHandle: `@${'a'.repeat(31)}` })
  })

  it('rejects a URL parser exploit attempt', async () => {
    await expectRejected({
      ...validPayload,
      avatarUrl: 'not-a-url',
    })
  })

  it('rejects garbage types', async () => {
    await expectRejected({ ...validPayload, message: 42 })
    await expectRejected({ ...validPayload, avatarUrl: null })
  })
})
