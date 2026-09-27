import { Data, Effect, Match, Schema } from 'effect'
import type * as SqlError from 'effect/unstable/sql/SqlError'
import type { ServerResponse } from 'node:http'
import { json as readJson } from 'node:stream/consumers'
import type { Connect } from 'vite'

import { ItemsMutation } from '../src/domain/index.ts'
import { commitItemsMutation } from './commitItemsMutation.ts'
import { writeJson } from './http.ts'

class BadRequestError extends Data.TaggedError('BadRequestError')<{
  message: string
}> {}

const respond = (
  response: ServerResponse,
  status: number,
  body: unknown,
): Effect.Effect<void> => Effect.sync(() => writeJson(response, status, body))

const decodeMutation = (request: Connect.IncomingMessage) =>
  Effect.gen(function* () {
    const body = yield* Effect.tryPromise(() => readJson(request))
    return yield* Schema.decodeUnknownEffect(ItemsMutation)(body)
  }).pipe(
    Effect.mapError(
      () => new BadRequestError({ message: 'Invalid request body' }),
    ),
  )

const respondToSqlError = (
  response: ServerResponse,
  error: SqlError.SqlError,
) =>
  Match.value(error.reason).pipe(
    Match.tag('UniqueViolation', () =>
      respond(response, 409, { error: 'An item with that ID already exists' }),
    ),
    Match.tag('ConnectionError', () =>
      respond(response, 503, { error: 'Database unavailable' }),
    ),
    Match.orElse(() =>
      Effect.logError(error).pipe(
        Effect.andThen(
          respond(response, 500, { error: 'Something went wrong' }),
        ),
      ),
    ),
  )

export const handleItemsApiRequest = (
  request: Connect.IncomingMessage,
  response: ServerResponse,
) => {
  if (request.method !== 'POST') {
    return respond(response, 405, { error: 'Method not allowed' })
  }

  return Effect.gen(function* () {
    const mutation = yield* decodeMutation(request)
    const result = yield* commitItemsMutation(mutation)
    yield* respond(response, 200, result)
  }).pipe(
    Effect.catchTag('BadRequestError', error =>
      respond(response, 400, { error: error.message }),
    ),
    Effect.catchTag('SqlError', error => respondToSqlError(response, error)),
    Effect.catchTag('MissingTransactionIdError', error =>
      Effect.logError(error).pipe(
        Effect.andThen(
          respond(response, 500, { error: 'Something went wrong' }),
        ),
      ),
    ),
  )
}
