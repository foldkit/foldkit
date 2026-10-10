import {
  Cause,
  Context,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Schema,
  Stream,
} from 'effect'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest'

import * as Command from '../command/index.js'
import type { HtmlBuilder } from '../html/index.js'
import * as ManagedResource from '../managedResource/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Subscription from '../subscription/public.js'
import * as Update from '../update/index.js'
import * as Application from './application.js'
import { makeApplication } from './makeApplication.js'
import { makeElement } from './makeElement.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import { embed, run } from './start.js'

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

class DerivedService extends Context.Service<DerivedService, ValueShape>()(
  'DerivedService',
) {}

const ReadValue = Command.define('ReadValue', {
  messages: [Message.SucceededReadValue],
})

const ReadValueLayer = ReadValue.toLayer(
  Effect.succeed(() =>
    Effect.map(ValueService, ({ value }) =>
      Message.SucceededReadValue({ value }),
    ),
  ),
)

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedReadValue: () => ({ model, commands: [ReadValue()] }),
    SucceededReadValue: ({ value }) => ({
      model: modifyFields(model, { label: label => `${label} ${value}` }),
    }),
  }),
)

expectTypeOf<Update.RequirementsOf<typeof update>>().toEqualTypeOf<
  Command.Handler<'ReadValue'>
