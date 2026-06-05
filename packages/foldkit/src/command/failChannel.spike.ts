import { Effect, Predicate, Schema } from 'effect'

/**
 * SPIKE: error channel as Messages.
 *
 * Prototypes the proposal from the Foldkit Effect stream: let a Command fail
 * with a declared error Message via `Effect.fail(SomeMessage(...))` instead of
 * threading the failure back through `Effect.catch(() => Effect.succeed(...))`.
 *
 * This file is a standalone vertical slice, not wired into the real
 * `Command.define` or `runtime.ts`. It mirrors their signatures so the call
 * site and the runtime mechanism read the way they would in production. The
 * two integration points are flagged with INTEGRATION comments.
 */

// MESSAGE TAG

/** Reads the `_tag` literal off an `m()` message schema. The real runtime
 *  would compute this once per declared error at `define` time. */
const messageTag = (schema: Schema.Top): string => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const fields = (schema as unknown as { fields: { _tag: { ast: unknown } } })
    .fields
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const literal = (fields._tag.ast as { literal: string }).literal
  return literal
}

// FALLIBLE COMMAND

/** A Command whose effect's error channel is a union of declared error
 *  Messages. Carries `declaredErrorTags` so the runtime can tell a declared
 *  failure (route to the message queue) from a defect (crash). */
export type FallibleCommand<
  SuccessMessage,
  ErrorMessage,
  R = never,
> = Readonly<{
  name: string
  args?: Record<string, unknown>
  effect: Effect.Effect<SuccessMessage, ErrorMessage, R>
  declaredErrorTags: ReadonlySet<string>
}>

/** A callable Fallible Command definition. Call with the declared args to
 *  produce a {@link FallibleCommand} instance. */
export interface FallibleCommandDefinition<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  Success extends Schema.Top,
  Errors extends ReadonlyArray<Schema.Top>,
  R,
> {
  readonly name: Name;
  (
    args: Schema.Schema.Type<Schema.Struct<Fields>>,
  ): FallibleCommand<
    Schema.Schema.Type<Success>,
    Schema.Schema.Type<Errors[number]>,
    R
  >
}

/**
 * INTEGRATION (define): this is the new `Command.define` form. Today's
 * variadic `define(name, args, ...results)` lists only success Messages and
 * forces the effect to `succeed` with one of them. Splitting results into
 * `{ success, errors }` lets the effect builder `Effect.fail` a declared error
 * Message, and constrains its error channel to exactly that set at the type
 * level.
 *
 * @example
 * ```ts
 * const FetchWeather = defineFallible(
 *   'FetchWeather',
 *   { zipCode: S.String },
 *   { success: SucceededFetchWeather, errors: [WeatherNotFound, WeatherRateLimited] },
 * )(({ zipCode }) =>
 *   Effect.gen(function* () {
 *     if (isUnknown(zipCode)) return yield* Effect.fail(WeatherNotFound({ zipCode }))
 *     return SucceededFetchWeather({ tempF: 72 })
 *   }),
 * )
 * ```
 */
export const defineFallible =
  <
    const Name extends string,
    Fields extends Schema.Struct.Fields,
    Success extends Schema.Top,
    Errors extends ReadonlyArray<Schema.Top>,
  >(
    name: Name,
    _args: Fields,
    results: Readonly<{ success: Success; errors: Errors }>,
  ) =>
  <R>(
    builder: (
      args: Schema.Schema.Type<Schema.Struct<Fields>>,
    ) => Effect.Effect<
      Schema.Schema.Type<Success>,
      Schema.Schema.Type<Errors[number]>,
      R
    >,
  ): FallibleCommandDefinition<Name, Fields, Success, Errors, R> => {
    const declaredErrorTags: ReadonlySet<string> = new Set(
      results.errors.map(messageTag),
    )

    const definition = (
      args: Schema.Schema.Type<Schema.Struct<Fields>>,
    ): FallibleCommand<
      Schema.Schema.Type<Success>,
      Schema.Schema.Type<Errors[number]>,
      R
    > => ({
      name,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      args: args as Record<string, unknown>,
      effect: builder(args),
      declaredErrorTags,
    })

    Object.defineProperty(definition, 'name', {
      value: name,
      configurable: true,
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return definition as FallibleCommandDefinition<
      Name,
      Fields,
      Success,
      Errors,
      R
    >
  }

// RUNTIME

const isDeclaredErrorMessage = (
  declaredErrorTags: ReadonlySet<string>,
  error: unknown,
): boolean =>
  Predicate.isObject(error) &&
  Predicate.hasProperty(error, '_tag') &&
  Predicate.isString(error._tag) &&
  declaredErrorTags.has(error._tag)

/**
 * INTEGRATION (runtime): wraps `command.effect` before the existing
 * `Effect.flatMap(enqueueNormal)` at runtime.ts:778 (init) and runtime.ts:912
 * (update). A declared error Message moves from the error channel into the
 * success channel so it enqueues like any other Message. Anything else (a
 * foreign error that leaked through an `any`, a thrown Error) becomes a defect
 * and hits the existing `crashWith` path, exactly as an unhandled failure does
 * today. Interruption is a `Cause`, not a failure, so interrupted Commands
 * never manufacture a Message.
 */
export const runCommandToMessage = <SuccessMessage, ErrorMessage, R>(
  command: FallibleCommand<SuccessMessage, ErrorMessage, R>,
): Effect.Effect<SuccessMessage | ErrorMessage, never, R> =>
  command.effect.pipe(
    Effect.catch(
      (error): Effect.Effect<SuccessMessage | ErrorMessage, never, R> =>
        isDeclaredErrorMessage(command.declaredErrorTags, error)
          ? /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            Effect.succeed(error as ErrorMessage)
          : Effect.die(error),
    ),
  )
