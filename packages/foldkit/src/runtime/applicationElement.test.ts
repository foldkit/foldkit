import { Context, Effect, Layer, Schema, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import * as Port from '../port/index.js'
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
type Flags = typeof Flags.Type

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

describe('Program.makeElement runtime', () => {
  it('shares provided services with Flags and Commands for one embedded lifetime', async () => {
    let databaseBuildCount = 0
    let databaseReleaseCount = 0
    let handlerBuildCount = 0
    let handlerReleaseCount = 0

    const DatabaseLayer = Layer.effect(
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
    const SendLayer = Send.toLayer(
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
    const element = Application.__makeElementFromConfig({
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
    const withHandler = element.provide(SendLayer)
    const provided = withHandler.provide(DatabaseLayer)
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

  it('keeps inbound Ports available through Layer provision', async () => {
    const subscriptions = {
      hostStatus: {
        dependenciesSchema: Schema.Struct({}),
        modelToDependencies: () => ({}),
        dependenciesToStream: () =>
          Port.stream(ports.inbound.statusChanged).pipe(
            Stream.map(status => Message.ChangedStatus({ status })),
          ),
      },
    }
    const element = Application.__makeElementFromConfig({
      Model,
      init: () => ({ model: Model.make({ status: 'ready' }) }),
      update,
      view: (model, h) => h.div([], [model.status]),
      subscriptions,
      ports,
      container,
    })

    const provided = element.provide(
      Send.toLayer(
        Effect.succeed(({ text }) =>
          Effect.succeed(Message.CompletedSend({ status: text })),
        ),
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
    const element = Application.__makeElementFromConfig({
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
    const provided = element.provide(
      AnchorPanel.toLayer(
        Effect.succeed(() =>
          Effect.succeed(Message.CompletedAnchorPanel({ status: 'anchored' })),
        ),
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

  it('does not globally reject distinct registered Mount definitions with the same name', () => {
    const otherAnchorPanel = Mount.define('AnchorPanel', {
      messages: [Message.CompletedAnchorPanel],
    })

    expect(() =>
      Application.__makeElementFromConfig({
        Model,
        init: () => ({ model: Model.make({ status: 'ready' }) }),
        update: (model: Model) => ({ model }),
        view: (model, h) => h.div([], [model.status]),
        mounts: [AnchorPanel, otherAnchorPanel],
        container,
      }),
    ).not.toThrow()
  })
})

const checkElementTypes = (): void => {
  Application.__makeElementFromConfig({
    Model,
    // @ts-expect-error A configured Flags Effect requires its Schema.
    flags: Effect.succeed({ initialStatus: 'configured' }),
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: (model: Model) => ({ model }),
    view: (model, h) => h.div([], [model.status]),
    container,
  })

  const element = Application.__makeElementFromConfig({
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

  const withHandler = element.provide(
    Send.toLayer(
      Effect.succeed(({ text }) =>
        Effect.succeed(Message.CompletedSend({ status: text })),
      ),
    ),
  )

  // @ts-expect-error The Flags Effect still requires Database.
  run(withHandler)

  run(
    withHandler.provide(
      Layer.succeed(Database, {
        store: text => text,
      }),
    ),
  )

  const subscriptionElement = Application.__makeElementFromConfig({
    Model,
    init: () => ({ model: Model.make({ status: 'ready' }) }),
    update: (model: Model) => ({ model }),
    view: (model, h) => h.div([], [model.status]),
    subscriptions: {
      status: {
        dependenciesSchema: Schema.Struct({ status: Schema.String }),
        modelToDependencies: (model: Model) => ({ status: model.status }),
        dependenciesToStream: ({ status }: Readonly<{ status: string }>) =>
          Stream.fromEffect(
            Effect.map(Database, database =>
              Message.ChangedStatus({ status: database.store(status) }),
            ),
          ),
      },
    },
    container,
  })

  // @ts-expect-error The Subscription requires Database.
  embed(subscriptionElement)

  embed(
    subscriptionElement.provide(
      Layer.succeed(Database, {
        store: text => text,
      }),
    ),
  )

  const mountElement = Application.__makeElementFromConfig({
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
    mountElement.provide(
      AnchorPanel.toLayer(
        Effect.succeed(() =>
          Effect.succeed(Message.CompletedAnchorPanel({ status: 'anchored' })),
        ),
      ),
    ),
  )
}

void checkElementTypes
