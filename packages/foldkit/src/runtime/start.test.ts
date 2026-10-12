import { Context, Effect, Option, Schema, pipe } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import type { MakeRuntimeReturn } from './runtime.js'
import { runtimeInternals } from './runtime.js'
import { __startProgram, run } from './start.js'

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
