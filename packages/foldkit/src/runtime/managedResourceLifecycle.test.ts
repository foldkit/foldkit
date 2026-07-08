import {
  Context,
  Effect,
  Fiber,
  Layer,
  Match as M,
  Option,
  Schema as S,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { html } from '../html/index.js'
import * as ManagedResource from '../managedResource/index.js'
import { make } from '../managedResource/managedResource.js'
import { m } from '../message/index.js'
import { evo } from '../struct/index.js'
import { makeElement } from './runtime.js'

type EngineShape = Readonly<{ id: string }>

class EngineService extends Context.Service<EngineService, EngineShape>()(
  'EngineService',
) {}

const FAIL_ID = 'fail'
const LAYER_BUILD_ERROR = 'engine layer failed to build'

let log: Array<string> = []

const acquireEngine = (id: string): Effect.Effect<EngineShape, Error> => {
  if (id === FAIL_ID) {
    return Effect.fail(new Error(LAYER_BUILD_ERROR))
  } else {
    return Effect.sync(() => {
      log.push(`build:${id}`)
      return { id }
    })
  }
}

const makeEngineLayer = (id: string): Layer.Layer<EngineService, Error> =>
  Layer.effect(
    EngineService,
    Effect.acquireRelease(acquireEngine(id), () =>
      Effect.sync(() => {
        log.push(`finalize:${id}`)
      }),
    ),
  )

const Engine = ManagedResource.tag<EngineShape>()('Engine')
type EngineServiceId = ManagedResource.ServiceOf<typeof Engine>

const RequestedEngine = m('RequestedEngine', { id: S.String })
const StoppedEngine = m('StoppedEngine')
const AcquiredEngine = m('AcquiredEngine')
const ReleasedEngine = m('ReleasedEngine')
const FailedEngine = m('FailedEngine', { error: S.String })
const ClickedRead = m('ClickedRead')
const SucceededRead = m('SucceededRead', { value: S.String })
const FailedRead = m('FailedRead')

const Message = S.Union([
  RequestedEngine,
  StoppedEngine,
  AcquiredEngine,
  ReleasedEngine,
  FailedEngine,
  ClickedRead,
  SucceededRead,
  FailedRead,
])
type Message = typeof Message.Type

const Model = S.Struct({
  requested: S.Option(S.String),
  status: S.String,
  readValue: S.String,
})
type Model = typeof Model.Type

const ReadEngine = Command.define(
  'ReadEngine',
  SucceededRead,
  FailedRead,
)(
  Engine.get.pipe(
    Effect.map(({ id }) => SucceededRead({ value: id })),
    Effect.catchTag('ResourceNotAvailable', () => Effect.succeed(FailedRead())),
  ),
)

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message, never, EngineServiceId>>,
]

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      RequestedEngine: ({ id }) => [
        evo(model, { requested: () => Option.some(id) }),
        [],
      ],
      StoppedEngine: () => [evo(model, { requested: () => Option.none() }), []],
      AcquiredEngine: () => [evo(model, { status: () => 'acquired' }), []],
      ReleasedEngine: () => [evo(model, { status: () => 'released' }), []],
      FailedEngine: ({ error }) => [
        evo(model, { status: () => `failed:${error}` }),
        [],
      ],
      ClickedRead: () => [model, [ReadEngine()]],
      SucceededRead: ({ value }) => [
        evo(model, { readValue: () => value }),
        [],
      ],
      FailedRead: () => [evo(model, { readValue: () => 'unavailable' }), []],
    }),
  )

const managedResources = make<Model, Message>()(entry => ({
  engine: entry(S.Option(S.Struct({ id: S.String })), {
    resource: Engine,
    modelToMaybeRequirements: model =>
      Option.map(model.requested, id => ({ id })),
    acquire: ({ id }) =>
      Layer.build(makeEngineLayer(id)).pipe(
        Effect.map(context => Context.get(context, EngineService)),
      ),
    release: () =>
      Effect.sync(() => {
        log.push('release')
      }),
    onAcquired: () => AcquiredEngine(),
    onReleased: () => ReleasedEngine(),
    onAcquireError: error => FailedEngine({ error: String(error) }),
  }),
}))

const h = html<Message>()

const view = (model: Model) =>
  h.div(
    [],
    [
      h.button([h.OnClick(RequestedEngine({ id: 'b' }))], ['request-b']),
      h.button([h.OnClick(StoppedEngine())], ['stop']),
      h.button([h.OnClick(ClickedRead())], ['read']),
      h.div([], [`status:${model.status}`]),
      h.div([], [`value:${model.readValue}`]),
    ],
  )

const crash = {
  view: (context: Readonly<{ error: Error }>) =>
    h.div([], [`Crash view: ${context.error.message}`]),
}

let container: HTMLElement

beforeEach(() => {
  log = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const startEngineApp = (initialId: string) =>
  makeElement({
    Model,
    init: () => [
      { requested: Option.some(initialId), status: 'idle', readValue: 'none' },
      [],
    ],
    update,
    view,
    crash,
    container,
    managedResources,
  })

const awaitBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

const awaitLogEntry = (entry: string): Promise<void> =>
  vi.waitFor(() => {
    expect(log).toContain(entry)
  })

const clickButton = (label: string): void => {
  const button = Array.from(document.body.querySelectorAll('button')).find(
    candidate => candidate.textContent === label,
  )
  expect(button, `button "${label}"`).toBeTruthy()
  button?.click()
}

describe('managed resource lifecycle with a Layer-built resource', () => {
  it('acquires and exposes the bare service value via the resource ref', async () => {
    const element = startEngineApp('a')
    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('status:acquired')
      expect(log).toStrictEqual(['build:a'])

      clickButton('read')
      await awaitBodyText('value:a')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('runs the Layer finalizer when the resource is released', async () => {
    const element = startEngineApp('a')
    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('status:acquired')

      clickButton('stop')
      await awaitLogEntry('finalize:a')
      await awaitBodyText('status:released')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('closes the old scope before building the new one on a param change', async () => {
    const element = startEngineApp('a')
    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('status:acquired')

      clickButton('request-b')
      await awaitLogEntry('build:b')

      const finalizeAIndex = log.indexOf('finalize:a')
      const buildBIndex = log.indexOf('build:b')
      expect(finalizeAIndex).toBeGreaterThanOrEqual(0)
      expect(finalizeAIndex).toBeLessThan(buildBIndex)

      clickButton('read')
      await awaitBodyText('value:b')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('dispatches onAcquireError and leaves the ref empty when acquire fails', async () => {
    const element = startEngineApp(FAIL_ID)
    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText(`failed:Error: ${LAYER_BUILD_ERROR}`)

      expect(log.some(entry => entry.startsWith('build:'))).toBe(false)
      expect(log.some(entry => entry.startsWith('finalize:'))).toBe(false)

      clickButton('read')
      await awaitBodyText('value:unavailable')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('runs the explicit release before the Layer finalizer on teardown', async () => {
    const element = startEngineApp('a')
    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('status:acquired')

      clickButton('stop')
      await awaitLogEntry('finalize:a')

      expect(log).toStrictEqual(['build:a', 'release', 'finalize:a'])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
