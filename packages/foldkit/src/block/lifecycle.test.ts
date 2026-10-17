import {
  Effect,
  Fiber,
  Layer,
  Option,
  Schema,
  type Scope,
  Stream,
} from 'effect'
import { afterEach, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { define as defineApplication } from '../runtime/applicationPublic.js'
import { __startProgram } from '../runtime/start.js'
import { modifyFields } from '../struct/index.js'
import { define } from './define.js'

type LifecycleEvent =
  | 'Mount acquired'
  | 'Mount handler built'
  | 'Mount handler released'
  | 'Mount released'
  | 'ManagedResource acquired'
  | 'ManagedResource handler built'
  | 'ManagedResource handler released'
  | 'ManagedResource released'
  | 'Subscription handler built'
  | 'Subscription handler released'
  | 'Subscription observed resource'
  | 'Subscription started'
  | 'Subscription stopped'

const buildGraph = (
  events: Array<LifecycleEvent>,
  mode: 'Option' | 'Route' | 'Subscriptions' = 'Option',
) => {
  const trackHandler = (
    built: LifecycleEvent,
    released: LifecycleEvent,
  ): Effect.Effect<void, never, Scope.Scope> =>
    Effect.acquireRelease(
      Effect.sync(() => {
        events.push(built)
      }),
      () =>
        Effect.sync(() => {
          events.push(released)
        }),
    )

  const ChildOwner = define('LifecycleChild')

  const ChildModel = Schema.Struct({ id: Schema.String })
  type ChildModel = typeof ChildModel.Type

  const ChildMessage = defineMessageUnion({
    AcquiredSession: {},
    CompletedObservePanel: {},
    FailedAcquireSession: {},
    ReleasedSession: {},
  })
  type ChildMessage = typeof ChildMessage.Type

  const Session = ChildOwner.resource<string>()('Session')

  const childChannels = ChildOwner.define({
    Model: ChildModel,
    Message: ChildMessage,
  })

  const subscriptions = childChannels.subscriptions(entry => ({
    activity: entry('ObserveActivity', {
      messages: [],
      handler: function* () {
        yield* trackHandler(
          'Subscription handler built',
          'Subscription handler released',
        )

        return () =>
          Stream.fromEffect(
            Effect.sync(() => {
              events.push('Subscription started')
            }),
          ).pipe(
            Stream.flatMap(() => Stream.never),
            Stream.ensuring(
              Session.get.pipe(
                Effect.orDie,
                Effect.tap(() =>
                  Effect.sync(() => {
                    events.push('Subscription observed resource')
                  }),
                ),
                Effect.andThen(
                  Effect.sync(() => {
                    events.push('Subscription stopped')
                  }),
                ),
              ),
            ),
          )
      },
    }),
  }))

  const managedResources = childChannels.managedResources(entry => ({
    session: entry('ManageSession', Schema.Option(Schema.Null), {
      resource: Session,
      modelToMaybeRequirements: () => Option.some(null),
      onAcquired: () => ChildMessage.AcquiredSession(),
      onReleased: () => ChildMessage.ReleasedSession(),
      onAcquireError: () => ChildMessage.FailedAcquireSession(),
      handler: function* () {
        yield* trackHandler(
          'ManagedResource handler built',
          'ManagedResource handler released',
        )

        return {
          acquire: () =>
            Effect.sync(() => {
              events.push('ManagedResource acquired')
              return 'session'
            }),
          release: () =>
            Effect.sync(() => {
              events.push('ManagedResource released')
            }),
        }
      },
    }),
  }))

  const ObservePanel = ChildOwner.mount('ObservePanel', {
    messages: [ChildMessage.CompletedObservePanel],
    handler: function* () {
      yield* trackHandler('Mount handler built', 'Mount handler released')

      return () =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              events.push('Mount acquired')
            }),
            () =>
              Effect.sync(() => {
                events.push('Mount released')
              }),
          )

          return ChildMessage.CompletedObservePanel()
        })
    },
  })

  const childBase = ChildOwner.define({
    Model: ChildModel,
    Message: ChildMessage,
  })
  const childComposition = childBase.makeComposition({ mounts: [ObservePanel] })
  const childView = childComposition.makeView((model, h) =>
    h.div([h.OnMount(ObservePanel())], [`child:${model.id}`]),
  )
  const Child = childComposition.makeBlock({
    view: childView,
    init: () => ({ model: ChildModel.make({ id: 'one' }) }),
    update: (model, message) =>
      ChildMessage.match(message, {
        AcquiredSession: () => ({ model }),
        CompletedObservePanel: () => ({ model }),
        FailedAcquireSession: () => ({ model }),
        ReleasedSession: () => ({ model }),
      }),
    subscriptions,
    managedResources,
    EffectsLayer: Layer.mergeAll(
      subscriptions.activity.layer,
      managedResources.session.layer,
      ObservePanel.layer,
    ),
  })

  const ParentModel = Schema.Struct({
    maybeChild: Schema.Option(ChildModel),
    route: Schema.Literals(['Home', 'Away']),
  })
  type ParentModel = typeof ParentModel.Type
  const ParentMessage = defineMessageUnion({
    GotChildMessage: { message: ChildMessage },
    RemovedChild: {},
  })
  type ParentMessage = typeof ParentMessage.Type

  const parentBase = defineApplication({
    Model: ParentModel,
    Message: ParentMessage,
  })
  const ChildBinding = (() => {
    if (mode === 'Route') {
      return parentBase.bindChild(Child, {
        fromParentMessage: false,
        placement: 'child',
        field: 'maybeChild',
        presentWhen: (model: ParentModel) => model.route === 'Home',
        parentMessage: ParentMessage.GotChildMessage,
      })
    }

    if (mode === 'Subscriptions') {
      return parentBase.bindChild(Child, {
        fromParentMessage: false,
        placement: 'child',
        field: 'maybeChild',
        subscriptions: {
          when: (model: ParentModel) => model.route === 'Home',
        },
        parentMessage: ParentMessage.GotChildMessage,
      })
    }

    return parentBase.bindChild(Child, {
      fromParentMessage: false,
      placement: 'child',
      field: 'maybeChild',
      parentMessage: ParentMessage.GotChildMessage,
    })
  })()

  const composition = parentBase.makeComposition({
    childBindings: [ChildBinding],
  })
  const view = composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button([h.OnClick(ParentMessage.RemovedChild())], ['remove child']),
        Option.match(model.maybeChild, {
          onNone: () => h.p([], ['child removed']),
          onSome: childModel =>
            mode === 'Route' && model.route !== 'Home'
              ? h.p([], ['child removed'])
              : h.block(
                  ChildBinding.embedView({
                    slotId: 'child',
                    model: childModel,
                  }),
                ),
        }),
      ],
    ),
  )
  const init = () => ({
    model: ParentModel.make({
      maybeChild: Option.some(Child.init().model),
      route: 'Home',
    }),
  })
  const update = composition.makeUpdate((model, message) =>
    ParentMessage.match(message, {
      GotChildMessage: ({ message: childMessage }) =>
        ChildBinding.fold(model, childMessage),
      RemovedChild: () => ({
        model: modifyFields(model, {
          maybeChild: current => (mode === 'Option' ? Option.none() : current),
          route: () => 'Away',
        }),
      }),
    }),
  )

  return { composition, init, update, view }
}

