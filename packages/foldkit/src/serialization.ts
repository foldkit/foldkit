import {
  Array,
  Cause,
  Data,
  Effect,
  Exit,
  Option,
  Result,
  Schema,
} from 'effect'

/** @internal Failure of a Foldkit serialization boundary whose Codec did not fail with a Schema validation error. */
export class SerializationError extends Data.TaggedError('SerializationError')<
  Readonly<{
    boundary: string
    cause: Cause.Cause<Schema.SchemaError>
    message: string
  }>
> {}

const requestAsyncFiberInterruption = (
  cause: Cause.Cause<Schema.SchemaError>,
): void => {
  for (const reason of cause.reasons) {
    if (Cause.isDieReason(reason) && Cause.isAsyncFiberError(reason.defect)) {
      reason.defect.fiber.interruptUnsafe()
    }
  }
}

const schemaErrorOf = (
  cause: Cause.Cause<Schema.SchemaError>,
): Option.Option<Schema.SchemaError> => {
  const firstReason = Array.head(cause.reasons)
  if (
    Option.isSome(firstReason) &&
    Cause.isFailReason(firstReason.value) &&
    Schema.isSchemaError(firstReason.value.error) &&
    Array.every(
      cause.reasons,
      reason =>
        Cause.isFailReason(reason) && Schema.isSchemaError(reason.error),
    )
  ) {
    return Option.some(firstReason.value.error)
  }

  return Option.none()
}

/**
 * @internal Runs an already-created Schema parser at a synchronous,
 * service-free Foldkit serialization boundary. Before returning an asynchronous
 * failure, it requests interruption of the suspended parser fiber. Cooperative
 * cleanup runs immediately, but uninterruptible regions and asynchronous
 * finalizers can defer it. Non-cooperative external Promise work can still
 * finish, but no later outcome is admitted by this completed boundary call.
 */
export const run = <A>(
  parser: Effect.Effect<A, Schema.SchemaError, never>,
  boundary: string,
): Result.Result<A, Schema.SchemaError | SerializationError> => {
  const exit = Effect.runSyncExit(parser)
  if (Exit.isSuccess(exit)) {
    return Result.succeed(exit.value)
  }

  requestAsyncFiberInterruption(exit.cause)

  const maybeSchemaError = schemaErrorOf(exit.cause)
  if (Option.isSome(maybeSchemaError)) {
    return Result.fail(maybeSchemaError.value)
  }

  return Result.fail(
    new SerializationError({
      boundary,
      cause: exit.cause,
      message:
        `[foldkit] ${boundary}: The Codec must complete synchronously ` +
        `without Services. ${Cause.pretty(exit.cause)}`,
    }),
  )
}
