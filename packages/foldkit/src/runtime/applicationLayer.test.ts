import { Cause, Context, Effect, Exit, Fiber, Layer, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import type { HtmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Application from './application.js'
import { makeApplication } from './makeApplication.js'
import type { ElementConfigWithFlags } from './makeElement.js'
import { run } from './start.js'

const Message = defineMessageUnion({
  ClickedReadValue: {},
  SucceededReadValue: { value: Schema.String },
})
type Message = typeof Message.Type

const Model = Schema.Struct({ label: Schema.String })
type Model = typeof Model.Type

const Flags = Schema.Struct({ initialLabel: Schema.String })
type Flags = typeof Flags.Type

type ValueShape = Readonly<{ value: string }>

class ValueService extends Context.Service<ValueService, ValueShape>()(
  'ValueService',
) {}

const ReadValue = Command.define('ReadValue', {
  messages: [Message.SucceededReadValue],
  execute: Effect.map(ValueService, ({ value }) =>
    Message.SucceededReadValue({ value }),
  ),
})

const update = (model: Model, message: Message) =>
  Message.match(message, {
    ClickedReadValue: () => ({ model, commands: [ReadValue()] }),
    SucceededReadValue: ({ value }) => ({
      model: modifyFields(model, { label: label => `${label} ${value}` }),
    }),
  })

const documentView = (model: Model, h: HtmlBuilder<Message>) => ({
  title: '',
  body: h.div([], [model.label]),
})

let container: HTMLElement

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const awaitBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

describe('Application Layers', () => {
  it('builds eagerly and releases at runtime teardown', async () => {
    let buildCount = 0
    let releaseCount = 0

    const ValueLive = Layer.effect(
      ValueService,
      Effect.acquireRelease(
        Effect.sync((): ValueShape => {
          buildCount += 1
          return { value: 'unused' }
        }),
        () =>
          Effect.sync(() => {
            releaseCount += 1
          }),
      ),
    )
    const element = Application.makeElement({
      Model,
      init: () => ({ model: { label: 'ready' } }),
      update,
      view: (model, h) => h.div([], [model.label]),
      container,
    })
    const provided = Application.provide(element, ValueLive)
    const fiber = Effect.runFork(provided.start())

    try {
      await awaitBodyText('ready')
      expect(buildCount).toBe(1)
      expect(releaseCount).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }

    expect(releaseCount).toBe(1)
  })

  it('shares one Layer build with Flags and Commands', async () => {
    let buildCount = 0
    let releaseCount = 0

    const ValueLive = Layer.effect(
      ValueService,
      Effect.acquireRelease(
        Effect.sync((): ValueShape => {
          buildCount += 1
          return { value: `build-${buildCount}` }
        }),
        () =>
          Effect.sync(() => {
            releaseCount += 1
          }),
      ),
    )
    const element = Application.makeElement({
      Model,
      Flags,
      flags: Effect.map(ValueService, ({ value }) => ({
        initialLabel: `flags-${value}`,
      })),
      init: ({ initialLabel }) => ({
        model: { label: initialLabel },
        commands: [ReadValue()],
      }),
      update,
      view: (model, h) => h.div([], [model.label]),
      container,
    })
    const provided = Application.provide(element, ValueLive)
    const fiber = Effect.runFork(provided.start())

    try {
      await awaitBodyText('flags-build-1 build-1')
      expect(buildCount).toBe(1)
      expect(releaseCount).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }

    expect(releaseCount).toBe(1)
  })

  it('builds the Layer but skips Flags and init for a preserved Model', async () => {
    let buildCount = 0
    let releaseCount = 0
    let flagsRunCount = 0
    let initRunCount = 0

    const ValueLive = Layer.effect(
      ValueService,
      Effect.acquireRelease(
        Effect.sync((): ValueShape => {
          buildCount += 1
          return { value: 'fresh' }
        }),
        () =>
          Effect.sync(() => {
            releaseCount += 1
          }),
      ),
    )
    const element = Application.makeElement({
      Model,
      Flags,
      flags: Effect.gen(function* () {
        flagsRunCount += 1
        const { value } = yield* ValueService
        return { initialLabel: value }
      }),
      init: ({ initialLabel }) => {
        initRunCount += 1
        return { model: { label: initialLabel } }
      },
      update: (model: Model) => ({ model }),
      view: (model, h) => h.div([], [model.label]),
      container,
    })
    const provided = Application.provide(element, ValueLive)
    const fiber = Effect.runFork(provided.start({ label: 'restored' }))

    try {
      await awaitBodyText('restored')
      expect(buildCount).toBe(1)
      expect(flagsRunCount).toBe(0)
      expect(initRunCount).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }

    expect(releaseCount).toBe(1)
  })

  it('runs Flags and init when a preserved Model cannot be decoded', async () => {
    let buildCount = 0
    let flagsRunCount = 0
    let initRunCount = 0

    const ValueLive = Layer.sync(ValueService, (): ValueShape => {
      buildCount += 1
      return { value: `build-${buildCount}` }
    })
    const element = Application.makeElement({
      Model,
      Flags,
      flags: Effect.gen(function* () {
        flagsRunCount += 1
        const { value } = yield* ValueService
        return { initialLabel: value }
      }),
      init: ({ initialLabel }) => {
        initRunCount += 1
        return { model: { label: initialLabel } }
      },
      update: (model: Model) => ({ model }),
      view: (model, h) => h.div([], [model.label]),
      container,
    })
    const provided = Application.provide(element, ValueLive)
    const fiber = Effect.runFork(provided.start({ notALabel: 0 }))

    try {
      await awaitBodyText('build-1')
      expect(buildCount).toBe(1)
      expect(flagsRunCount).toBe(1)
      expect(initRunCount).toBe(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('fails startup before Flags or the crash view when the Layer fails', async () => {
    const LAYER_BUILD_ERROR = 'application Layer failed to build'
    let flagsRunCount = 0

    const FailingApplicationLive = Layer.effect(
      ValueService,
      Effect.fail(new Error(LAYER_BUILD_ERROR)),
    )
    const element = Application.makeElement({
      Model,
      Flags,
      flags: Effect.gen(function* () {
        flagsRunCount += 1
        const { value } = yield* ValueService
        return { initialLabel: value }
      }),
      init: ({ initialLabel }) => ({ model: { label: initialLabel } }),
      update: (model: Model) => ({ model }),
      view: (model, h) => h.div([], [model.label]),
      crash: {
        view: (context, h) =>
          h.div([], [`Crash view: ${context.error.message}`]),
      },
      container,
    })
    const provided = Application.provide(element, FailingApplicationLive)
    const exit = await Effect.runPromiseExit(provided.start())

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(String(Cause.squash(exit.cause))).toContain(LAYER_BUILD_ERROR)
    }
    expect(flagsRunCount).toBe(0)
    expect(document.body.textContent).not.toContain('Crash view:')
  })
})

const checkApplicationLayerTypes = (): void => {
  const flagsNeedingService: Effect.Effect<Flags, never, ValueService> =
    Effect.map(ValueService, ({ value }) => ({ initialLabel: value }))

  const element = Application.makeElement({
    Model,
    Flags,
    flags: flagsNeedingService,
    init: ({ initialLabel }) => ({ model: { label: initialLabel } }),
    update: (model: Model) => ({ model }),
    view: (model, h) => h.div([], [model.label]),
    container,
  })

  // @ts-expect-error ValueService has not been provided.
  run(element)
  run(
    Application.provide(
      element,
      Layer.succeed(ValueService, { value: 'provided' }),
    ),
  )

  const rawApplication = makeApplication({
    Model,
    Flags,
    init: ({ initialLabel }) => ({ model: { label: initialLabel } }),
    update: (model: Model) => ({ model }),
    view: documentView,
    container,
  })
  // @ts-expect-error Raw Runtime constructors cannot supply application services to Flags.
  run(rawApplication, { flags: flagsNeedingService })

  const rawElementFlags = {
    Model,
    Flags,
    // @ts-expect-error Raw Runtime Elements accept only self-contained Flags Effects.
    flags: flagsNeedingService,
    init: ({ initialLabel }) => ({ model: { label: initialLabel } }),
    update: (model: Model) => ({ model }),
    view: (model, h) => h.div([], [model.label]),
    container,
  } satisfies ElementConfigWithFlags<Model, Message, Flags>

  void rawElementFlags
}

void checkApplicationLayerTypes
