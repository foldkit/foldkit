import { Context, Effect, Layer, Option, Schema, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import * as ManagedResource from '../managedResource/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import * as Port from '../port/index.js'
import * as Subscription from '../subscription/subscription.js'
import * as Application from './application.js'
import { embed, run } from './start.js'

const Message = defineMessageUnion({
  ChangedStatus: { status: Schema.String },
  ClickedSend: {},
  CompletedAnchorPanel: { status: Schema.String },
  CompletedSend: { status: Schema.String },
})
type Message = typeof Message.Type

const Model = Schema.Struct({ status: Schema.String })
type Model = typeof Model.Type

const Flags = Schema.Struct({ initialStatus: Schema.String })

const ports = {
  inbound: { statusChanged: Port.inbound(Schema.String) },
}

type DatabaseShape = Readonly<{ store: (text: string) => string }>

class Database extends Context.Service<Database, DatabaseShape>()('Database') {}

const Send = Command.define('Send', {
  args: { text: Schema.String },
  messages: [Message.CompletedSend],
})

const AnchorPanel = Mount.define('AnchorPanel', {
  messages: [Message.CompletedAnchorPanel],
})

const update = (model: Model, message: Message) =>
  Message.match(message, {
    ChangedStatus: ({ status }) => ({ model: Model.make({ status }) }),
    ClickedSend: () => ({
      model,
      commands: [Send({ text: model.status })],
    }),
    CompletedAnchorPanel: ({ status }) => ({ model: Model.make({ status }) }),
    CompletedSend: ({ status }) => ({ model: Model.make({ status }) }),
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

describe('Application.makeElement', () => {
  it('shares provided services with Flags and Commands for one embedded lifetime', async () => {
    let databaseBuildCount = 0
    let databaseReleaseCount = 0
    let handlerBuildCount = 0
    let handlerReleaseCount = 0

    const DatabaseLive = Layer.effect(
      Database,
      Effect.acquireRelease(
        Effect.sync((): DatabaseShape => {
          databaseBuildCount += 1
          return { store: text => `${text}:stored` }
        }),
        () =>
          Effect.sync(() => {
            databaseReleaseCount += 1
          }),
      ),
    )
    const SendLive = Send.toLayer(
      Effect.acquireRelease(
        Effect.gen(function* () {
          const database = yield* Database
          handlerBuildCount += 1
          return ({ text }: Readonly<{ text: string }>) =>
            Effect.succeed(
              Message.CompletedSend({ status: database.store(text) }),
            )
        }),
        () =>
          Effect.sync(() => {
            handlerReleaseCount += 1
          }),
      ),
    )
    const element = Application.makeElement({
      Model,
      Flags,
      flags: Effect.map(Database, database => ({
        initialStatus: database.store('flags'),
      })),
      init: ({ initialStatus }) => ({
        model: Model.make({ status: initialStatus }),
      }),
      update,
      view: (model, h) =>
        h.button([h.OnClick(Message.ClickedSend())], [model.status]),
      ports,
      container,
    })
    const withHandler = Application.provide(element, SendLive)
    const provided = Application.provide(withHandler, DatabaseLive)
    const handle = embed(provided)

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('flags:stored')
      })

      document.body.querySelector('button')?.click()

      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('flags:stored:stored')
      })

      expect(databaseBuildCount).toBe(1)
      expect(handlerBuildCount).toBe(1)
      expect(databaseReleaseCount).toBe(0)
      expect(handlerReleaseCount).toBe(0)
    } finally {
      handle.dispose()
    }

    await vi.waitFor(() => {
      expect(databaseReleaseCount).toBe(1)
      expect(handlerReleaseCount).toBe(1)
    })
  })

  it('makes runtime-provided ManagedResource access available to Flags', async () => {
    const Token = ManagedResource.tag<string>()('FlagToken')
    const managedResources = ManagedResource.make<Model, Message>()(entry => ({
      token: entry('ManageFlagToken', Schema.Option(Schema.String), {
        resource: Token,
        modelToMaybeRequirements: () => Option.none(),
        onAcquired: status => Message.ChangedStatus({ status }),
        onReleased: () => Message.ChangedStatus({ status: 'released' }),
        onAcquireError: () => Message.ChangedStatus({ status: 'failed' }),
      }),
    }))
    const element = Application.makeElement({
      Model,
      Flags,
      flags: Token.get.pipe(
        Effect.catchTag('ResourceNotAvailable', () =>
          Effect.succeed('not acquired'),
        ),
        Effect.map(initialStatus => ({ initialStatus })),
      ),
      init: ({ initialStatus }) => ({
        model: Model.make({ status: initialStatus }),
      }),
      update: (model: Model) => ({ model }),
      view: (model, h) => h.div([], [model.status]),
      managedResources,
      container,
    })
    const provided = Application.provide(
      element,
      managedResources.token.toLayer({
        acquire: () => Effect.succeed('token'),
        release: () => Effect.void,
      }),
    )
    const handle = embed(provided)

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('not acquired')
      })
    } finally {
      handle.dispose()
    }
  })

  it('keeps inbound Ports available through Layer provision', async () => {
    const element = Application.makeElement({
      Model,
      init: () => ({ model: Model.make({ status: 'ready' }) }),
      update,
      view: (model, h) => h.div([], [model.status]),
      subscriptions: Subscription.make<Model, Message>()(_entry => ({
        hostStatus: Port.subscriptionEntry(
          ports.inbound.statusChanged,
          status => Message.ChangedStatus({ status }),
        ),
      })),
      ports,
      container,
    })
    const provided = Application.provide(
      element,
      Send.toLayer(({ text }) =>
        Effect.succeed(Message.CompletedSend({ status: text })),
      ),
    )
    const handle = embed(provided)

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('ready')
      })

      handle.ports.statusChanged.send('from host')

      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('from host')
      })
    } finally {
      handle.dispose()
    }
  })

  it('runs a registered Mount through its provided Layer', async () => {
    const element = Application.makeElement({
      Model,
      init: () => ({ model: Model.make({ status: 'ready' }) }),
      update: (model: Model, message: Message) =>
        Message.match(message, {
          ChangedStatus: () => ({ model }),
          ClickedSend: () => ({ model }),
          CompletedAnchorPanel: ({ status }) => ({
            model: Model.make({ status }),
          }),
          CompletedSend: () => ({ model }),
        }),
      view: (model, h) => h.div([h.OnMount(AnchorPanel())], [model.status]),
      mounts: [AnchorPanel],
      container,
    })
    const provided = Application.provide(
      element,
      AnchorPanel.toLayer(() =>
        Effect.succeed(Message.CompletedAnchorPanel({ status: 'anchored' })),
      ),
    )
    const handle = embed(provided)

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toBe('anchored')
      })
    } finally {
      handle.dispose()
    }
  })

  it('rejects distinct registered Mount definitions with the same name', () => {
    const otherAnchorPanel = Mount.define('AnchorPanel', {
      messages: [Message.CompletedAnchorPanel],
    })

    expect(() =>
      Application.makeElement({
        Model,
        init: () => ({ model: Model.make({ status: 'ready' }) }),
        update: (model: Model) => ({ model }),
        view: (model, h) => h.div([], [model.status]),
        mounts: [AnchorPanel, otherAnchorPanel],
        container,
      }),
    ).toThrow('same name "AnchorPanel" but different definitions')
  })
})