afterEach(() => {
  document.body.innerHTML = ''
})

it.each(['Option', 'Route'] as const)(
  'keeps %s field presence scoped to the application and child placement lifetimes',
  async mode => {
    const events: Array<LifecycleEvent> = []
    const { composition, init, update, view } = buildGraph(events, mode)
    const container = document.createElement('div')
    container.id = 'block-lifecycle-test'
    document.body.appendChild(container)

    const provided = composition.makeElement({
      container,
      init,
      update,
      view,
      EffectsLayer: Layer.empty,
    })

    expect(events).toEqual([])

    const fiber = Effect.runFork(__startProgram(provided, undefined, 'Fresh'))

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('child:one')
        expect(events).toEqual(
          expect.arrayContaining([
            'Subscription handler built',
            'Subscription started',
            'ManagedResource handler built',
            'ManagedResource acquired',
            'Mount handler built',
            'Mount acquired',
          ]),
        )
      })

      expect(
        events.filter(event => event.endsWith('handler built')),
      ).toHaveLength(3)

      document.body.querySelector('button')?.click()

      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('child removed')
        expect(events).toEqual(
          expect.arrayContaining([
            'Subscription stopped',
            'Subscription observed resource',
            'ManagedResource released',
            'Mount released',
          ]),
        )
      })

      expect(events.indexOf('Subscription stopped')).toBeLessThan(
        events.indexOf('ManagedResource released'),
      )

      expect(events.some(event => event.endsWith('handler released'))).toBe(
        false,
      )
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }

    expect(events.filter(event => event.endsWith('handler released'))).toEqual(
      expect.arrayContaining([
        'Subscription handler released',
        'ManagedResource handler released',
        'Mount handler released',
      ]),
    )
    expect(
      events.filter(event => event.endsWith('handler released')),
    ).toHaveLength(3)
  },
)

it('gates only Subscription Streams while the direct-field child remains present', async () => {
  const events: Array<LifecycleEvent> = []
  const { composition, init, update, view } = buildGraph(
    events,
    'Subscriptions',
  )
  const container = document.createElement('div')
  container.id = 'block-subscription-only-lifecycle-test'
  document.body.appendChild(container)
  const application = composition.makeElement({ container, init, update, view })
  const fiber = Effect.runFork(__startProgram(application, undefined, 'Fresh'))

  try {
    await vi.waitFor(() => {
      expect(events).toEqual(
        expect.arrayContaining([
          'Subscription started',
          'ManagedResource acquired',
          'Mount acquired',
        ]),
      )
    })

    document.body.querySelector('button')?.click()

    await vi.waitFor(() => {
      expect(events).toContain('Subscription stopped')
    })

    expect(events).not.toContain('ManagedResource released')
    expect(events).not.toContain('Mount released')
    expect(events.some(event => event.endsWith('handler released'))).toBe(false)
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }

  expect(events).toEqual(
    expect.arrayContaining([
      'ManagedResource released',
      'Mount released',
      'Subscription handler released',
    ]),
  )
})
