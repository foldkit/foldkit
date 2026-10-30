import { Context, Effect, Fiber, Layer, Schema, Stream, pipe } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Application from './application.js'
import { __startProgram, run } from './start.js'

const Message = defineMessageUnion({
  ClickedSend: {},
  CompletedSend: { text: Schema.String },
})
type Message = typeof Message.Type

const Model = Schema.Struct({ status: Schema.String })
type Model = typeof Model.Type

const Flags = Schema.Struct({ initialStatus: Schema.String })
type Flags = typeof Flags.Type

const Send = Command.define('Send', {
  args: { text: Schema.String },
  messages: [Message.CompletedSend],
})

const SendWithOptionalTextArgs = Command.define('Send', {
  args: { text: Schema.optional(Schema.String) },
  messages: [Message.CompletedSend],
})

const CompletedSendWithOptionalText = Schema.TaggedStruct('CompletedSend', {
  text: Schema.optional(Schema.String),
})
type CompletedSendWithOptionalText = typeof CompletedSendWithOptionalText.Type

const SendWithOptionalTextResult = Command.define('Send', {
  args: { text: Schema.String },
  messages: [CompletedSendWithOptionalText],
})

const Other = Command.define('Other', {
  messages: [Message.CompletedSend],
})

type DatabaseShape = Readonly<{
  store: (text: string) => string
}>

class Database extends Context.Service<Database, DatabaseShape>()('Database') {}

const DatabaseLayer = Layer.succeed(Database, {
  store: text => `${text} stored`,
})

const update = (model: Model, message: Message) =>
  Message.match(message, {
    ClickedSend: () => ({
      model: { status: 'sending' },
      commands: [Send({ text: 'hello' })],
    }),
    CompletedSend: ({ text }) => ({
      model: { status: `${model.status}: ${text}` },
    }),
  })

const updateWithoutRequirements = (model: Model, message: Message) =>
  Message.match(message, {
    ClickedSend: () => ({ model }),
    CompletedSend: () => ({ model }),
  })

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

const makeTestApplication = () =>
  Application.__makeFromConfig({
    Model,
    init: () => ({ model: { status: 'ready' } }),
    update,
    view: (model, h) => ({
      title: 'Application Layer test',
      body: h.button([h.OnClick(Message.ClickedSend())], [model.status]),
    }),
    container,
  })

