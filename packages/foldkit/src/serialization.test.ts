import {
  Cause,
  Context,
  Effect,
  Exit,
  Option,
  Result,
  Schema,
  SchemaTransformation,
} from 'effect'
import { describe, expect, it } from 'vitest'

import { SerializationError, run } from './serialization.js'

const effectString = (decode: (value: string) => Effect.Effect<string>) =>
  Schema.String.pipe(
    Schema.decodeTo(
      Schema.String,
      SchemaTransformation.transformEffect({
        decode,
        encode: Effect.succeed,
      }),
    ),
  )

describe('serialization boundary', () => {
  it('runs a synchronous effectful transformation', () => {
    const Uppercase = effectString(value => Effect.succeed(value.toUpperCase()))

    const result = run(
      Schema.decodeEffect(Uppercase)('foldkit'),
      'test Model decode',
    )

    expect(result).toEqual(Result.succeed('FOLDKIT'))
  })

  it('keeps parser construction passive', () => {
    let decodeCount = 0
    const Counted = effectString(value =>
      Effect.sync(() => {
        decodeCount = decodeCount + 1
        return value
      }),
    )

    expect(decodeCount).toBe(0)
    const parser = Schema.decodeEffect(Counted)('value')
    expect(decodeCount).toBe(0)

    expect(run(parser, 'test Message decode')).toEqual(Result.succeed('value'))
    expect(decodeCount).toBe(1)
  })

  it('preserves Schema validation failures', () => {
    const result = run(
      Schema.decodeUnknownEffect(Schema.Number)('not a number'),
      'test Model decode',
    )

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(Schema.isSchemaError(result.failure)).toBe(true)
      expect(result.failure).not.toBeInstanceOf(SerializationError)
    }
  })

  it('rejects a Promise transformation and prevents its continuation', async () => {
    let didContinue = false
    const Async = effectString(value =>
      Effect.promise(() => Promise.resolve(value)).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            didContinue = true
          }),
        ),
      ),
    )

    const result = run(
      Schema.decodeEffect(Async)('value'),
      'test Message decode',
    )

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(SerializationError)
      expect(result.failure.message).toContain(
        'The Codec must complete synchronously without Services',
      )
      expect(result.failure.message).toContain(
        'An asynchronous Effect was executed with Effect.runSync',
      )
    }

    await Promise.resolve()
    await Promise.resolve()
    expect(didContinue).toBe(false)
  })

  it('interrupts a suspended parser and releases its resources', () => {
    let acquireCount = 0
    let cancelCount = 0
    let releaseCount = 0
    const Suspended = effectString(value =>
      Effect.scoped(
        Effect.acquireRelease(
          Effect.sync(() => {
            acquireCount = acquireCount + 1
          }),
          () =>
            Effect.sync(() => {
              releaseCount = releaseCount + 1
            }),
        ).pipe(
          Effect.flatMap(() =>
            Effect.callback<string>(() =>
              Effect.sync(() => {
                cancelCount = cancelCount + 1
              }),
            ),
          ),
          Effect.as(value),
        ),
      ),
    )

    const result = run(
      Schema.decodeEffect(Suspended)('value'),
      'test Model encode',
    )

    expect(Result.isFailure(result)).toBe(true)
    expect(acquireCount).toBe(1)
    expect(cancelCount).toBe(1)
    expect(releaseCount).toBe(1)
  })

  it('rejects an uninterruptible suspension without admitting its later value', async () => {
    let resolveParser: ((value: string) => void) | undefined
    let completedValue = Option.none<string>()
    let releaseCount = 0
    const pendingValue = new Promise<string>(resolve => {
      resolveParser = resolve
    })
    const Uninterruptible = effectString(value =>
      Effect.scoped(
        Effect.acquireRelease(Effect.void, () =>
          Effect.sync(() => {
            releaseCount = releaseCount + 1
          }),
        ).pipe(
          Effect.flatMap(() =>
            Effect.uninterruptible(
              Effect.promise(() => pendingValue).pipe(
                Effect.tap(completed =>
                  Effect.sync(() => {
                    completedValue = Option.some(completed)
                  }),
                ),
              ),
            ),
          ),
          Effect.as(value),
        ),
      ),
    )

    const result = run(
      Schema.decodeEffect(Uninterruptible)('value'),
      'test Model decode',
    )

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isSuccess(result)) {
      throw new Error('Expected the uninterruptible parser to be rejected')
    }
    if (!(result.failure instanceof SerializationError)) {
      throw result.failure
    }
    const defect = Cause.findDefect(result.failure.cause)
    if (Result.isFailure(defect) || !Cause.isAsyncFiberError(defect.success)) {
      throw new Error('Expected an asynchronous parser fiber')
    }
    const parserFiber = defect.success.fiber

    expect(completedValue).toEqual(Option.none())
    expect(releaseCount).toBe(0)

    if (resolveParser === undefined) {
      throw new Error('Expected the parser Promise to be registered')
    }
    resolveParser('late value')
    await pendingValue
    await Promise.resolve()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(completedValue).toEqual(Option.some('late value'))
    expect(releaseCount).toBe(1)
    const parserExit = parserFiber.pollUnsafe()
    expect(parserExit).toBeDefined()
    if (parserExit === undefined) {
      throw new Error('Expected the parser fiber to have exited')
    }
    expect(Exit.isFailure(parserExit)).toBe(true)
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(SerializationError)
    }
  })

  it('rejects a missing Service erased from the parser type', () => {
    class Prefix extends Context.Service<Prefix, Readonly<{ value: string }>>()(
      'SerializationTest/Prefix',
    ) {}

    const ServiceString = Schema.String.pipe(
      Schema.decodeTo(
        Schema.String,
        SchemaTransformation.transformEffect({
          decode: value =>
            Effect.map(Prefix, prefix => `${prefix.value}${value}`),
          encode: Effect.succeed,
        }),
      ),
    )
    const ErasedServiceString = Schema.make<
      Schema.Codec<string, string, never, never>
    >(ServiceString.ast)

    const result = run(
      Schema.decodeEffect(ErasedServiceString)('value'),
      'test Message decode',
    )

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(SerializationError)
      expect(result.failure.message).toContain(
        'The Codec must complete synchronously without Services',
      )
      expect(result.failure.message).toContain(
        'Service not found: SerializationTest/Prefix',
      )
    }
  })

  it('reports unexpected defects as non-Schema causes', () => {
    const Defective = effectString(() =>
      Effect.die(new Error('serialization exploded')),
    )

    const result = run(
      Schema.decodeEffect(Defective)('value'),
      'test Model decode',
    )

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(SerializationError)
      expect(result.failure.message).toContain('serialization exploded')
      expect(result.failure.message).not.toContain('The Codec was asynchronous')
      if (result.failure instanceof SerializationError) {
        expect(Cause.hasDies(result.failure.cause)).toBe(true)
      }
    }
  })

  it('round trips Option and Date through a JSON Codec', () => {
    const Model = Schema.Struct({
      maybeStartedAt: Schema.Option(Schema.Date),
    })
    const JsonModel = Schema.toCodecJson(Model)
    const model = Model.make({
      maybeStartedAt: Option.some(new Date('2026-11-05T12:00:00.000Z')),
    })

    const encoded = run(
      Schema.encodeEffect(JsonModel)(model),
      'test Model encode',
    )
    expect(Result.isSuccess(encoded)).toBe(true)
    if (Result.isFailure(encoded)) {
      throw encoded.failure
    }

    const decoded = run(
      Schema.decodeEffect(JsonModel)(encoded.success),
      'test Model decode',
    )
    expect(decoded).toEqual(Result.succeed(model))
  })
})
