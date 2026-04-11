import {
  HttpApp,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform'
import { Effect, Option, Redacted } from 'effect'
import { createHash } from 'node:crypto'

import { type RateLimiter } from './auth/rateLimit.js'

const FALLBACK_IP_BUCKET = 'unknown'

const extractForwardedIp = (headerValue: string): string | null => {
  const first = headerValue.split(',')[0]?.trim()
  return first && first.length > 0 ? first : null
}

const extractClientIp = (
  headers: Readonly<Record<string, string>>,
): string => {
  const flyClientIp = Option.fromNullable(headers['fly-client-ip'])
  if (Option.isSome(flyClientIp)) {
    return flyClientIp.value
  }
  const forwardedFor = Option.fromNullable(headers['x-forwarded-for'])
  if (Option.isSome(forwardedFor)) {
    return extractForwardedIp(forwardedFor.value) ?? FALLBACK_IP_BUCKET
  }
  return FALLBACK_IP_BUCKET
}

const hashIpForAudit = (
  ip: string,
  salt: Redacted.Redacted<string>,
): string =>
  createHash('sha256')
    .update(Redacted.value(salt))
    .update(':')
    .update(ip)
    .digest('base64url')
    .slice(0, 16)

export type RequestContextMiddlewareDeps = Readonly<{
  rpcRateLimiter: RateLimiter
  auditIpSalt: Redacted.Redacted<string>
}>

export const makeRequestContextMiddleware =
  (deps: RequestContextMiddlewareDeps) =>
  <E, R>(app: HttpApp.Default<E, R>): HttpApp.Default<E, R> =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const ip = extractClientIp(request.headers)
      const ipHash = hashIpForAudit(ip, deps.auditIpSalt)

      const decision = yield* deps.rpcRateLimiter.check(`rpc:${ip}`)
      if (decision._tag === 'Denied') {
        yield* Effect.logWarning('rpc_rate_limited', { ipHash })
        return HttpServerResponse.text('rate limited', {
          status: 429,
          headers: {
            'retry-after': String(decision.retryAfterSeconds),
          },
        })
      }

      return yield* app.pipe(Effect.annotateLogs({ ipHash }))
    })