describe('Application', () => {
  it('provides inferred Command handlers for the runtime lifetime', async () => {
    const application = makeTestApplication()
    let handlerBuildCount = 0
    let handlerReleaseCount = 0
    let databaseBuildCount = 0
    let databaseReleaseCount = 0
    const handlerLayer = Send.toLayer(
      Effect.acquireRelease(
        Effect.gen(function* () {
          const database = yield* Database
          handlerBuildCount += 1
          return ({ text }: Readonly<{ text: string }>) =>
            Effect.succeed(
              Message.CompletedSend({ text: database.store(text) }),
            )
        }),
        () =>
          Effect.sync(() => {
            handlerReleaseCount += 1
          }),
      ),
    )
    const databaseLayer = Layer.effect(
      Database,
      Effect.acquireRelease(
        Effect.sync(() => {
          databaseBuildCount += 1
          return { store: (text: string) => `${text} stored` }
        }),
        () =>
          Effect.sync(() => {
            databaseReleaseCount += 1
          }),
      ),
    )
    const provided = application.provide(handlerLayer).provide(databaseLayer)
    const fiber = Effect.runFork(__startProgram(provided, undefined, 'Fresh'))

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('ready')
      })
      expect(handlerBuildCount).toBe(1)
      expect(databaseBuildCount).toBe(1)

      document.body.querySelector('button')?.click()

      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('sending: hello stored')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }

    expect(handlerReleaseCount).toBe(1)
    expect(databaseReleaseCount).toBe(1)
  })

  it('runs a Subscription with services from the application Layer', async () => {
    const application = Application.__makeFromConfig({
      Model,
      init: () => ({ model: { status: 'ready' } }),
      update: (model: Model, message: Message) =>
        Message.match(message, {
          ClickedSend: () => ({ model }),
          CompletedSend: ({ text }) => ({ model: { status: text } }),
        }),
      view: (model, h) => ({
        title: 'Subscription Layer test',
        body: h.div([], [model.status]),
      }),
      subscriptions: {
        ready: {
          dependenciesSchema: Schema.Struct({}),
          modelToDependencies: () => ({}),
          dependenciesToStream: () =>
            Stream.fromEffect(
              Effect.map(Database, database =>
                Message.CompletedSend({ text: database.store('watched') }),
              ),
            ),
        },
      },
      container,
    })
    const provided = application.provide(DatabaseLayer)
    const fiber = Effect.runFork(__startProgram(provided, undefined, 'Fresh'))

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('watched stored')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('preserves Flags and routing through Layer provision', async () => {
    const application = Application.__makeFromConfig({
      Model,
      Flags,
      init: (flags, url) => ({
        model: { status: `${flags.initialStatus}:${url.pathname}` },
      }),
      update,
      view: (model, h) => ({
        title: 'Flags and routing Layer test',
        body: h.div([], [model.status]),
      }),
      routing: {
        onUrlRequest: () => Message.ClickedSend(),
        onUrlChange: () => Message.ClickedSend(),
      },
      container,
    })
    const provided = application.provide(
      Send.toLayer(
        Effect.succeed(({ text }) =>
          Effect.succeed(Message.CompletedSend({ text })),
        ),
      ),
    )
    const fiber = Effect.runFork(
      __startProgram(
        provided,
        undefined,
        'Fresh',
        Effect.succeed({ initialStatus: 'configured' }),
      ),
    )

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toBe(
          `configured:${window.location.pathname}`,
        )
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})

const checkApplicationTypes = (): void => {
  const applicationWithoutRequirements = Application.__makeFromConfig({
    Model,
    init: () => ({ model: { status: 'ready' } }),
    update: updateWithoutRequirements,
    view: (model, h) => ({
      title: 'Application without requirements',
      body: h.div([], [model.status]),
    }),
    container,
  })
  run(applicationWithoutRequirements)

  const application = makeTestApplication()

  // @ts-expect-error The inferred Send handler has not been provided.
  run(application)

  // @ts-expect-error The inferred Send handler has not been provided.
  pipe(application, run)

  const otherLayer = Other.toLayer(
    Effect.succeed(() =>
      Effect.succeed(Message.CompletedSend({ text: 'other' })),
    ),
  )

  // @ts-expect-error A different Command handler leaves Send unsatisfied.
  run(application.provide(otherLayer))

  const sameNameDifferentArgsLayer = SendWithOptionalTextArgs.toLayer(
    Effect.succeed(({ text }) =>
      Effect.succeed(Message.CompletedSend({ text: text ?? 'missing' })),
    ),
  )

  // @ts-expect-error A same-name handler with different args leaves Send unsatisfied.
  run(application.provide(sameNameDifferentArgsLayer))

  const sameNameDifferentResultLayer = SendWithOptionalTextResult.toLayer(
    Effect.succeed(({ text }) =>
      Effect.succeed(CompletedSendWithOptionalText.make({ text })),
    ),
  )

  // @ts-expect-error A same-name handler with a different result leaves Send unsatisfied.
  run(application.provide(sameNameDifferentResultLayer))

  const combinedLayer = Layer.mergeAll(
    Send.toLayer(
      Effect.succeed(({ text }) =>
        Effect.succeed(Message.CompletedSend({ text })),
      ),
    ),
    otherLayer,
    DatabaseLayer,
  )
  run(application.provide(combinedLayer))
  run(application.provide(combinedLayer))

  const applicationWithTwoHandlers = Application.__makeFromConfig({
    Model,
    init: () => ({ model: { status: 'ready' } }),
    update: (model: Model, message: Message) =>
      Message.match(message, {
        ClickedSend: () => ({
          model,
          commands: [Send({ text: 'hello' }), Other()],
        }),
        CompletedSend: () => ({ model }),
      }),
    view: (model, h) => ({
      title: 'Application with two Command handlers',
      body: h.div([], [model.status]),
    }),
    container,
  })
  const withOneHandler = applicationWithTwoHandlers.provide(
    Send.toLayer(
      Effect.succeed(({ text }) =>
        Effect.succeed(Message.CompletedSend({ text })),
      ),
    ),
  )

  // @ts-expect-error The Other handler is still required.
  run(withOneHandler)
  run(withOneHandler.provide(otherLayer))

  const applicationWithInitCommand = Application.__makeFromConfig({
    Model,
    init: () => ({
      model: { status: 'starting' },
      commands: [Send({ text: 'boot' })],
    }),
    update: updateWithoutRequirements,
    view: (model, h) => ({
      title: 'Application with an init Command',
      body: h.div([], [model.status]),
    }),
    container,
  })

  // @ts-expect-error The init Command needs its handler.
  run(applicationWithInitCommand)
  run(
    applicationWithInitCommand.provide(
      Send.toLayer(
        Effect.succeed(({ text }) =>
          Effect.succeed(Message.CompletedSend({ text })),
        ),
      ),
    ),
  )

  const handlerNeedingDatabase = Send.toLayer(
    Effect.succeed(({ text }) =>
      Effect.map(Database, database =>
        Message.CompletedSend({ text: database.store(text) }),
      ),
    ),
  )
  const withHandler = application.provide(handlerNeedingDatabase)

  // @ts-expect-error Database remains after the Command handler is provided.
  run(withHandler)

  // @ts-expect-error Database remains after the Command handler is provided.
  pipe(withHandler, run)

  const provided = withHandler.provide(DatabaseLayer)
  run(provided)
  run(withHandler.provide(DatabaseLayer))

  const applicationWithSubscription = Application.__makeFromConfig({
    Model,
    init: () => ({ model: { status: 'ready' } }),
    update: updateWithoutRequirements,
    view: (model, h) => ({
      title: 'Application with Subscription requirements',
      body: h.div([], [model.status]),
    }),
    subscriptions: {
      storedValue: {
        dependenciesSchema: Schema.Struct({}),
        modelToDependencies: () => ({}),
        dependenciesToStream: () =>
          Stream.fromEffect(
            Effect.map(Database, database =>
              Message.CompletedSend({ text: database.store('subscription') }),
            ),
          ),
      },
    },
    container,
  })

  // @ts-expect-error The Subscription requires Database.
  run(applicationWithSubscription)
  run(applicationWithSubscription.provide(DatabaseLayer))

  const routingApplication = Application.__makeFromConfig({
    Model,
    init: url => ({
      model: { status: url.pathname },
      commands: [Send({ text: url.pathname })],
    }),
    update: updateWithoutRequirements,
    view: (model, h) => ({
      title: 'Routing application',
      body: h.div([], [model.status]),
    }),
    routing: {
      onUrlRequest: () => Message.ClickedSend(),
      onUrlChange: () => Message.ClickedSend(),
    },
    container,
  })

  // @ts-expect-error The routing init Command needs its handler.
  run(routingApplication)
  run(
    routingApplication.provide(
      Send.toLayer(
        Effect.succeed(({ text }) =>
          Effect.succeed(Message.CompletedSend({ text })),
        ),
      ),
    ),
  )

  const flagsApplication = Application.__makeFromConfig({
    Model,
    Flags,
    init: flags => ({
      model: { status: flags.initialStatus },
      commands: [Send({ text: flags.initialStatus })],
    }),
    update: updateWithoutRequirements,
    view: (model, h) => ({
      title: 'Flags application',
      body: h.div([], [model.status]),
    }),
    container,
  })

  // @ts-expect-error The Flags application also needs its Command handler.
  run(flagsApplication, {
    flags: Effect.succeed({ initialStatus: 'configured' }),
  })
  const providedFlagsApplication = flagsApplication.provide(
    Send.toLayer(
      Effect.succeed(({ text }) =>
        Effect.succeed(Message.CompletedSend({ text })),
      ),
    ),
  )

  // @ts-expect-error Flags must be supplied when starting a fresh runtime.
  run(providedFlagsApplication)

  // @ts-expect-error Flags must be supplied when starting a fresh runtime.
  pipe(providedFlagsApplication, run)
  run(providedFlagsApplication, {
    flags: Effect.succeed({ initialStatus: 'configured' }),
  })
  run(providedFlagsApplication, {
    // @ts-expect-error Flags retain their configured Schema type.
    flags: Effect.succeed({ initialStatus: 1 }),
  })

  const routingFlagsApplication = Application.__makeFromConfig({
    Model,
    Flags,
    init: (flags, url) => ({
      model: { status: `${flags.initialStatus}:${url.pathname}` },
      commands: [Send({ text: flags.initialStatus })],
    }),
    update: updateWithoutRequirements,
    view: (model, h) => ({
      title: 'Routing Flags application',
      body: h.div([], [model.status]),
    }),
    routing: {
      onUrlRequest: () => Message.ClickedSend(),
      onUrlChange: () => Message.ClickedSend(),
    },
    container,
  })

  // @ts-expect-error The routing Flags app needs its Command handler.
  run(routingFlagsApplication, {
    flags: Effect.succeed({ initialStatus: 'configured' }),
  })
  const withRoutingFlagsCommand = routingFlagsApplication.provide(
    Send.toLayer(
      Effect.succeed(({ text }) =>
        Effect.succeed(Message.CompletedSend({ text })),
      ),
    ),
  )

  run(withRoutingFlagsCommand, {
    flags: Effect.succeed({ initialStatus: 'configured' }),
  })

  Application.__makeFromConfig({
    Model,
    init: () => ({ model: { status: 'ready' } }),
    // @ts-expect-error update must return an Update.Return.
    update: (_model: Model, _message: Message) => 42,
    view: (model, h) => ({
      title: 'Invalid update',
      body: h.div([], [model.status]),
    }),
    container,
  })

  Application.__makeFromConfig({
    Model,
    // @ts-expect-error init must return an Update.Return.
    init: () => 42,
    update: updateWithoutRequirements,
    view: (model, h) => ({
      title: 'Invalid init',
      body: h.div([], [model.status]),
    }),
    container,
  })

  Application.__makeFromConfig({
    Model,
    // @ts-expect-error Application init cannot emit an OutMessage.
    init: () => ({ model: { status: 'ready' }, outMessage: 'invalid' }),
    update: updateWithoutRequirements,
    view: (model, h) => ({
      title: 'Invalid init OutMessage',
      body: h.div([], [model.status]),
    }),
    container,
  })
}

void checkApplicationTypes
