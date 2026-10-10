import {
  Context,
  Effect,
  Fiber,
  Layer,
  Option,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import * as ManagedResource from '../managedResource/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Subscription from '../subscription/subscription.js'
import * as Update from '../update/index.js'
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

const Send = Command.define('Send', {
  args: { text: Schema.String },
  messages: [Message.CompletedSend],
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

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedSend: () => ({
      model: { status: 'sending' },
      commands: [Send({ text: 'hello' })],
    }),
    CompletedSend: ({ text }) => ({
      model: { status: `${model.status}: ${text}` },
    }),
  }),
)

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
  Application.make({
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
  it('rejects distinct Subscription definitions with the same handler name', () => {
    const subscriptions = Subscription.make<Model, Message>()(entry => ({
      first: entry(
        'StatusUpdates',
        { token: Schema.Null },
        {
          messages: [],
          modelToDependencies: () => ({ token: null }),
        },
      ),
      second: entry(
        'StatusUpdates',
        { token: Schema.Null },
        {
          messages: [],
          modelToDependencies: () => ({ token: null }),
        },
      ),
    }))

    expect(() =>
      Application.make({
        Model,
        init: () => ({ model: { status: 'ready' } }),
        update: updateWithoutRequirements,
        view: (model, h) => ({
          title: 'Duplicate Subscription handlers',
          body: h.div([], [model.status]),
        }),
        subscriptions,
        container,
      }),
    ).toThrow('same name "StatusUpdates" but different definitions')
  })

  it('allows multiple registrations of the same Subscription definition', () => {
    const subscriptions = Subscription.make<Model, Message>()(entry => ({
      first: entry(
        'StatusUpdates',
        { token: Schema.Null },
        {
          messages: [],
          modelToDependencies: () => ({ token: null }),
        },
      ),
    }))
    const sharedSubscriptions = {
      first: subscriptions.first,
      second: subscriptions.first,
    }

    expect(() =>
      Application.make({
        Model,
        init: () => ({ model: { status: 'ready' } }),
        update: updateWithoutRequirements,
        view: (model, h) => ({
          title: 'Shared Subscription handler',
          body: h.div([], [model.status]),
        }),
        subscriptions: sharedSubscriptions,
        container,
      }),
    ).not.toThrow()
  })

  it('rejects distinct ManagedResource definitions with the same handler name', () => {
    const firstResource = ManagedResource.tag<string>()('FirstStatus')
    const secondResource = ManagedResource.tag<string>()('SecondStatus')
    const managedResources = ManagedResource.make<Model, Message>()(entry => ({
      first: entry('ManageStatus', Schema.Option(Schema.Null), {
        resource: firstResource,
        modelToMaybeRequirements: () => Option.none(),
        onAcquired: text => Message.CompletedSend({ text }),
        onReleased: () => Message.CompletedSend({ text: 'released' }),
        onAcquireError: () => Message.CompletedSend({ text: 'failed' }),
      }),
      second: entry('ManageStatus', Schema.Option(Schema.Null), {
        resource: secondResource,
        modelToMaybeRequirements: () => Option.none(),
        onAcquired: text => Message.CompletedSend({ text }),
        onReleased: () => Message.CompletedSend({ text: 'released' }),
        onAcquireError: () => Message.CompletedSend({ text: 'failed' }),
      }),
    }))

    expect(() =>
      Application.make({
        Model,
        init: () => ({ model: { status: 'ready' } }),
        update: updateWithoutRequirements,
        view: (model, h) => ({
          title: 'Duplicate ManagedResource handlers',
          body: h.div([], [model.status]),
        }),
        managedResources,
        container,
      }),
    ).toThrow('same name "ManageStatus" but different definitions')
  })

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
    const provided = pipe(
      application,
      Application.provide(handlerLayer),
      Application.provide(databaseLayer),
    )
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

  it('runs a named Subscription through its application Layer', async () => {
    const subscriptions = Subscription.make<Model, Message>()(entry => ({
      ready: entry(
        'ReadyUpdates',
        { token: Schema.Null },
        {
          messages: [Message.CompletedSend],
          modelToDependencies: () => ({ token: null }),
        },
      ),
    }))
    const application = Application.make({
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
      subscriptions,
      container,
    })
    const provided = Application.provide(
      application,
      subscriptions.ready.toLayer(
        Effect.succeed(() =>
          Stream.fromEffect(
            Effect.succeed(Message.CompletedSend({ text: 'watched' })),
          ),
        ),
      ),
    )
    const fiber = Effect.runFork(__startProgram(provided, undefined, 'Fresh'))

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('watched')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('preserves Flags and routing through Layer provision', async () => {
    const application = Application.make({
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
    const provided = Application.provide(
      application,
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
  const applicationWithoutRequirements = Application.make({
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

  const otherLayer = Other.toLayer(
    Effect.succeed(() =>
      Effect.succeed(Message.CompletedSend({ text: 'other' })),
    ),
  )

  // @ts-expect-error A different Command handler leaves Send unsatisfied.
  run(Application.provide(application, otherLayer))

  const combinedLayer = Layer.mergeAll(
    Send.toLayer(
      Effect.succeed(({ text }) =>
        Effect.succeed(Message.CompletedSend({ text })),
      ),
    ),
    otherLayer,
    DatabaseLayer,
  )
  run(Application.provide(application, combinedLayer))

  const applicationWithTwoHandlers = Application.make({
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
  const withOneHandler = Application.provide(
    applicationWithTwoHandlers,
    Send.toLayer(
      Effect.succeed(({ text }) =>
        Effect.succeed(Message.CompletedSend({ text })),
      ),
    ),
  )

  // @ts-expect-error The Other handler is still required.
  run(withOneHandler)
  run(Application.provide(withOneHandler, otherLayer))

  const applicationWithInitCommand = Application.make({
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
    Application.provide(
      applicationWithInitCommand,
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
  const withHandler = pipe(
    application,
    Application.provide(handlerNeedingDatabase),
  )

  // @ts-expect-error Database remains after the Command handler is provided.
  run(withHandler)

  const provided = pipe(withHandler, Application.provide(DatabaseLayer))
  run(provided)

  const subscriptions = Subscription.make<Model, Message>()(entry => ({
    storedValue: entry('StoredValue', {
      messages: [Message.ClickedSend, Message.CompletedSend],
    }),
  }))

  const StoredValueLayer = subscriptions.storedValue.toLayer(
    Effect.succeed(() =>
      Stream.fromEffect(
        Effect.map(Database, database =>
          Message.CompletedSend({ text: database.store('subscription') }),
        ),
      ),
    ),
  )
  const applicationWithSubscription = Application.make({
    Model,
    init: () => ({ model: { status: 'ready' } }),
    update: updateWithoutRequirements,
    view: (model, h) => ({
      title: 'Application with Subscription requirements',
      body: h.div([], [model.status]),
    }),
    subscriptions,
    container,
  })

  // @ts-expect-error The Subscription handler is unsatisfied.
  run(applicationWithSubscription)
  const withSubscriptionHandler = Application.provide(
    applicationWithSubscription,
    StoredValueLayer,
  )

  // @ts-expect-error Database remains after the Subscription handler is provided.
  run(withSubscriptionHandler)
  run(Application.provide(withSubscriptionHandler, DatabaseLayer))

  const layeredSubscriptions = Subscription.make<Model, Message>()(entry => ({
    storedValue: entry(
      'StoredValues',
      { status: Schema.String },
      {
        messages: [],
        modelToDependencies: model => ({ status: model.status }),
      },
    ),
  }))
  const applicationWithLayeredSubscription = Application.make({
    Model,
    init: () => ({ model: { status: 'ready' } }),
    update: updateWithoutRequirements,
    view: (model, h) => ({
      title: 'Application with a layered Subscription',
      body: h.div([], [model.status]),
    }),
    subscriptions: layeredSubscriptions,
    container,
  })

  // @ts-expect-error The named Subscription handler is unsatisfied.
  run(applicationWithLayeredSubscription)
  run(
    Application.provide(
      applicationWithLayeredSubscription,
      layeredSubscriptions.storedValue.toLayer(
        Effect.succeed(() => Stream.empty),
      ),
    ),
  )

  const routingApplication = Application.make({
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
    Application.provide(
      routingApplication,
      Send.toLayer(
        Effect.succeed(({ text }) =>
          Effect.succeed(Message.CompletedSend({ text })),
        ),
      ),
    ),
  )

  const flagsApplication = Application.make({
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
  const providedFlagsApplication = Application.provide(
    flagsApplication,
    Send.toLayer(
      Effect.succeed(({ text }) =>
        Effect.succeed(Message.CompletedSend({ text })),
      ),
    ),
  )

  // @ts-expect-error Flags must be supplied when starting a fresh runtime.
  run(providedFlagsApplication)
  run(providedFlagsApplication, {
    flags: Effect.succeed({ initialStatus: 'configured' }),
  })
  run(providedFlagsApplication, {
    // @ts-expect-error Flags retain their configured Schema type.
    flags: Effect.succeed({ initialStatus: 1 }),
  })

  const routingFlagsSubscriptions = Subscription.make<Model, Message>()(
    entry => ({
      location: entry(
        'LocationChanges',
        { pathname: Schema.String },
        {
          messages: [],
          modelToDependencies: model => ({ pathname: model.status }),
        },
      ),
    }),
  )
  const routingFlagsApplication = Application.make({
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
    subscriptions: routingFlagsSubscriptions,
    container,
  })

  // @ts-expect-error The routing Flags app needs both of its handlers.
  run(routingFlagsApplication, {
    flags: Effect.succeed({ initialStatus: 'configured' }),
  })
  const withRoutingFlagsCommand = Application.provide(
    routingFlagsApplication,
    Send.toLayer(
      Effect.succeed(({ text }) =>
        Effect.succeed(Message.CompletedSend({ text })),
      ),
    ),
  )

  // @ts-expect-error The named Subscription handler remains required.
  run(withRoutingFlagsCommand, {
    flags: Effect.succeed({ initialStatus: 'configured' }),
  })
  run(
    Application.provide(
      withRoutingFlagsCommand,
      routingFlagsSubscriptions.location.toLayer(
        Effect.succeed(() => Stream.empty),
      ),
    ),
    { flags: Effect.succeed({ initialStatus: 'configured' }) },
  )

  Application.make({
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

  Application.make({
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

  Application.make({
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