const checkElementTypes = (): void => {
  Application.makeElement({
    Model,
    // @ts-expect-error A configured Flags Effect requires its Schema.
    flags: Effect.succeed({ initialStatus: 'configured' }),
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: (model: Model) => ({ model }),
    view: (model, h) => h.div([], [model.status]),
    container,
  })

  const element = Application.makeElement({
    Model,
    Flags,
    flags: Effect.map(Database, database => ({
      initialStatus: database.store('flags'),
    })),
    init: ({ initialStatus }) => ({
      model: Model.make({ status: initialStatus }),
    }),
    update,
    view: (model, h) => h.div([], [model.status]),
    container,
  })

  // @ts-expect-error The Flags Effect and Command require their services.
  embed(element)

  const withHandler = Application.provide(
    element,
    Send.toLayer(({ text }) =>
      Effect.succeed(Message.CompletedSend({ status: text })),
    ),
  )

  // @ts-expect-error The Flags Effect still requires Database.
  run(withHandler)

  run(
    Application.provide(
      withHandler,
      Layer.succeed(Database, {
        store: text => text,
      }),
    ),
  )

  const subscriptions = Subscription.make<Model, Message>()(entry => ({
    status: entry(
      'WatchStatus',
      { status: Schema.String },
      { modelToDependencies: model => ({ status: model.status }) },
    ),
  }))
  const subscriptionElement = Application.makeElement({
    Model,
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: (model: Model) => ({ model }),
    view: (model, h) => h.div([], [model.status]),
    subscriptions,
    container,
  })

  // @ts-expect-error The named Subscription handler is required.
  embed(subscriptionElement)

  embed(
    Application.provide(
      subscriptionElement,
      subscriptions.status.toLayer(() => Stream.empty),
    ),
  )

  const mountElement = Application.makeElement({
    Model,
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: (model: Model) => ({ model }),
    view: (model, h) => h.div([h.OnMount(AnchorPanel())], [model.status]),
    mounts: [AnchorPanel],
    container,
  })

  // @ts-expect-error The registered Mount handler is required.
  embed(mountElement)

  embed(
    Application.provide(
      mountElement,
      AnchorPanel.toLayer(() =>
        Effect.succeed(Message.CompletedAnchorPanel({ status: 'anchored' })),
      ),
    ),
  )

  const Token = ManagedResource.tag<string>()('Token')
  const managedResources = ManagedResource.make<Model, Message>()(entry => ({
    token: entry('ManageToken', Schema.Option(Schema.String), {
      resource: Token,
      modelToMaybeRequirements: () => Option.none(),
      onAcquired: status => Message.ChangedStatus({ status }),
      onReleased: () => Message.ChangedStatus({ status: 'released' }),
      onAcquireError: () => Message.ChangedStatus({ status: 'failed' }),
    }),
  }))
  const managedElement = Application.makeElement({
    Model,
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: (model: Model) => ({ model }),
    view: (model, h) => h.div([], [model.status]),
    managedResources,
    container,
  })

  // @ts-expect-error The ManagedResource lifecycle handler is required.
  embed(managedElement)

  embed(
    Application.provide(
      managedElement,
      managedResources.token.toLayer({
        acquire: () => Effect.succeed('token'),
        release: () => Effect.void,
      }),
    ),
  )
}

void checkElementTypes
