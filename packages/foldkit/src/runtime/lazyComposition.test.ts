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
  SubscriptionRef,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DevToolsStore } from '../devTools/store.js'
import { latestEntryIndex } from '../devTools/store.js'
import { renderToString } from '../experimental/server/server.js'
import {
  type Html,
  type HtmlBuilder,
  __requireDispatch,
} from '../html/index.js'
import * as ManagedResource from '../managedResource/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Subscription from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import { __setDevToolsOverlay } from './devToolsConfig.js'
import { type Composition, CompositionIdentity } from './lazyComposition.js'
import { makeApplication } from './makeApplication.js'
import { makeElement } from './makeElement.js'
import { runtimeInternals } from './runtime.js'

const Message = defineMessageUnion({
  RequestedRoute: { identity: CompositionIdentity },
  CompletedLoadComposition: { identity: CompositionIdentity },
  FailedLoadComposition: {
    identity: CompositionIdentity,
    reason: Schema.String,
  },
  ClickedIncrement: {},
  CompletedReadService: { value: Schema.String },
  ReturnedHome: {},
  AcquiredManaged: {},
  ReleasedManaged: {},
  ClickedReadManaged: {},
})
type Message = typeof Message.Type
const Model = Schema.Struct({
  requested: Schema.Option(CompositionIdentity),
  accepted: Schema.Option(CompositionIdentity),
  count: Schema.Number,
  failure: Schema.Option(Schema.String),
  serviceValue: Schema.Option(Schema.String),
})
type Model = typeof Model.Type
const initialModel: Model = {
  requested: Option.none(),
  accepted: Option.none(),
  count: 0,
  failure: Option.none(),
  serviceValue: Option.none(),
}

class SharedService extends Context.Service<SharedService, string>()(
  'LazyCompositionTestService',
) {}

const Engine = ManagedResource.tag<string>()('LazyCompositionTestEngine')
type Services = SharedService | ManagedResource.ServiceOf<typeof Engine>

type UpdateReturn = Update.Return<Model, Message, Services>
const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    RequestedRoute: ({ identity }) => ({
      model: modifyFields(model, {
        requested: () => Option.some(identity),
        failure: () => Option.none(),
      }),
    }),
    CompletedLoadComposition: ({ identity }) => {
      if (
        Option.isSome(model.requested) &&
        Schema.toEquivalence(CompositionIdentity)(
          model.requested.value,
          identity,
        )
      ) {
        return {
          model: modifyFields(model, {
            accepted: () => Option.some(identity),
            requested: () => Option.none(),
          }),
        }
      }
      return { model }
    },
    FailedLoadComposition: ({ identity, reason }) => {
      if (
        Option.isSome(model.requested) &&
        Schema.toEquivalence(CompositionIdentity)(
          model.requested.value,
          identity,
        )
      ) {
        return {
          model: modifyFields(model, {
            requested: () => Option.none(),
            failure: () => Option.some(reason),
          }),
        }
      }
      return { model }
    },
    ReturnedHome: () => ({
      model: modifyFields(model, {
        requested: () => Option.none(),
        accepted: () => Option.none(),
      }),
    }),
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
      commands: [
        {
          name: 'ReadService',
          effect: SharedService.pipe(
            Effect.map(value => Message.CompletedReadService({ value })),
          ),
        },
      ],
    }),
    CompletedReadService: ({ value }) => ({
      model: modifyFields(model, { serviceValue: () => Option.some(value) }),
    }),
    AcquiredManaged: () => ({ model }),
    ReleasedManaged: () => ({ model }),
    ClickedReadManaged: () => ({
      model,
      commands: [
        {
          name: 'ReadManaged',
          effect: Engine.get.pipe(
            Effect.map(value => Message.CompletedReadService({ value })),
            Effect.catchTag('ResourceNotAvailable', () =>
              Effect.succeed(
                Message.CompletedReadService({ value: 'unavailable' }),
              ),
            ),
          ),
        },
      ],
    }),
  })
const identity = (key: string, requestId: string) =>
  CompositionIdentity.make({ buildId: 'Build', key, requestId })

