import {
  Cause,
  Context,
  Effect,
  Exit,
  Fiber,
  Layer,
  Schema as S,
  Stream,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Subscription from '../subscription/subscription.js'
import { makeApplication, makeElement, run } from './runtime.js'

const Message = defineMessageUnion({
  ClickedReadValue: {},
  SucceededReadValue: { value: S.String },
})
type Message = typeof Message.Type

const Model = S.Struct({ label: S.String })
type Model = typeof Model.Type

const Flags = S.Struct({ initialLabel: S.String })
type Flags = typeof Flags.Type

type ResourceShape = Readonly<{ value: string }>

class ResourceService extends Context.Service<ResourceService, ResourceShape>()(
  'ResourceService',
) {}

const ReadValue = Command.define('ReadValue', {
  messages: [Message.SucceededReadValue],
  execute: Effect.gen(function* () {
    const { value } = yield* ResourceService
    return Message.SucceededReadValue({ value })
  }),
})

const LAYER_BUILD_ERROR = 'RESOURCE_URL environment variable is not set'

const FailingResourceLive = Layer.sync(ResourceService, (): ResourceShape => {
  throw new Error(LAYER_BUILD_ERROR)
})

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message, never, ResourceService>>
  outMessage?: never
}>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedReadValue: () => ({
      model: { label: 'reading' },
      commands: [ReadValue()],
    }),
    SucceededReadValue: ({ value }) => ({
      model: { label: `${model.label} ${value}` },
    }),
  })

const h = __htmlBuilder<Message>()

const view = (model: Model) =>
  h.div(
    [],
    [h.button([h.OnClick(Message.ClickedReadValue())], ['read']), model.label],
  )

const crash = {
  view: (context: Readonly<{ error: Error }>) =>
    h.div([], [`Crash view: ${context.error.message}`]),
}

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

const awaitTwoAnimationFrames = (): Promise<void> =>
  new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })

