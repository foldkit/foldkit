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
import * as Program from '../runtime/programPublic.js'
import { __startProgram } from '../runtime/start.js'
import { modifyFields } from '../struct/index.js'
import { makeNamespace } from './define.js'
import * as Block from './public.js'

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

  const ChildNamespace = makeNamespace('LifecycleChild')

  const ChildModel = Schema.Struct({ id: Schema.String })

  const ChildMessage = defineMessageUnion({
    AcquiredSession: {},
    CompletedObservePanel: {},
    FailedAcquireSession: {},
    ReleasedSession: {},
  })

  const Session = ChildNamespace.makeResource<string>()('Session')

  const ChildChannelsDefinition = ChildNamespace.makeDefinition({
    Model: ChildModel,
    Message: ChildMessage,
  })

  const subscriptions = ChildChannelsDefinition.makeSubscriptions(entry => ({
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

  const managedResources = ChildChannelsDefinition.makeManagedResources(
    entry => ({
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
    }),
  )

  const ObservePanel = ChildNamespace.makeMount('ObservePanel', {
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

  const childComposition = ChildNamespace.makeDefinition({
    Model: ChildModel,
    Message: ChildMessage,
  }).makeComposition({
    mounts: [ObservePanel],
  })
  const childView = childComposition.makeView((model, h) =>
    h.div([h.OnMount(ObservePanel())], [`child:${model.id}`]),
  )
  const prepareChild = () =>
    childComposition.prepareBlock({
      view: childView,
      init: () => ({ model: ChildModel.make({ id: 'one' }) }),
      update: childComposition.makeUpdate({
        AcquiredSession: model => ({ model }),
        CompletedObservePanel: model => ({ model }),
        FailedAcquireSession: model => ({ model }),
        ReleasedSession: model => ({ model }),
      }),
      subscriptions,
      managedResources,
      EffectsLayer: Layer.mergeAll(
        subscriptions.activity.layer,
        managedResources.session.layer,
        ObservePanel.layer,
      ),
    })
  const Child: Block.FromAssemblyWithView<
    typeof ChildModel,
    typeof prepareChild
  > = Block.assemble(prepareChild)

  const ParentModel = Schema.Struct({
    maybeChild: Schema.Option(ChildModel),
    route: Schema.Literals(['Home', 'Away']),
  })
  type ParentModel = typeof ParentModel.Type
  const ParentMessage = defineMessageUnion({
    RemovedChild: {},
  })

  const ParentBaseDefinition = Block.makeDefinition('Application', {
    Model: ParentModel,
    Message: ParentMessage,
  })
  const ChildBinding = (() => {
    if (mode === 'Route') {
      return ParentBaseDefinition.makeBinding(Child, {
        placement: 'child',
        field: 'maybeChild',
        presentWhen: (model: ParentModel) => model.route === 'Home',
      })
    }

    if (mode === 'Subscriptions') {
      return ParentBaseDefinition.makeBinding(Child, {
        placement: 'child',
        field: 'maybeChild',
        subscriptions: {
          when: (model: ParentModel) => model.route === 'Home',
        },
      })
    }

    return ParentBaseDefinition.makeBinding(Child, {
      placement: 'child',
      field: 'maybeChild',
    })
  })()

  const composition = ParentBaseDefinition.makeComposition({
    bindings: [ChildBinding],
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
  const update = composition.makeUpdate({
    RemovedChild: model => ({
      model: modifyFields(model, {
        maybeChild: current => (mode === 'Option' ? Option.none() : current),
        route: () => 'Away',
      }),
    }),
  })

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

    const prepare = () =>
      composition.prepareBlock({
        init,
        update,
        view,
        EffectsLayer: Layer.empty,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof composition.Model,
      typeof prepare
    > = Block.assemble(prepare)

    const provided = Program.makeElement({
      block: completedBlock,
      container,
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
  const prepare = () =>
    composition.prepareBlock({
      init,
      update,
      view,
    })
  const completedBlock: Block.FromAssemblyWithView<
    typeof composition.Model,
    typeof prepare
  > = Block.assemble(prepare)

  const application = Program.makeElement({
    block: completedBlock,
    container,
  })
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
