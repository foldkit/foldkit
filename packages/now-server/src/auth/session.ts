import { UnauthorizedError } from '@foldkit/now-shared'
import { Effect, Redacted, Schema as S } from 'effect'
import { createHmac, timingSafeEqual } from 'node:crypto'

// INTERNAL

const SessionPayloadSchema = S.Struct({
  adminId: S.String,
  iat: S.Number,
  exp: S.Number,
})
export type SessionPayload = typeof SessionPayloadSchema.Type

const SESSION_TOKEN_SEPARATOR = '.'

const base64urlEncodeString = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url')

const base64urlDecodeString = (value: string): string =>
  Buffer.from(value, 'base64url').toString('utf8')

const computeSignature = (payload: string, secret: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url')

const isSignatureValid = (
  payload: string,
  providedSignature: string,
  secret: string,
): boolean => {
  const expected = computeSignature(payload, secret)
  const providedBuffer = Buffer.from(providedSignature, 'base64url')
  const expectedBuffer = Buffer.from(expected, 'base64url')
  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

// PUBLIC

export type IssuedSession = Readonly<{
  token: string
  expiresAtMillis: number
}>

export const issueSessionToken = (
  adminId: string,
  sessionSecret: Redacted.Redacted<string>,
  ttlSeconds: number,
): Effect.Effect<IssuedSession> =>
  Effect.sync(() => {
    const issuedAt = Math.floor(Date.now() / 1000)
    const expiresAt = issuedAt + ttlSeconds
    const payload: SessionPayload = { adminId, iat: issuedAt, exp: expiresAt }
    const encodedPayload = base64urlEncodeString(JSON.stringify(payload))
    const signature = computeSignature(
      encodedPayload,
      Redacted.value(sessionSecret),
    )
    const token = `${encodedPayload}${SESSION_TOKEN_SEPARATOR}${signature}`
    return { token, expiresAtMillis: expiresAt * 1000 }
  })

export const verifySessionToken = (
  token: string,
  sessionSecret: Redacted.Redacted<string>,
): Effect.Effect<SessionPayload, UnauthorizedError> =>
  Effect.gen(function* () {
    const parts = token.split(SESSION_TOKEN_SEPARATOR)
    if (parts.length !== 2) {
      return yield* Effect.fail(
        new UnauthorizedError({ message: 'malformed session token' }),
      )
    }
    const encodedPayload = parts[0]
    const providedSignature = parts[1]
    if (encodedPayload === undefined || providedSignature === undefined) {
      return yield* Effect.fail(
        new UnauthorizedError({ message: 'malformed session token' }),
      )
    }
    const signatureValid = isSignatureValid(
      encodedPayload,
      providedSignature,
      Redacted.value(sessionSecret),
    )
    if (!signatureValid) {
      return yield* Effect.fail(
        new UnauthorizedError({ message: 'invalid session signature' }),
      )
    }
    const payloadJson = yield* Effect.try({
      try: () => JSON.parse(base64urlDecodeString(encodedPayload)),
      catch: () =>
        new UnauthorizedError({ message: 'unparseable session payload' }),
    })
    const payload = yield* S.decodeUnknown(SessionPayloadSchema)(
      payloadJson,
    ).pipe(
      Effect.mapError(
        () => new UnauthorizedError({ message: 'malformed session payload' }),
      ),
    )
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (nowSeconds >= payload.exp) {
      return yield* Effect.fail(
        new UnauthorizedError({ message: 'session expired' }),
      )
    }
    return payload
  })
