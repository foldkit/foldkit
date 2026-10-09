import { Effect, Fiber, Option, Schema } from 'effect'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import * as ManagedResource from '../managedResource/index.js'
import { defineMessageUnion } from '../message/index.js'
import { defineTaggedUnion } from '../schema/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import * as Application from './application.js'
import { __startProgram } from './start.js'

const EngineState = defineTaggedUnion({
  Off: {},
  Booting: {},
  Ready: {},
  Failed: {},
})

const Model = Schema.Struct({
  engine: EngineState,
  maybeValue: Schema.Option(Schema.Number),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedStartEngine: {},
  ClickedStopEngine: {},
  StartedEngine: {},
  StoppedEngine: {},
  FailedStartEngine: {},
  CompletedReadEngine: { value: Schema.Number },
  SkippedReadEngine: {},
})
type Message = typeof Message.Type

const Engine = ManagedResource.tag<number>()('Engine')

const ReadEngine = Command.define('ReadEngine', {
  messages: [Message.CompletedReadEngine, Message.SkippedReadEngine],
})

const managedResources = ManagedResource.make<Model, Message>()(entry => ({
  engine: entry('ManageEngine', Schema.Option(Schema.Null), {
    resource: Engine,
    modelToMaybeRequirements: model =>
      EngineState.isAnyOf(['Booting', 'Ready'])(model.engine)
        ? Option.some(null)
        : Option.none(),
    onAcquired: () => Message.StartedEngine(),
    onReleased: () => Message.StoppedEngine(),
    onAcquireError: () => Message.FailedStartEngine(),
  }),
}))

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedStartEngine: () => ({
      model: modifyFields(model, { engine: () => EngineState.Booting() }),
    }),
    ClickedStopEngine: () => ({
      model: modifyFields(model, { engine: () => EngineState.Off() }),
    }),
    StartedEngine: () => ({
      model: modifyFields(model, { engine: () => EngineState.Ready() }),
      commands: [ReadEngine()],
    }),
    StoppedEngine: () => ({ model }),
    FailedStartEngine: () => ({
      model: modifyFields(model, { engine: () => EngineState.Failed() }),
    }),
    CompletedReadEngine: ({ value }) => ({
      model: modifyFields(model, { maybeValue: () => Option.some(value) }),
    }),
    SkippedReadEngine: () => ({ model }),
  }),
)

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

it('provides layered ManagedResource acquire and release with runtime-owned access', async () => {
  let acquireCount = 0
  let releaseCount = 0

  const application = Application.make({
    Model,
    init: () => ({
      model: Model.make({
        engine: EngineState.Off(),
        maybeValue: Option.none(),
      }),
    }),
    update,
    view: (model, h) => ({
      title: 'Managed Resource Layer test',
      body: h.div(
        [],
        [
          h.button([h.OnClick(Message.ClickedStartEngine())], ['start']),
          h.button([h.OnClick(Message.ClickedStopEngine())], ['stop']),
          Option.match(model.maybeValue, {
            onNone: () => 'waiting',
            onSome: value => `value: ${value}`,
          }),
        ],
      ),
    }),
    managedResources,
    container,
  })

  const withLifecycle = Application.provide(
    application,
    managedResources.engine.toLayer({
      acquire: () =>
        Effect.sync(() => {
          acquireCount += 1
          return 7
        }),
      release: () =>
        Effect.sync(() => {
          releaseCount += 1
        }),
    }),
  )
  const provided = Application.provide(
    withLifecycle,
    ReadEngine.toLayer(() =>
      Engine.get.pipe(
        Effect.map(value => Message.CompletedReadEngine({ value })),
        Effect.catchTag('ResourceNotAvailable', () =>
          Effect.succeed(Message.SkippedReadEngine()),
        ),
      ),
    ),
  )
  const fiber = Effect.runFork(__startProgram(provided, undefined, 'Fresh'))

  try {
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('waiting')
    })

    document.body.querySelector('button')?.click()

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('value: 7')
    })
    expect(acquireCount).toBe(1)

    document.body.querySelectorAll('button').item(1).click()

    await vi.waitFor(() => {
      expect(releaseCount).toBe(1)
    })
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }
})

it('releases an active Layer-backed ManagedResource when the runtime stops', async () => {
  let releaseCount = 0

  const application = Application.make({
    Model,
    init: () => ({
      model: Model.make({
        engine: EngineState.Off(),
        maybeValue: Option.none(),
      }),
    }),
    update,
    view: (model, h) => ({
      title: 'Managed Resource Layer teardown test',
      body: h.div(
        [],
        [
          h.button([h.OnClick(Message.ClickedStartEngine())], ['start']),
          Option.match(model.maybeValue, {
            onNone: () => 'waiting',
            onSome: value => `value: ${value}`,
          }),
        ],
      ),
    }),
    managedResources,
    container,
  })
  const withLifecycle = Application.provide(
    application,
    managedResources.engine.toLayer({
      acquire: () => Effect.succeed(7),
      release: () =>
        Effect.sync(() => {
          releaseCount += 1
        }),
    }),
  )
  const provided = Application.provide(
    withLifecycle,
    ReadEngine.toLayer(() =>
      Engine.get.pipe(
        Effect.map(value => Message.CompletedReadEngine({ value })),
        Effect.catchTag('ResourceNotAvailable', () =>
          Effect.succeed(Message.SkippedReadEngine()),
        ),
      ),
    ),
  )
  const fiber = Effect.runFork(__startProgram(provided, undefined, 'Fresh'))

  try {
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('waiting')
    })

    document.body.querySelector('button')?.click()

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('value: 7')
    })
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }

  expect(releaseCount).toBe(1)
})