let container: HTMLElement
beforeEach(() => {
  container = document.createElement('div')
  container.id = 'lazy-composition-test'
  document.body.appendChild(container)
  vi.spyOn(performance, 'now').mockReturnValue(0)
})
afterEach(() => {
  __setDevToolsOverlay(undefined)
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document
    .querySelectorAll('[data-foldkit-refusal-shield]')
    .forEach(element => element.remove())
  document.body.inert = false
  document.body.removeAttribute('inert')
  document.body.removeAttribute('aria-hidden')
  document.body.removeAttribute('data-foldkit-refused')
})

const fixture = (
  load: (
    key: string,
  ) => Effect.Effect<
    Composition<Model, Message, Services>,
    string,
    SharedService
  >,
  subscriptions?: Subscription.Subscriptions<Model, Message, Services>,
) => {
  let dispatch: ((message: Message) => void) | undefined
  let latestModel = initialModel
  let store: DevToolsStore | undefined
  let builds = 0
  let acquisitions = 0
  let releases = 0
  __setDevToolsOverlay(value =>
    Effect.sync(() => {
      store = value
    }),
  )
  const application = makeApplication({
    Model,
    init: () => ({ model: initialModel }),
    update,
    view: (model, h) => {
      dispatch = __requireDispatch()
      latestModel = model
      return { title: 'Home', body: h.div([], ['Home']) }
    },
    ...(subscriptions !== undefined && { subscriptions }),
    lazyComposition: {
      buildId: 'Build',
      keys: ['A', 'B'],
      requested: model => model.requested,
      accepted: model => model.accepted,
      isLifecycleMessage: Schema.is(
        Schema.Union([
          Message.RequestedRoute,
          Message.CompletedLoadComposition,
          Message.FailedLoadComposition,
          Message.ReturnedHome,
        ]),
      ),
      load: key =>
        load(key).pipe(
          Effect.map(composition => ({
            ...composition,
            view: (model, h) => {
              dispatch = __requireDispatch()
              latestModel = model
              return composition.view(model, h)
            },
          })),
        ),
      onLoaded: identity => Message.CompletedLoadComposition({ identity }),
      onFailed: (identity, reason) =>
        Message.FailedLoadComposition({ identity, reason }),
    },
    resources: Layer.effect(
      SharedService,
      Effect.sync(() => {
        builds += 1
        return 'shared'
      }),
    ),
    managedResources: ManagedResource.make<Model, Message>()(entry => ({
      engine: entry(Schema.Struct({}), {
        resource: Engine,
        modelToMaybeRequirements: () => ({}),
        acquire: () =>
          Effect.sync(() => {
            acquisitions += 1
            return 'managed'
          }),
        release: () =>
          Effect.sync(() => {
            releases += 1
          }),
        onAcquired: () => Message.AcquiredManaged(),
        onReleased: () => Message.ReleasedManaged(),
        onAcquireError: () => Message.ReleasedManaged(),
      }),
    })),
    devTools: { show: 'Always' },
    container,
  })
  return {
    application,
    send: (message: Message) => {
      if (dispatch === undefined) {
        throw new Error('Runtime has not rendered')
      }
      dispatch(message)
    },
    model: () => latestModel,
    store: () => {
      if (store === undefined) {
        throw new Error('DevTools store was not installed')
      }
      return store
    },
    builds: () => builds,
    acquisitions: () => acquisitions,
    releases: () => releases,
  }
}

const snapshot = (
  key: string,
  log: Array<string> = [],
): Composition<Model, Message, Services> => ({
  update,
  view: (model, h) => ({
    title: key,
    body: h.div([], [`${key}:${model.count}`]),
  }),
  subscriptions: Subscription.make<Model, Message, Services>()(entry => ({
    ticks: entry(
      { count: Schema.Number },
      {
        modelToDependencies: model => ({ count: model.count }),
        dependenciesToStream: ({ count }) =>
          Stream.scoped(
            Stream.fromEffect(
              Effect.acquireRelease(
                Effect.sync(() => {
                  log.push(`start:${key}:${count}`)
                }),
                () =>
                  Effect.sync(() => {
                    log.push(`stop:${key}:${count}`)
                  }),
              ),
            ),
          ).pipe(Stream.flatMap(() => Stream.never)),
      },
    ),
  })),
})

