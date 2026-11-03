import { Context, Deferred, Effect, Fiber, Option, Schema, pipe } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as ModelPreservationBridge from './modelPreservationBridge.js'
import type { MakeRuntimeReturn } from './runtime.js'
import { runtimeInternals } from './runtime.js'
import { __startProgram, embed, run } from './start.js'

const Flags = Schema.Struct({ start: Schema.Number })
type Flags = typeof Flags.Type

class FlagsService extends Context.Service<
  FlagsService,
  Readonly<{ start: number }>
>()('RuntimeStartTest/FlagsService') {}

class ExtraService extends Context.Service<
  ExtraService,
  Readonly<{ extra: true }>
>()('RuntimeStartTest/ExtraService') {}

declare const flaggedProgram: MakeRuntimeReturn<
  undefined,
  Flags,
  FlagsService | ExtraService,
  'Application'
>

declare const programWithoutFlagsService: MakeRuntimeReturn<
  undefined,
  Flags,
  ExtraService,
  'Application'
>

const checkRunTypes = (): void => {
  const flags = Effect.map(FlagsService, ({ start }) => ({ start }))

  run(flaggedProgram, { flags })
  pipe(flaggedProgram, run({ flags }))

  // @ts-expect-error A fresh boot of a Flags application requires a Flags Effect.
  run(flaggedProgram)

  const wrongFlags = Effect.map(FlagsService, ({ start }) => ({
    start: `${start}`,
  }))
  // @ts-expect-error The Flags value must match the application's Flags Schema.
  pipe(flaggedProgram, run({ flags: wrongFlags }))

  pipe(
    programWithoutFlagsService,
    // @ts-expect-error The application must provide every service required by its Flags Effect.
    run({ flags }),
  )
}

void checkRunTypes

let nextRuntimeId = 0

const makeProgram = (onStart: (flags: unknown) => void) => {
  nextRuntimeId += 1

  const program = {
    runtimeId: `runtime-run-${nextRuntimeId}`,
    start: () => Effect.void,
    ports: undefined,
  }

  runtimeInternals.set(program, {
    startWith: (_maybeConnector, _preservedModel, _bootMode, flags) =>
      Effect.sync(() => onStart(flags)),
    startWithApplicationLayer: () => Effect.void,
    kind: 'Application',
    embedLifecycle: {
      isEmbedActive: false,
      maybeActiveFiber: Option.none(),
    },
  })

  return program
}

afterEach(() => vi.restoreAllMocks())

describe('run', () => {
  it('defers a data-last start until it receives the program', async () => {
    const starts: Array<unknown> = []
    const program = makeProgram(flags => starts.push(flags))
    const flags = Effect.succeed({ start: 1 })

    const runWithFlags = run({ flags })

    expect(starts).toEqual([])

    runWithFlags(program)

    await vi.waitFor(() => {
      expect(starts).toEqual([flags])
    })
  })

  it('starts direct and data-last calls through the same path', async () => {
    const starts: Array<unknown> = []
    const directProgram = makeProgram(flags => starts.push(flags))
    const dataLastProgram = makeProgram(flags => starts.push(flags))
    const flags = Effect.succeed({ start: 2 })

    run(directProgram, { flags })
    pipe(dataLastProgram, run({ flags }))

    await vi.waitFor(() => {
      expect(starts).toEqual([flags, flags])
    })
  })

  it('keeps an invalid structural program on the direct boot path', async () => {
    const program = {
      runtimeId: 'invalid-structural-runtime',
      start: () => Effect.void,
      ports: undefined,
      flags: Effect.succeed({ start: 3 }),
    }

    const result = run(program)

    expect(result).toBeUndefined()
    await expect(
      Effect.runPromise(__startProgram(program, undefined, 'Fresh')),
    ).rejects.toThrow(
      'Runtime boot expects a program created by makeApplication or makeElement',
    )
  })
})

describe('embed teardown', () => {
  it('does not start a disposed successor after its predecessor has finished', async () => {
    vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
      Effect.succeed(undefined),
    )
    const events: Array<string> = []
    const program = makeProgram(() => undefined)
    const internals = runtimeInternals.get(program)

    if (internals === undefined) {
      throw new Error('Expected registered Program internals.')
    }

    runtimeInternals.set(program, {
      ...internals,
      startWith: () =>
        Effect.scoped(
          Effect.acquireRelease(
            Effect.sync(() => events.push('started')),
            () => Effect.sync(() => events.push('released')),
          ).pipe(Effect.andThen(Effect.never)),
        ),
    })

    const first = embed(program)
    await vi.waitFor(() => expect(events).toEqual(['started']))
    await first.dispose()

    const second = embed(program)
    await second.dispose()

    expect(events).toEqual(['started', 'released'])
  })

  it('awaits the full predecessor chain when intermediate embeds are disposed before startup', async () => {
    const events: Array<string> = []
    const releaseGate = Deferred.makeUnsafe<void>()
    const program = makeProgram(() => undefined)
    const internals = runtimeInternals.get(program)

    if (internals === undefined) {
      throw new Error('Expected registered Program internals.')
    }

    runtimeInternals.set(program, {
      ...internals,
      startWith: () =>
        Effect.scoped(
          Effect.acquireRelease(
            Effect.sync(() => events.push('acquired')),
            () =>
              Effect.sync(() => events.push('release started')).pipe(
                Effect.andThen(Deferred.await(releaseGate)),
                Effect.andThen(Effect.sync(() => events.push('released'))),
              ),
          ).pipe(Effect.andThen(Effect.never)),
        ),
    })

    const first = embed(program)
    await vi.waitFor(() => expect(events).toEqual(['acquired']))
    const firstDisposal = first.dispose()
    await vi.waitFor(() =>
      expect(events).toEqual(['acquired', 'release started']),
    )

    const second = embed(program)
    const secondDisposal = second.dispose().then(() => {
      events.push('second disposed')
    })
    const third = embed(program)
    const thirdDisposal = third.dispose().then(() => {
      events.push('third disposed')
    })

    try {
      const activeFiber = Option.getOrThrow(
        internals.embedLifecycle.maybeActiveFiber,
      )
      await Effect.runPromise(Fiber.await(activeFiber))
      await new Promise<void>(resolve => queueMicrotask(resolve))
      await new Promise<void>(resolve => queueMicrotask(resolve))

      expect(events).toEqual(['acquired', 'release started'])
    } finally {
      Deferred.doneUnsafe(releaseGate, Effect.void)
      await Promise.all([firstDisposal, secondDisposal, thirdDisposal])
    }

    expect(events).toEqual([
      'acquired',
      'release started',
      'released',
      'second disposed',
      'third disposed',
    ])
  })
})
