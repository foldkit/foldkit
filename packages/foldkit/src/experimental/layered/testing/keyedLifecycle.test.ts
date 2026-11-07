import { Array, Effect, Layer, Option, Record, Schema, Stream } from 'effect'
import { describe, expect, vi } from 'vitest'

import { it } from '@effect/vitest'

import * as Block from '../../../block/public.js'
import { defineMessageUnion } from '../../../message/index.js'
import * as Scene from '../../../scene/public.js'
import { modifyFields } from '../../../struct/index.js'

const ChildModel = Schema.Struct({
  label: Schema.String,
  count: Schema.Number,
  isSessionRequested: Schema.Boolean,
  session: Schema.String,
})
const ChildMessage = defineMessageUnion({
  ObservedTick: {},
  AcquiredSession: { value: Schema.String },
  ClickedCloseSession: {},
  ReleasedSession: {},
  FailedAcquireSession: {},
})
const ChildOutMessage = defineMessageUnion({
  OpenedSession: { value: Schema.String },
})
const ChildKey = Symbol('KeyedLifecycleSceneChild')
const ChildBlock = Block.make('KeyedLifecycleSceneChild', {
  key: ChildKey,
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const Session = ChildBlock.makeResource<string>()('Session')
const subscriptionHandlerConstructed = vi.fn()
const resourceHandlerConstructed = vi.fn()
const subscriptions = ChildBlock.makeSubscriptions(entry => ({
  ticks: entry('Ticks', {
    messages: [ChildMessage.ObservedTick],
    handler: function* () {
      subscriptionHandlerConstructed()

      return () => Stream.never
    },
  }),
}))
const unregisteredSubscriptions = ChildBlock.makeSubscriptions(entry => ({
  ticks: entry('UnregisteredTicks', {
    messages: [ChildMessage.ObservedTick],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))
const managedResources = ChildBlock.makeManagedResources(entry => ({
  session: entry('Session', Schema.Option(Schema.Null), {
    resource: Session,
    modelToMaybeRequirements: model =>
      model.isSessionRequested ? Option.some(null) : Option.none(),
    onAcquired: value => ChildMessage.AcquiredSession({ value }),
    onReleased: ChildMessage.ReleasedSession,
    onAcquireError: () => ChildMessage.FailedAcquireSession(),
    handler: function* () {
      resourceHandlerConstructed()

      return {
        acquire: () => Effect.succeed('session'),
        release: () => Effect.void,
      }
    },
  }),
}))
const ChildComposition = ChildBlock.makeComposition()
const childLayer = ChildBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: ChildComposition.makeInit(() => ({
      model: ChildModel.make({
        label: 'unused',
        count: 0,
        isSessionRequested: true,
        session: 'Requested',
      }),
    })),
    update: ChildComposition.makeUpdate({
      ObservedTick: model => ({
        model: modifyFields(model, { count: count => count + 1 }),
      }),
      AcquiredSession: (model, { value }) => ({
        model: modifyFields(model, { session: () => `Open:${value}` }),
        outMessage: ChildOutMessage.OpenedSession({ value }),
      }),
      ClickedCloseSession: model => ({
        model: modifyFields(model, {
          isSessionRequested: () => false,
          session: () => 'Closing',
        }),
      }),
      ReleasedSession: model => ({
        model: modifyFields(model, { session: () => 'Released' }),
      }),
      FailedAcquireSession: model => ({
        model: modifyFields(model, { session: () => 'Failed' }),
      }),
    }),
    view: ChildComposition.makeView((model, h) =>
      h.section(
        [h.AriaLabel(model.label)],
        [
          h.p([], [`${model.label}:${model.count}:${model.session}`]),
          h.button(
            [h.OnClick(ChildMessage.ClickedCloseSession())],
            [`Close ${model.label}`],
          ),
        ],
      ),
    ),
    subscriptions,
    managedResources,
    EffectsLayer: Layer.merge(
      subscriptions.ticks.layer,
      managedResources.layer,
    ),
  }),
)

const ParentModel = Schema.Struct({
  children: Schema.Record(Schema.String, ChildModel),
  sessionOpens: Schema.Number,
})
const ParentKey = Symbol('KeyedLifecycleSceneParent')
const ParentBlock = Block.make('KeyedLifecycleSceneParent', {
  key: ParentKey,
  Model: ParentModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const foldChildOutMessage = ParentBlock.makeOutMessageFold(ChildBlock, {
  OpenedSession: () =>
    ParentBlock.makeFieldsStep(() => ({
      sessionOpens: count => count + 1,
    })),
})
const ChildrenBinding = ParentBlock.makeRecordBinding(ChildBlock, {
  field: 'children',
  subscriptions: { when: (_model, key) => key !== 'paused' },
}).withOutMessagePolicy({ fold: foldChildOutMessage })
const ParentComposition = ParentBlock.makeComposition({
  bindings: [ChildrenBinding],
})

const childModel = (label: string, count: number): typeof ChildModel.Type =>
  ChildModel.make({
    label,
    count,
    isSessionRequested: true,
    session: 'Requested',
  })

const parentLayer = ParentBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ChildrenBinding

    return {
      children: [children],
      init: ParentComposition.makeInit(() => ({
        model: ParentModel.make({
          children: {
            first: childModel('first', 0),
            second: childModel('second', 10),
            paused: childModel('paused', 20),
          },
          sessionOpens: 0,
        }),
      })),
      update: ParentComposition.makeUpdate({}),
      view: ParentComposition.makeView((model, h) =>
        h.main(
          [],
          [
            h.p(
              [h.Role('status'), h.AriaLabel('Session opens')],
              [`${model.sessionOpens}`],
            ),
            ...Array.map(Record.toEntries(model.children), ([key, child]) =>
              h.block(
                ChildrenBinding.embedView({
                  slotId: key,
                  key,
                  model: child,
                }),
              ),
            ),
          ],
        ),
      ),
    }
  }),
).pipe(Layer.provide(childLayer))

const firstTicks = Scene.Subscription.at(
  ChildrenBinding,
  'first',
  subscriptions.ticks,
)
const secondTicks = Scene.Subscription.at(
  ChildrenBinding,
  'second',
  subscriptions.ticks,
)
const pausedTicks = Scene.Subscription.at(
  ChildrenBinding,
  'paused',
  subscriptions.ticks,
)
const missingTicks = Scene.Subscription.at(
  ChildrenBinding,
  'missing',
  subscriptions.ticks,
)
const unregisteredTicks = Scene.Subscription.at(
  ChildrenBinding,
  'first',
  unregisteredSubscriptions.ticks,
)
const firstSession = Scene.ManagedResource.at(
  ChildrenBinding,
  'first',
  managedResources.session,
)
const secondSession = Scene.ManagedResource.at(
  ChildrenBinding,
  'second',
  managedResources.session,
)
const missingSession = Scene.ManagedResource.at(
  ChildrenBinding,
  'missing',
  managedResources.session,
)
describe('canonical keyed child Scene lifecycles', () => {
  it.effect(
    'resolves selected Layer sources by Binding placement without executing handlers',
    () =>
      Effect.gen(function* () {
        yield* Scene.scene(
          { block: ParentBlock, layer: parentLayer },
          Scene.init(),
          Scene.Subscription.expectActive(firstTicks),
          Scene.Subscription.expectActive(secondTicks),
          Scene.Subscription.expectInactive(pausedTicks),
          Scene.Subscription.emit(firstTicks, ChildMessage.ObservedTick()),
          Scene.expect(Scene.text('first:1:Requested')).toExist(),
          Scene.expect(Scene.text('second:10:Requested')).toExist(),
          Scene.Subscription.emit(secondTicks, ChildMessage.ObservedTick()),
          Scene.expect(Scene.text('second:11:Requested')).toExist(),
          Scene.ManagedResource.acquire(firstSession, 'first-session'),
          Scene.expect(Scene.text('first:1:Open:first-session')).toExist(),
          Scene.expect(
            Scene.role('status', { name: 'Session opens' }),
          ).toHaveText('1'),
          Scene.click(Scene.role('button', { name: 'Close first' })),
          Scene.ManagedResource.release(firstSession),
          Scene.expect(Scene.text('first:1:Released')).toExist(),
          Scene.ManagedResource.acquire(secondSession, 'second-session'),
          Scene.expect(Scene.text('second:11:Open:second-session')).toExist(),
          Scene.expect(
            Scene.role('status', { name: 'Session opens' }),
          ).toHaveText('2'),
        )

        expect(subscriptionHandlerConstructed).not.toHaveBeenCalled()
        expect(resourceHandlerConstructed).not.toHaveBeenCalled()
      }),
  )

  it('rejects absent selected occurrences before lifecycle delivery', async () => {
    await expect(
      Effect.runPromise(
        Scene.scene(
          { block: ParentBlock, layer: parentLayer },
          Scene.init(),
          Scene.Subscription.emit(missingTicks, ChildMessage.ObservedTick()),
        ),
      ),
    ).rejects.toThrow('absent from the current Model')

    await expect(
      Effect.runPromise(
        Scene.scene(
          { block: ParentBlock, layer: parentLayer },
          Scene.init(),
          Scene.ManagedResource.acquire(missingSession, 'missing-session'),
        ),
      ),
    ).rejects.toThrow('absent from the current Model')
  })

  it('rejects an unregistered selected Subscription source', async () => {
    await expect(
      Effect.runPromise(
        Scene.scene(
          { block: ParentBlock, layer: parentLayer },
          Scene.init(),
          Scene.Subscription.emit(
            unregisteredTicks,
            ChildMessage.ObservedTick(),
          ),
        ),
      ),
    ).rejects.toThrow('selected a Subscription not registered in the Scene')
  })
})