describe('resources', () => {
  it('renders the crash view when the Layer fails to build for an init Command', async () => {
    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'ready' }, commands: [ReadValue()] }),
      update,
      view,
      crash,
      container,
      resources: FailingResourceLive,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText(`Crash view: ${LAYER_BUILD_ERROR}`)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('keeps the crash view visible when the crashing Message also dirtied the model', async () => {
    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'ready' } }),
      update,
      view,
      crash,
      container,
      resources: FailingResourceLive,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('ready')

      const button = document.body.querySelector('button')
      expect(button).not.toBeNull()
      button?.click()

      await awaitBodyText(`Crash view: ${LAYER_BUILD_ERROR}`)
      await awaitTwoAnimationFrames()

      expect(document.body.textContent).toContain(
        `Crash view: ${LAYER_BUILD_ERROR}`,
      )
      expect(document.body.textContent).not.toContain('reading')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('reports the crash once when multiple Commands fail on the same broken Layer', async () => {
    const report = vi.fn()

    const element = makeElement({
      Model,
      init: () => ({
        model: { label: 'ready' },
        commands: [ReadValue(), ReadValue()],
      }),
      update,
      view,
      crash: { ...crash, report },
      container,
      resources: FailingResourceLive,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText(`Crash view: ${LAYER_BUILD_ERROR}`)
      await awaitTwoAnimationFrames()

      expect(report).toHaveBeenCalledTimes(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('renders the crash view when the Layer fails to build for a Subscription', async () => {
    const subscriptions = Subscription.make<Model, Message, ResourceService>()(
      _entry => ({
        resourceValue: Subscription.persistent(
          Stream.fromEffect(
            Effect.gen(function* () {
              const { value } = yield* ResourceService
              return Message.SucceededReadValue({ value })
            }),
          ),
        ),
      }),
    )

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'ready' } }),
      update,
      view,
      subscriptions,
      crash,
      container,
      resources: FailingResourceLive,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText(`Crash view: ${LAYER_BUILD_ERROR}`)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('builds the Layer once, shares it across Commands, and releases it at teardown', async () => {
    let buildCount = 0
    let releaseCount = 0

    const CountedResourceLive = Layer.effect(
      ResourceService,
      Effect.acquireRelease(
        Effect.sync((): ResourceShape => {
          buildCount += 1
          return { value: `build-${buildCount}` }
        }),
        () =>
          Effect.sync(() => {
            releaseCount += 1
          }),
      ),
    )

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'start' }, commands: [ReadValue()] }),
      update,
      view,
      crash,
      container,
      resources: CountedResourceLive,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('start build-1')

      const button = document.body.querySelector('button')
      expect(button).not.toBeNull()
      button?.click()

      await awaitBodyText('reading build-1')
      expect(buildCount).toBe(1)
      expect(releaseCount).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }

    expect(releaseCount).toBe(1)
  })

  it('builds the Layer once when flags and a Command both consume it', async () => {
    let buildCount = 0
    let releaseCount = 0

    const CountedResourceLive = Layer.effect(
      ResourceService,
      Effect.acquireRelease(
        Effect.sync((): ResourceShape => {
          buildCount += 1
          return { value: `build-${buildCount}` }
        }),
        () =>
          Effect.sync(() => {
            releaseCount += 1
          }),
      ),
    )

    const flags = Effect.gen(function* () {
      const { value } = yield* ResourceService
      return { initialLabel: `flags-${value}` }
    })

    const element = makeElement({
      Model,
      Flags,
      flags,
      init: ({ initialLabel }) => ({
        model: { label: initialLabel },
        commands: [ReadValue()],
      }),
      update,
      view,
      crash,
      container,
      resources: CountedResourceLive,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('flags-build-1 build-1')
      expect(buildCount).toBe(1)
      expect(releaseCount).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }

    expect(releaseCount).toBe(1)
  })

  it('leaves the Layer unbuilt when an HMR restore skips init', async () => {
    let buildCount = 0

    const CountedResourceLive = Layer.effect(
      ResourceService,
      Effect.sync((): ResourceShape => {
        buildCount += 1
        return { value: `build-${buildCount}` }
      }),
    )

    const element = makeElement({
      Model,
      Flags,
      flags: Effect.succeed({ initialLabel: 'fresh' }),
      init: ({ initialLabel }) => ({ model: { label: initialLabel } }),
      update,
      view,
      crash,
      container,
      resources: CountedResourceLive,
    })

    const fiber = Effect.runFork(element.start({ label: 'restored' }))

    try {
      await awaitBodyText('restored')
      expect(buildCount).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('does not run the flags Effect when an HMR restore skips init', async () => {
    let flagsRunCount = 0

    const element = makeElement({
      Model,
      Flags,
      flags: Effect.sync(() => {
        flagsRunCount += 1
        return { initialLabel: 'fresh' }
      }),
      init: ({ initialLabel }) => ({ model: { label: initialLabel } }),
      update,
      view,
      crash,
      container,
    })

    const fiber = Effect.runFork(element.start({ label: 'restored' }))

    try {
      await awaitBodyText('restored')
      expect(flagsRunCount).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('builds the Layer when an unreadable HMR Model falls back to init', async () => {
    let buildCount = 0

    const CountedResourceLive = Layer.effect(
      ResourceService,
      Effect.sync((): ResourceShape => {
        buildCount += 1
        return { value: `build-${buildCount}` }
      }),
    )

    const element = makeElement({
      Model,
      Flags,
      flags: Effect.succeed({ initialLabel: 'fresh' }),
      init: ({ initialLabel }) => ({ model: { label: initialLabel } }),
      update,
      view,
      crash,
      container,
      resources: CountedResourceLive,
    })

    const fiber = Effect.runFork(element.start({ notALabel: 0 }))

    try {
      await awaitBodyText('fresh')
      expect(buildCount).toBe(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('still reaches the crash view when flags do not consume the failing Layer', async () => {
    const element = makeElement({
      Model,
      Flags,
      flags: Effect.succeed({ initialLabel: 'ready' }),
      init: ({ initialLabel }) => ({
        model: { label: initialLabel },
        commands: [ReadValue()],
      }),
      update,
      view,
      crash,
      container,
      resources: FailingResourceLive,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText(`Crash view: ${LAYER_BUILD_ERROR}`)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('reports both causes when the Layer fails and flags fail for their own reason', async () => {
    const FLAGS_ERROR = 'flags blew up on their own'

    const element = makeElement({
      Model,
      Flags,
      flags: Effect.sync((): Flags => {
        throw new Error(FLAGS_ERROR)
      }),
      init: ({ initialLabel }) => ({ model: { label: initialLabel } }),
      update,
      view,
      crash,
      container,
      resources: FailingResourceLive,
    })

    const exit = await Effect.runPromiseExit(element.start())

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      const reported = exit.cause.reasons.map(reason => String(reason)).join('')
      expect(reported).toContain(FLAGS_ERROR)
      expect(reported).toContain(LAYER_BUILD_ERROR)
    }
  })

  it('fails startup without a crash view when the Layer fails to build for flags', async () => {
    const flags = Effect.gen(function* () {
      const { value } = yield* ResourceService
      return { initialLabel: value }
    })

    const element = makeElement({
      Model,
      Flags,
      flags,
      init: ({ initialLabel }) => ({ model: { label: initialLabel } }),
      update,
      view,
      crash,
      container,
      resources: FailingResourceLive,
    })

    const exit = await Effect.runPromiseExit(element.start())

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(String(Cause.squash(exit.cause))).toContain(LAYER_BUILD_ERROR)
    }
    expect(document.body.textContent).not.toContain('Crash view:')
  })

  it('leaves the Layer unbuilt at startup when the app declares no flags', async () => {
    let buildCount = 0

    const CountedResourceLive = Layer.sync(
      ResourceService,
      (): ResourceShape => {
        buildCount += 1
        return { value: `build-${buildCount}` }
      },
    )

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'ready' } }),
      update,
      view,
      crash,
      container,
      resources: CountedResourceLive,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('ready')
      expect(buildCount).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('rejects a flags Effect requiring a service that resources does not provide', () => {
    const flagsNeedingResource: Effect.Effect<Flags, never, ResourceService> =
      Effect.gen(function* () {
        const { value } = yield* ResourceService
        return { initialLabel: value }
      })

    const documentView = (model: Model) => ({
      title: '',
      body: h.div([], [model.label]),
    })

    const resourceFreeUpdate = (
      model: Model,
    ): Readonly<{
      model: Model
      commands?: ReadonlyArray<never>
      outMessage?: never
    }> => ({ model })

    const resourceFreeInit = (
      flags: Flags,
    ): Readonly<{
      model: Model
      commands?: ReadonlyArray<never>
      outMessage?: never
    }> => ({ model: { label: flags.initialLabel } })

    expect(Effect.isEffect(flagsNeedingResource)).toBe(true)

    if (false) {
      // NOTE: `pnpm typecheck` is the assertion for this block, not vitest.
      // The call below is the one that guards `NoInfer` on the `flags` field:
      // it leaves `Resources` to inference, so dropping `NoInfer` would let it
      // infer `ResourceService` from `flags`, leave the optional `resources`
      // absent, and compile. It has to be `makeElement`. `makeApplication` has
      // four overloads, so TypeScript reports only the last one and blames
      // `init` for an arity mismatch, which a directive here cannot pin.
      // @ts-expect-error the flags Effect requires ResourceService and no `resources` Layer provides it
      makeElement({
        Model,
        Flags,
        flags: flagsNeedingResource,
        init: resourceFreeInit,
        update: resourceFreeUpdate,
        view,
        container,
      })

      const applicationWithoutResources = makeApplication({
        Model,
        Flags,
        init: resourceFreeInit,
        update: resourceFreeUpdate,
        view: documentView,
        container,
      })
      // @ts-expect-error ResourceService is absent from `resources`
      run(applicationWithoutResources, { flags: flagsNeedingResource })

      const application = makeApplication({
        Model,
        Flags,
        init: ({ initialLabel }) => ({
          model: { label: initialLabel },
          commands: [ReadValue()],
        }),
        update,
        view: documentView,
        container,
        resources: FailingResourceLive,
      })
      run(application, { flags: flagsNeedingResource })

      // NOTE: `init` and `update` here contribute a `ReadonlyArray<never>`
      // inference candidate for `Resources`, which must not pin it to `never`
      // and reject a flags Effect the `resources` Layer does satisfy.
      makeElement({
        Model,
        Flags,
        flags: flagsNeedingResource,
        init: resourceFreeInit,
        update: resourceFreeUpdate,
        view,
        container,
        resources: FailingResourceLive,
      })
    }
  })
})
