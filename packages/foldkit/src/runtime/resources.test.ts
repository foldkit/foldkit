import {
  Context,
  Effect,
  Fiber,
  Layer,
  Match as M,
  Schema as S,
  Stream,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { html } from '../html/index.js'
import { m } from '../message/index.js'
import { makeElement } from './runtime.js'
import * as Subscription from './subscription.js'

const ClickedReadValue = m('ClickedReadValue')
const SucceededReadValue = m('SucceededReadValue', { value: S.String })
const Message = S.Union([ClickedReadValue, SucceededReadValue])
type Message = typeof Message.Type

const Model = S.Struct({ label: S.String })
type Model = typeof Model.Type

type ResourceShape = Readonly<{ value: string }>

class ResourceService extends Context.Service<ResourceService, ResourceShape>()(
  'ResourceService',
) {}

const ReadValue = Command.define(
  'ReadValue',
  SucceededReadValue,
)(
  Effect.gen(function* () {
    const { value } = yield* ResourceService
    return SucceededReadValue({ value })
  }),
)

const LAYER_BUILD_ERROR = 'RESOURCE_URL environment variable is not set'

const FailingResourceLive = Layer.sync(ResourceService, (): ResourceShape => {
  throw new Error(LAYER_BUILD_ERROR)
})

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message, never, ResourceService>>,
]

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ClickedReadValue: () => [{ label: 'reading' }, [ReadValue()]],
      SucceededReadValue: ({ value }) => [
        { label: `${model.label} ${value}` },
        [],
      ],
    }),
  )

const h = html<Message>()

const view = (model: Model) =>
  h.div([], [h.button([h.OnClick(ClickedReadValue())], ['read']), model.label])

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
      init: () => [{ label: 'ready' }, [ReadValue()]],
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
      init: () => [{ label: 'ready' }, []],
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
      init: () => [{ label: 'ready' }, [ReadValue(), ReadValue()]],
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
              return SucceededReadValue({ value })
            }),
          ),
        ),
      }),
    )

    const element = makeElement({
      Model,
      init: () => [{ label: 'ready' }, []],
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
      init: () => [{ label: 'start' }, [ReadValue()]],
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
})