>()

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
  it('rejects concurrent embeds of variants provided from one Element', async () => {
    vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
      Effect.succeed(undefined),
    )
    const element = Application.makeElement({
      Model,
      init: () => ({ model: { label: 'ready' } }),
      update: (model: Model) => ({ model }),
      view: (model, h) => h.div([], [model.label]),
      container,
    })
    const first = Application.provide(element, Layer.empty)
    const second = Application.provide(element, Layer.empty)
    const firstHandle = embed(first)
    let secondHandle: ReturnType<typeof embed> | undefined

    try {
      await awaitBodyText('ready')
      expect(() => {
        secondHandle = embed(second)
      }).toThrow(/already embedded/)
    } finally {
      secondHandle?.dispose()
      firstHandle.dispose()
    }
  })

  it('sequences teardown before embedding another provided variant', async () => {
    vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
      Effect.succeed(undefined),
    )
    const releaseGate = Deferred.makeUnsafe<void>()
    const events: Array<string> = []
    const FirstLayer = Layer.effect(
      ValueService,
      Effect.acquireRelease(
        Effect.sync((): ValueShape => {
          events.push('first acquired')
          return { value: 'first' }
        }),
        () =>
          Effect.sync(() => {
            events.push('first release started')
          }).pipe(
            Effect.andThen(Deferred.await(releaseGate)),
            Effect.andThen(
              Effect.sync(() => {
                events.push('first released')
              }),
            ),
          ),
      ),
    )
    const SecondLayer = Layer.sync(ValueService, (): ValueShape => {
      events.push('second acquired')
      return { value: 'second' }
    })
    const element = Application.makeElement({
      Model,
      init: () => ({ model: { label: 'ready' } }),
      update: (model: Model) => ({ model }),
      view: (model, h) => h.div([], [model.label]),
      container,
    })
    const first = Application.provide(element, FirstLayer)
    const second = Application.provide(element, SecondLayer)
    const firstHandle = embed(first)

    await awaitBodyText('ready')
    expect(events).toEqual(['first acquired'])
    firstHandle.dispose()

    await vi.waitFor(() => {
      expect(events).toEqual(['first acquired', 'first release started'])
    })

    const secondHandle = embed(second)
    try {
      expect(events).toEqual(['first acquired', 'first release started'])

      Deferred.doneUnsafe(releaseGate, Effect.void)

      await vi.waitFor(() => {
        expect(events).toEqual([
          'first acquired',
          'first release started',
          'first released',
          'second acquired',
        ])
      })
    } finally {
      Deferred.doneUnsafe(releaseGate, Effect.void)
      secondHandle.dispose()
    }
  })

  it('builds sequential handler Layers with later service providers', async () => {
    let valueBuilds = 0
    let derivedBuilds = 0

    const ValueLayer = Layer.sync(ValueService, (): ValueShape => {
      valueBuilds += 1
      return { value: 'value' }
    })
    const DerivedLayer = Layer.effect(
      DerivedService,
      Effect.map(ValueService, ({ value }): ValueShape => {
        derivedBuilds += 1
        return { value: `${value}-derived` }
      }),
    )
    const application = Application.make({
      Model,
      Flags,
      init: ({ initialLabel }) => ({
        model: Model.make({ label: initialLabel }),
      }),
      update: (model: Model, _message: Message) => ({ model }),
      view: documentView,
      container,
    })
    const withDerived = Application.provide(application, DerivedLayer)
    const provided = Application.provide(withDerived, ValueLayer)
    const handle = embed(provided, {
      flags: Effect.gen(function* () {
        const value = yield* ValueService
        const derived = yield* DerivedService
        return { initialLabel: `${value.value} ${derived.value}` }
      }),
    })

    try {
      await awaitBodyText('value value-derived')
      expect(valueBuilds).toBe(1)
      expect(derivedBuilds).toBe(1)
    } finally {
      handle.dispose()
    }
  })

  it('provides a shared service to a Flags-only page application', async () => {
    let buildCount = 0
    let releaseCount = 0

    const ValueLayer = Layer.effect(
      ValueService,
      Effect.acquireRelease(
        Effect.sync((): ValueShape => {
          buildCount += 1
          return { value: 'from Layer' }
        }),
        () =>
          Effect.sync(() => {
            releaseCount += 1
          }),
      ),
    )
    const application = Application.make({
      Model,
      Flags,
      init: ({ initialLabel }) => ({
        model: Model.make({ label: initialLabel }),
      }),
      update: (model: Model, _message: Message) => ({ model }),
      view: documentView,
      container,
    })
    const provided = Application.provide(application, ValueLayer)
    const handle = embed(provided, {
      flags: Effect.map(ValueService, ({ value }) => ({
        initialLabel: value,
      })),
    })

    try {
      await awaitBodyText('from Layer')
      expect(buildCount).toBe(1)
      expect(releaseCount).toBe(0)
    } finally {
      handle.dispose()
    }

    await vi.waitFor(() => {
      expect(releaseCount).toBe(1)
    })
  })

  it('builds eagerly and releases at runtime teardown', async () => {
    let buildCount = 0
    let releaseCount = 0

    const ValueLayer = Layer.effect(
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
      update: (model: Model) => ({ model }),
      view: (model, h) => h.div([], [model.label]),
      container,
    })
    const provided = Application.provide(element, ValueLayer)
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

    const ValueLayer = Layer.effect(
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
    const provided = Application.provide(
      Application.provide(element, ReadValueLayer),
      ValueLayer,
    )
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

  it('shares one scoped service across Flags and Layer-backed runtime handlers', async () => {
    const LifecycleMessage = defineMessageUnion({
      CompletedChangePhase: {
        phase: Schema.Literals(['Restart', 'Stop']),
        value: Schema.String,
      },
    })
    type LifecycleMessage = typeof LifecycleMessage.Type

    const LifecycleModel = Schema.Struct({
      label: Schema.String,
      phase: Schema.Literals(['Initial', 'Restarted', 'Stopped']),
      commandRuns: Schema.Number,
    })
    type LifecycleModel = typeof LifecycleModel.Type

    const ChangePhase = Command.define('ChangePhase', {
      args: { phase: Schema.Literals(['Restart', 'Stop']) },
      messages: [LifecycleMessage.CompletedChangePhase],
    })
    const subscriptions = Subscription.make<LifecycleModel, LifecycleMessage>()(
      entry => ({
        phase: entry(
          'TrackApplicationPhase',
          { phase: Schema.Literals(['Initial', 'Restarted', 'Stopped']) },
          {
            messages: [],
            modelToDependencies: model => ({ phase: model.phase }),
          },
        ),
      }),
    )

    const initialStreamAcquired = Deferred.makeUnsafe<void>()
    const restartedStreamAcquired = Deferred.makeUnsafe<void>()
    const restartedStreamReleased = Deferred.makeUnsafe<void>()
    const streamEvents: Array<string> = []
    let serviceBuilds = 0
    let serviceReleases = 0
    let commandHandlerBuilds = 0
    let subscriptionHandlerBuilds = 0
    let commandRuns = 0

    const ValueLayer = Layer.effect(
      ValueService,
      Effect.acquireRelease(
        Effect.sync((): ValueShape => {
          serviceBuilds += 1
          return { value: `service-${serviceBuilds}` }
        }),
        () =>
          Effect.sync(() => {
            serviceReleases += 1
          }),
      ),
    )
    const ChangePhaseLayer = ChangePhase.toLayer(
      Effect.gen(function* () {
        const { value } = yield* ValueService
        commandHandlerBuilds += 1

        return ({ phase }) =>
          Effect.gen(function* () {
            commandRuns += 1
            yield* Deferred.await(
              phase === 'Restart'
                ? initialStreamAcquired
                : restartedStreamAcquired,
            )
            return LifecycleMessage.CompletedChangePhase({ phase, value })
          })
      }),
    )
    const TrackApplicationPhaseLayer = subscriptions.phase.toLayer(
      Effect.gen(function* () {
        const { value } = yield* ValueService
        subscriptionHandlerBuilds += 1

        return ({ phase }) => {
          if (phase === 'Stopped') {
            return Stream.empty
          }

          const acquired =
            phase === 'Initial'
              ? initialStreamAcquired
              : restartedStreamAcquired

          return Stream.scoped(
            Stream.fromEffect(
              Effect.acquireRelease(
                Effect.sync(() => {
                  streamEvents.push(`acquired ${phase} with ${value}`)
                  Deferred.doneUnsafe(acquired, Effect.void)
                }),
                () =>
                  Effect.sync(() => {
                    streamEvents.push(`released ${phase} with ${value}`)
                    if (phase === 'Restarted') {
                      Deferred.doneUnsafe(restartedStreamReleased, Effect.void)
                    }
                  }),
              ),
            ).pipe(Stream.flatMap(() => Stream.never)),
          )
        }
      }),
    )
    const update = Update.make(
      (model: LifecycleModel, message: LifecycleMessage) =>
        LifecycleMessage.match(message, {
          CompletedChangePhase: ({ phase, value }) => {
            const nextModel = modifyFields(model, {
              label: label => `${label} ${phase}-${value}`,
              phase: () => (phase === 'Restart' ? 'Restarted' : 'Stopped'),
              commandRuns: count => count + 1,
            })

            if (phase === 'Restart') {
              return {
                model: nextModel,
                commands: [ChangePhase({ phase: 'Stop' })],
              }
            } else {
              return { model: nextModel }
            }
          },
        }),
    )
    const element = Application.makeElement({
      Model: LifecycleModel,
      Flags,
      flags: Effect.map(ValueService, ({ value }) => ({
        initialLabel: `flags-${value}`,
      })),
      init: ({ initialLabel }) => ({
        model: LifecycleModel.make({
          label: initialLabel,
          phase: 'Initial',
          commandRuns: 0,
        }),
        commands: [ChangePhase({ phase: 'Restart' })],
      }),
      update,
      view: (model, h) =>
        h.div([], [`${model.label} runs-${model.commandRuns}`]),
      subscriptions,
      container,
    })
    const HandlersLayer = Layer.mergeAll(
      ChangePhaseLayer,
      TrackApplicationPhaseLayer,
    )
    const provided = Application.provide(
      element,
      Layer.provideMerge(HandlersLayer, ValueLayer),
    )
    const fiber = Effect.runFork(provided.start())

    try {
      await Effect.runPromise(Deferred.await(restartedStreamReleased))
      await awaitBodyText(
        'flags-service-1 Restart-service-1 Stop-service-1 runs-2',
      )

      expect(serviceBuilds).toBe(1)
      expect(serviceReleases).toBe(0)
      expect(commandHandlerBuilds).toBe(1)
      expect(subscriptionHandlerBuilds).toBe(1)
      expect(commandRuns).toBe(2)
      expect(streamEvents).toEqual([
        'acquired Initial with service-1',
        'released Initial with service-1',
        'acquired Restarted with service-1',
        'released Restarted with service-1',
      ])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }

    expect(serviceReleases).toBe(1)
  })

  it('builds the Layer but skips Flags and init for a preserved Model', async () => {
    let buildCount = 0
    let releaseCount = 0
    let flagsRunCount = 0
    let initRunCount = 0

    const ValueLayer = Layer.effect(
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
    const provided = Application.provide(element, ValueLayer)
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

    const ValueLayer = Layer.sync(ValueService, (): ValueShape => {
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
    const provided = Application.provide(element, ValueLayer)
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

    const FailingApplicationLayer = Layer.effect(
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
    const provided = Application.provide(element, FailingApplicationLayer)
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

  const flagsOnlyApplication = Application.make({
    Model,
    Flags,
    init: ({ initialLabel }) => ({
      model: Model.make({ label: initialLabel }),
    }),
    update: (model: Model, _message: Message) => ({ model }),
    view: documentView,
    container,
  })
  const flagsOnlyProvided = Application.provide(
    flagsOnlyApplication,
    Layer.succeed(ValueService, { value: 'provided' }),
  )
  run(flagsOnlyProvided, { flags: flagsNeedingService })

  const DerivedLayer = Layer.effect(
    DerivedService,
    Effect.map(ValueService, ({ value }): ValueShape => ({
      value: `${value}-derived`,
    })),
  )
  const withDerived = Application.provide(flagsOnlyApplication, DerivedLayer)
  const withBoth = Application.provide(
    withDerived,
    Layer.succeed(ValueService, { value: 'provided' }),
  )
  run(withBoth, {
    flags: Effect.gen(function* () {
      const value = yield* ValueService
      const derived = yield* DerivedService
      return { initialLabel: `${value.value} ${derived.value}` }
    }),
  })

  const withUnresolvedLaterDependency = Application.provide(
    flagsOnlyProvided,
    Layer.effect(
      DerivedService,
      Effect.map(ValueService, ({ value }): ValueShape => ({
        value: `${value}-derived`,
      })),
    ),
  )
  // @ts-expect-error A later Layer cannot consume an earlier Layer through sequential provision.
  run(withUnresolvedLaterDependency, {
    flags: Effect.gen(function* () {
      const value = yield* ValueService
      const derived = yield* DerivedService
      return { initialLabel: `${value.value} ${derived.value}` }
    }),
  })

  const Engine = ManagedResource.tag<number>()('FlagsEngine')
  const managedResources = ManagedResource.make<Model, Message>()(entry => ({
    engine: entry('ManageFlagsEngine', Schema.Option(Schema.Null), {
      resource: Engine,
      modelToMaybeRequirements: () => Option.none(),
      onAcquired: () => Message.ClickedReadValue(),
      onReleased: () => Message.ClickedReadValue(),
      onAcquireError: () => Message.ClickedReadValue(),
    }),
  }))
  const managedApplication = Application.make({
    Model,
    Flags,
    init: ({ initialLabel }) => ({
      model: Model.make({ label: initialLabel }),
    }),
    update: (model: Model, _message: Message) => ({ model }),
    view: documentView,
    managedResources,
    container,
  })
  const runnableManagedApplication = Application.provide(
    managedApplication,
    managedResources.engine.toLayer(
      Effect.succeed({
        acquire: () => Effect.succeed(1),
        release: () => Effect.void,
      }),
    ),
  )
  run(runnableManagedApplication, {
    flags: Effect.succeed({ initialLabel: 'ready' }),
  })
  run(runnableManagedApplication, {
    // @ts-expect-error Flags resolve before Model-driven ManagedResources can be acquired.
    flags: Engine.get.pipe(
      Effect.map(value => ({ initialLabel: `${value}` })),
      Effect.catchTag('ResourceNotAvailable', () =>
        Effect.succeed({ initialLabel: 'unavailable' }),
      ),
    ),
  })

  const staleResourcesConfig = {
    Model,
    init: () => ({ model: Model.make({ label: 'ready' }) }),
    update,
    view: documentView,
    container,
    resources: Layer.empty,
  }
  // @ts-expect-error Application.make rejects removed configuration fields.
  Application.make(staleResourcesConfig)

  const misspelledSubscriptionsConfig = {
    Model,
    init: () => ({ model: Model.make({ label: 'ready' }) }),
    update: (model: Model) => ({ model }),
    view: (model: Model, h: HtmlBuilder<Message>) => h.div([], [model.label]),
    container,
    subsriptions: {},
  }
  // @ts-expect-error Application.makeElement rejects unknown configuration fields.
  Application.makeElement(misspelledSubscriptionsConfig)

  Application.make({
    Model,
    init: () => ({ model: Model.make({ label: 'ready' }) }),
    // @ts-expect-error Application.make requires tagged Messages when update accepts a Message.
    update: (model: Model, _message: number) => ({ model }),
    view: (model, h) => ({ title: '', body: h.div([], [model.label]) }),
    container,
  })

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

  const pureRawApplication = makeApplication({
    Model,
    init: () => ({ model: { label: 'ready' } }),
    update: (model: Model) => ({ model }),
    view: documentView,
    container,
  })

  run(pureRawApplication)

  makeApplication({
    Model,
    init: () => ({ model: { label: 'ready' } }),
    // @ts-expect-error Raw Runtime constructors require self-contained Command handlers.
    update,
    view: documentView,
    container,
  })

  const rawApplication = makeApplication({
    Model,
    Flags,
    init: ({ initialLabel }: Flags) => ({ model: { label: initialLabel } }),
    update: (model: Model) => ({ model }),
    view: documentView,
    container,
  })

  // @ts-expect-error Raw Runtime constructors cannot supply application services to Flags.
  run(rawApplication, { flags: flagsNeedingService })

  makeElement({
    Model,
    Flags,
    flags: flagsNeedingService,
    // @ts-expect-error Raw Runtime Elements require self-contained Flags Effects.
    init: ({ initialLabel }: Flags) => ({ model: { label: initialLabel } }),
    update: (model: Model) => ({ model }),
    view: (model: Model, h: HtmlBuilder<Message>) => h.div([], [model.label]),
    container,
  })
}

void checkApplicationLayerTypes