describe('lazy composition', () => {
  it('keeps root dispatch synchronous and rejects stale readiness across A to B to A requests', async () => {
    const gate = await Effect.runPromise(
      Deferred.make<Composition<Model, Message, Services>, string>(),
    )
    const app = fixture(key =>
      key === 'A' ? Deferred.await(gate) : Effect.succeed(snapshot(key)),
    )
    const fiber = Effect.runFork(app.application.start())
    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('Home'))
      app.send(Message.RequestedRoute({ identity: identity('A', '1') }))
      app.send(Message.RequestedRoute({ identity: identity('B', '2') }))
      app.send(Message.RequestedRoute({ identity: identity('A', '3') }))
      app.send(
        Message.CompletedLoadComposition({ identity: identity('A', '1') }),
      )
      app.send(
        Message.CompletedLoadComposition({ identity: identity('B', '2') }),
      )
      expect(document.body.textContent).toBe('Home')
      await Effect.runPromise(Deferred.succeed(gate, snapshot('A')))
      await vi.waitFor(() => expect(document.body.textContent).toBe('A:0'))
      expect(app.model().accepted).toEqual(Option.some(identity('A', '3')))
      app.send(Message.ClickedIncrement())
      await vi.waitFor(() => expect(document.body.textContent).toBe('A:1'))
      await vi.waitFor(() =>
        expect(app.model().serviceValue).toEqual(Option.some('shared')),
      )
      expect(app.builds()).toBe(1)
      const json = Schema.encodeUnknownSync(Schema.toCodecJson(Model))(
        app.model(),
      )
      expect(Schema.decodeUnknownSync(Schema.toCodecJson(Model))(json)).toEqual(
        app.model(),
      )
      expect(json).not.toContain('function')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('interrupts obsolete loading before accepting a later visit to the same key', async () => {
    const first = await Effect.runPromise(
      Deferred.make<Composition<Model, Message, Services>, string>(),
    )
    const second = await Effect.runPromise(
      Deferred.make<Composition<Model, Message, Services>, string>(),
    )
    const starts: Array<string> = []
    let aLoads = 0
    let interrupted = false
    const app = fixture(key => {
      if (key === 'B') {
        return Effect.sync(() => {
          starts.push('B')
          return snapshot('B')
        })
      }
      return Effect.suspend(() => {
        aLoads += 1
        starts.push(`A:${aLoads}`)
        return aLoads === 1
          ? Deferred.await(first).pipe(
              Effect.onInterrupt(() =>
                Effect.sync(() => {
                  interrupted = true
                }),
              ),
            )
          : Deferred.await(second)
      })
    })
    const fiber = Effect.runFork(app.application.start())
    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('Home'))
      app.send(Message.RequestedRoute({ identity: identity('A', '1') }))
      await vi.waitFor(() => expect(starts).toContain('A:1'))
      app.send(Message.RequestedRoute({ identity: identity('B', '2') }))
      await vi.waitFor(() => expect(document.body.textContent).toBe('B:0'))
      expect(interrupted).toBe(true)
      app.send(Message.RequestedRoute({ identity: identity('A', '3') }))
      await vi.waitFor(() => expect(starts).toContain('A:2'))
      await Effect.runPromise(Deferred.succeed(first, snapshot('ObsoleteA')))
      app.send(
        Message.CompletedLoadComposition({ identity: identity('A', '1') }),
      )
      expect(app.model().accepted).toEqual(Option.some(identity('B', '2')))
      await Effect.runPromise(Deferred.succeed(second, snapshot('A')))
      await vi.waitFor(() => expect(document.body.textContent).toBe('A:0'))
      expect(app.model().accepted).toEqual(Option.some(identity('A', '3')))
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('cleans up changed subscriptions and reuses successful code for A to B to A without restarting the runtime', async () => {
    const lifecycle: Array<string> = []
    const loaded: Array<string> = []
    const app = fixture(key =>
      Effect.sync(() => {
        loaded.push(key)
        return snapshot(key, lifecycle)
      }),
    )
    const fiber = Effect.runFork(app.application.start())
    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('Home'))
      app.send(Message.RequestedRoute({ identity: identity('A', '1') }))
      await vi.waitFor(() => expect(lifecycle).toContain('start:A:0'))
      app.send(Message.ClickedIncrement())
      await vi.waitFor(() => expect(lifecycle).toContain('start:A:1'))
      expect(lifecycle).toContain('stop:A:0')
      app.send(Message.RequestedRoute({ identity: identity('B', '2') }))
      await vi.waitFor(() => expect(lifecycle).toContain('start:B:1'))
      expect(lifecycle).toContain('stop:A:1')
      app.send(Message.RequestedRoute({ identity: identity('A', '3') }))
      await vi.waitFor(() =>
        expect(lifecycle.filter(value => value === 'start:A:1')).toHaveLength(
          2,
        ),
      )
      expect(lifecycle).toContain('stop:B:1')
      expect(loaded).toEqual(['A', 'B'])
      app.send(Message.ReturnedHome())
      await vi.waitFor(() =>
        expect(lifecycle.filter(value => value === 'stop:A:1')).toHaveLength(2),
      )
      expect(app.builds()).toBe(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('keeps root Subscriptions alive while route Subscriptions switch and releases both at disposal', async () => {
    let shellAcquires = 0
    let shellReleases = 0
    const routes: Array<string> = []
    const subscriptions = Subscription.make<Model, Message, Services>()(() => ({
      shell: Subscription.persistent(
        Stream.scoped(
          Stream.fromEffect(
            Effect.acquireRelease(
              Effect.sync(() => {
                shellAcquires += 1
              }),
              () =>
                Effect.sync(() => {
                  shellReleases += 1
                }),
            ),
          ),
        ).pipe(Stream.flatMap(() => Stream.never)),
      ),
    }))
    const app = fixture(
      key => Effect.succeed(snapshot(key, routes)),
      subscriptions,
    )
    const fiber = Effect.runFork(app.application.start())
    try {
      await vi.waitFor(() => expect(shellAcquires).toBe(1))
      for (const routeIdentity of [
        identity('A', '1'),
        identity('B', '2'),
        identity('A', '3'),
      ]) {
        app.send(Message.RequestedRoute({ identity: routeIdentity }))
        await vi.waitFor(() =>
          expect(app.model().accepted).toEqual(Option.some(routeIdentity)),
        )
      }
      await vi.waitFor(() =>
        expect(routes).toEqual([
          'start:A:0',
          'stop:A:0',
          'start:B:0',
          'stop:B:0',
          'start:A:0',
        ]),
      )
      expect(shellAcquires).toBe(1)
      expect(shellReleases).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
    expect(shellReleases).toBe(1)
    expect(routes).toEqual([
      'start:A:0',
      'stop:A:0',
      'start:B:0',
      'stop:B:0',
      'start:A:0',
      'stop:A:0',
    ])
  })

  it('turns import failures into identity-only data and retries only on a new request', async () => {
    let loads = 0
    const app = fixture(key =>
      Effect.suspend(() => {
        loads += 1
        return loads === 1
          ? Effect.fail('import rejected')
          : Effect.succeed(snapshot(key))
      }),
    )
    const fiber = Effect.runFork(app.application.start())
    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('Home'))
      app.send(Message.RequestedRoute({ identity: identity('A', '1') }))
      await vi.waitFor(() =>
        expect(app.model().failure).toEqual(Option.some('import rejected')),
      )
      expect(loads).toBe(1)
      app.send(Message.RequestedRoute({ identity: identity('A', '2') }))
      await vi.waitFor(() => expect(document.body.textContent).toBe('A:0'))
      expect(loads).toBe(2)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('does not retry a completed identity and rejects a foreign build without importing it', async () => {
    let loads = 0
    const app = fixture(() =>
      Effect.suspend(() => {
        loads += 1
        return Effect.fail('unavailable')
      }),
    )
    const fiber = Effect.runFork(app.application.start())
    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('Home'))
      const foreignIdentity = CompositionIdentity.make({
        buildId: 'OldBuild',
        key: 'A',
        requestId: '0',
      })
      app.send(Message.RequestedRoute({ identity: foreignIdentity }))
      await vi.waitFor(() =>
        expect(Option.getOrUndefined(app.model().failure)).toContain(
          'does not match',
        ),
      )
      expect(loads).toBe(0)
      app.send(Message.RequestedRoute({ identity: identity('A', '1') }))
      await vi.waitFor(() =>
        expect(app.model().failure).toEqual(Option.some('unavailable')),
      )
      app.send(Message.RequestedRoute({ identity: identity('A', '1') }))
      app.send(Message.ClickedIncrement())
      await vi.waitFor(() => expect(app.model().count).toBe(1))
      expect(loads).toBe(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('fails startup for unavailable restored identity instead of silently rendering Home', async () => {
    const app = fixture(() => Effect.fail('missing restored module'))
    const restored = modifyFields(initialModel, {
      accepted: () => Option.some(identity('A', '1')),
    })
    const exit = await Effect.runPromiseExit(
      app.application.start(
        Schema.encodeUnknownSync(Schema.toCodecJson(Model))(restored),
      ),
    )
    expect(exit._tag).toBe('Failure')
    if (Exit.isFailure(exit)) {
      expect(Cause.pretty(exit.cause)).toContain('missing restored module')
    }
    expect(document.body.textContent).toBe('')
  })

  it('crashes post-boot loading when the root resources Layer fails instead of publishing readiness', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let loads = 0
    let readiness = 0
    const application = makeApplication<Model, Message, SharedService>({
      Model,
      init: () => ({
        model: modifyFields(initialModel, {
          requested: () => Option.some(identity('A', '1')),
        }),
      }),
      update: (model: Model) => ({ model }),
      view: (_model: Model, h: HtmlBuilder<Message>) => ({
        title: 'Home',
        body: h.div([], ['Home']),
      }),
      resources: Layer.sync(SharedService, () => {
        throw new Error('root resources failed')
      }),
      lazyComposition: {
        buildId: 'Build',
        keys: ['A'],
        requested: model => model.requested,
        accepted: model => model.accepted,
        isLifecycleMessage: () => true,
        load: () =>
          Effect.sync(() => {
            loads += 1
            return {
              update: (model: Model) => ({ model }),
              view: (_model: Model, h: HtmlBuilder<Message>) => ({
                title: 'A',
                body: h.div([], ['A']),
              }),
            }
          }),
        onLoaded: () => {
          readiness += 1
          return Message.CompletedLoadComposition({
            identity: identity('A', '1'),
          })
        },
        onFailed: (identity, reason) =>
          Message.FailedLoadComposition({ identity, reason }),
      },
      crash: {
        view: (context, h) => ({
          title: 'Crash',
          body: h.div([], [context.error.message]),
        }),
      },
      container,
    })
    const fiber = Effect.runFork(application.start())
    try {
      await vi.waitFor(() =>
        expect(document.body.textContent).toContain('root resources failed'),
      )
      expect(loads).toBe(0)
      expect(readiness).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('cleans up the same key on a new accepted generation and at runtime disposal', async () => {
    const lifecycle: Array<string> = []
    const app = fixture(key => Effect.succeed(snapshot(key, lifecycle)))
    const fiber = Effect.runFork(app.application.start())
    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('Home'))
      app.send(Message.RequestedRoute({ identity: identity('A', '1') }))
      await vi.waitFor(() => expect(lifecycle).toEqual(['start:A:0']))
      app.send(Message.RequestedRoute({ identity: identity('A', '2') }))
      await vi.waitFor(() =>
        expect(lifecycle).toEqual(['start:A:0', 'stop:A:0', 'start:A:0']),
      )
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
    expect(lifecycle).toEqual([
      'start:A:0',
      'stop:A:0',
      'start:A:0',
      'stop:A:0',
    ])
  })

  it('keeps fixed ManagedResources alive across activations and releases them only at disposal', async () => {
    const app = fixture(key => Effect.succeed(snapshot(key)))
    const fiber = Effect.runFork(app.application.start())
    try {
      await vi.waitFor(() => expect(app.acquisitions()).toBe(1))
      for (const routeIdentity of [
        identity('A', '1'),
        identity('B', '2'),
        identity('A', '3'),
      ]) {
        app.send(Message.RequestedRoute({ identity: routeIdentity }))
        await vi.waitFor(() =>
          expect(app.model().accepted).toEqual(Option.some(routeIdentity)),
        )
        app.send(Message.ClickedReadManaged())
        await vi.waitFor(() =>
          expect(app.model().serviceValue).toEqual(Option.some('managed')),
        )
      }
      expect(app.acquisitions()).toBe(1)
      expect(app.releases()).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
    expect(app.releases()).toBe(1)
  })

  it('rejects hydration before adopting a valid server handoff or loading its composition', async () => {
    const rendered = await Effect.runPromise(
      renderToString(
        {
          init: () => ({ model: initialModel }),
          view: (_model: Model, h: HtmlBuilder<Message>) => ({
            title: 'Server',
            body: h.div([], ['Server tree']),
          }),
        },
        { buildId: 'Build' },
      ),
    )
    document.body.innerHTML = rendered.html
    const serverRoot = document.querySelector<HTMLElement>('[data-foldkit-app]')
    if (serverRoot === null) {
      throw new Error('Server root missing')
    }
    container = serverRoot
    let loads = 0
    const app = fixture(key =>
      Effect.sync(() => {
        loads += 1
        return snapshot(key)
      }),
    )
    const internals = runtimeInternals.get(app.application)
    if (internals === undefined) {
      throw new Error('Runtime internals unavailable')
    }
    const exit = await Effect.runPromiseExit(
      internals.startWith(
        Option.none(),
        undefined,
        'Hydrate',
        undefined,
        'Build',
      ),
    )
    expect(exit._tag).toBe('Failure')
    if (Exit.isFailure(exit)) {
      expect(Cause.pretty(exit.cause)).toContain(
        'Lazy composition supports client rendering only',
      )
    }
    expect(document.querySelector('[data-foldkit-app]')).toBe(serverRoot)
    expect(serverRoot.textContent).toBe('Server tree')
    expect(loads).toBe(0)
  })

  it('routes ordinary live and replay Messages through their accepted implementation reducer', async () => {
    const app = fixture(key =>
      Effect.succeed({
        ...snapshot(key),
        update: (model, message) =>
          message._tag === 'ClickedIncrement'
            ? {
                model: modifyFields(model, {
                  count: count => count + (key === 'A' ? 10 : 100),
                }),
              }
            : update(model, message),
      }),
    )
    const fiber = Effect.runFork(app.application.start())
    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('Home'))
      app.send(Message.RequestedRoute({ identity: identity('A', '1') }))
      await vi.waitFor(() => expect(document.body.textContent).toBe('A:0'))
      app.send(Message.ClickedIncrement())
      await vi.waitFor(() => expect(document.body.textContent).toBe('A:10'))
      const aIncrementIndex = latestEntryIndex(
        SubscriptionRef.getUnsafe(app.store().stateRef),
      )
      app.send(Message.RequestedRoute({ identity: identity('B', '2') }))
      await vi.waitFor(() => expect(document.body.textContent).toBe('B:10'))
      app.send(Message.ClickedIncrement())
      await vi.waitFor(() => expect(document.body.textContent).toBe('B:110'))
      await Effect.runPromise(app.store().jumpTo(aIncrementIndex))
      expect(document.body.textContent).toBe('A:10')
      await Effect.runPromise(app.store().resume)
      await vi.waitFor(() => expect(document.body.textContent).toBe('B:110'))
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('loads restored accepted identity before rendering and replays each historical implementation', async () => {
    const loaded: Array<string> = []
    const app = fixture(key =>
      Effect.sync(() => {
        loaded.push(key)
        return snapshot(key)
      }),
    )
    const restored = modifyFields(initialModel, {
      accepted: () => Option.some(identity('A', '1')),
    })
    const fiber = Effect.runFork(
      app.application.start(
        Schema.encodeUnknownSync(Schema.toCodecJson(Model))(restored),
      ),
    )
    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('A:0'))
      expect(loaded).toEqual(['A'])
      app.send(Message.RequestedRoute({ identity: identity('B', '2') }))
      await vi.waitFor(() => expect(document.body.textContent).toBe('B:0'))
      const acceptedBIndex = latestEntryIndex(
        SubscriptionRef.getUnsafe(app.store().stateRef),
      )
      app.send(Message.ClickedIncrement())
      await vi.waitFor(() => expect(document.body.textContent).toBe('B:1'))
      await Effect.runPromise(app.store().jumpTo(acceptedBIndex))
      expect(document.body.textContent).toBe('B:0')
      await Effect.runPromise(app.store().resume)
      await vi.waitFor(() => expect(document.body.textContent).toBe('B:1'))
      await Effect.runPromise(app.store().jumpTo(-1))
      expect(document.body.textContent).toBe('A:0')
      await Effect.runPromise(app.store().resume)
      await vi.waitFor(() => expect(document.body.textContent).toBe('B:1'))
      expect(loaded).toEqual(['A', 'B'])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('activates an element Html implementation without owning document metadata', async () => {
    let dispatch: ((message: Message) => void) | undefined
    document.title = 'Host title'
    const mutableComposition: {
      update: typeof update
      view: (model: Model, h: HtmlBuilder<Message>) => Html
    } = {
      update,
      view: (_model, h) => {
        dispatch = __requireDispatch()
        return h.div([], ['Element A'])
      },
    }
    const application = makeElement({
      Model,
      init: () => ({ model: initialModel }),
      update,
      view: (_model, h) => {
        dispatch = __requireDispatch()
        return h.div([], ['Element home'])
      },
      resources: Layer.succeed(SharedService, 'shared'),
      managedResources: ManagedResource.make<Model, Message>()(entry => ({
        engine: entry(Schema.Struct({}), {
          resource: Engine,
          modelToMaybeRequirements: () => ({}),
          acquire: () => Effect.succeed('managed'),
          release: () => Effect.void,
          onAcquired: () => Message.AcquiredManaged(),
          onReleased: () => Message.ReleasedManaged(),
          onAcquireError: () => Message.ReleasedManaged(),
        }),
      })),
      lazyComposition: {
        buildId: 'Build',
        keys: ['A'],
        requested: model => model.requested,
        accepted: model => model.accepted,
        isLifecycleMessage: Schema.is(
          Schema.Union([
            Message.RequestedRoute,
            Message.CompletedLoadComposition,
            Message.FailedLoadComposition,
            Message.ReturnedHome,
          ]),
        ),
        load: () => Effect.succeed(mutableComposition),
        onLoaded: identity => Message.CompletedLoadComposition({ identity }),
        onFailed: (identity, reason) =>
          Message.FailedLoadComposition({ identity, reason }),
      },
      container,
    })
    const fiber = Effect.runFork(application.start())
    try {
      await vi.waitFor(() =>
        expect(document.body.textContent).toBe('Element home'),
      )
      if (dispatch === undefined) {
        throw new Error('Element has not rendered')
      }
      dispatch(Message.RequestedRoute({ identity: identity('A', '1') }))
      await vi.waitFor(() =>
        expect(document.body.textContent).toBe('Element A'),
      )
      mutableComposition.view = (_model, h) => h.div([], ['Mutated element'])
      dispatch(Message.ClickedIncrement())
      await vi.waitFor(() =>
        expect(document.body.textContent).toBe('Element A'),
      )
      dispatch(Message.ReturnedHome())
      await vi.waitFor(() =>
        expect(document.body.textContent).toBe('Element home'),
      )
      dispatch(Message.RequestedRoute({ identity: identity('A', '2') }))
      await vi.waitFor(() =>
        expect(document.body.textContent).toBe('Element A'),
      )
      expect(document.title).toBe('Host title')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
