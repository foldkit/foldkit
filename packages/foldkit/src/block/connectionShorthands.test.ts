import {
  Array,
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  Stream,
  Tuple,
} from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import type * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import { aggregateChildren, inspectBinding } from './binding.js'
import { makeDefinition } from './define.js'
import { normalizeConnectionConfig } from './directConnection.js'
import { ViewScopeTypeId } from './identity.js'
import * as Block from './public.js'
import type { Qualify } from './scope.js'

class ValueSource extends Context.Service<
  ValueSource,
  Readonly<{ value: number }>
>()('ConnectionShorthands/ValueSource') {}

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  RequestedRead: {},
  RequestedReadOperation: {},
  CompletedRead: { count: Schema.Number },
  ObservedTick: {},
  CompletedObserve: {},
  AcquiredSession: {},
  ReleasedSession: {},
  FailedAcquireSession: {},
})
type Message = typeof Message.Type
const OutMessage = defineMessageUnion({ ReadRequested: {} })
type OutMessage = typeof OutMessage.Type
const Child = makeDefinition('Child', { Model, Message, OutMessage })
const Read = Child.makeCommand('Read', {
  messages: [Message.CompletedRead],
  handler: function* () {
    const source = yield* ValueSource

    return () => Effect.succeed(Message.CompletedRead({ count: source.value }))
  },
})
const Observe = Child.makeMount('Observe', {
  messages: [Message.CompletedObserve],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedObserve())
  },
})
const Session = Child.makeResource<string>()('Session')
const subscriptions = Child.makeSubscriptions(entry => ({
  ticks: entry('Ticks', {
    messages: [Message.ObservedTick],
    handler: function* () {
      return () => Stream.succeed(Message.ObservedTick())
    },
  }),
}))
const managedResources = Child.makeManagedResources(entry => ({
  session: entry('ManageSession', Schema.Option(Schema.Null), {
    resource: Session,
    modelToMaybeRequirements: () => Option.some(null),
    onAcquired: () => Message.AcquiredSession(),
    onReleased: Message.ReleasedSession,
    onAcquireError: () => Message.FailedAcquireSession(),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('session'),
        release: () => Effect.void,
      }
    },
  }),
}))
const registered = Child.makeComposition({ mounts: [Observe] })
const view = registered.makeView((model, h) =>
  h.div([h.OnMount(Observe())], [globalThis.String(model.count)]),
)
const childUpdate = registered.makeUpdate({
  RequestedRead: model => ({
    model,
    commands: [Read()],
    outMessage: OutMessage.ReadRequested(),
  }),
  RequestedReadOperation: model => ({ model, commands: [Read()] }),
  CompletedRead: (model, { count }) => ({
    model: modifyFields(model, { count: () => count }),
  }),
  ObservedTick: model => ({ model }),
  CompletedObserve: model => ({ model }),
  AcquiredSession: model => ({ model }),
  ReleasedSession: model => ({ model }),
  FailedAcquireSession: model => ({ model }),
})
const prepareBlock = () =>
  registered.prepareBlock({
    init: () => ({ model: Model.make({ count: 0 }) }),
    update: childUpdate,
    view,
    subscriptions,
    managedResources,
    EffectsLayer: Layer.mergeAll(
      Read.layer,
      Observe.layer,
      subscriptions.ticks.layer,
      managedResources.session.layer,
    ),
    operations: {
      read: () => Tuple.make(Message.RequestedReadOperation()),
    },
  })
const block: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepareBlock
> = Block.assemble(prepareBlock)
const Entry = Schema.Struct({ id: Schema.String, child: Model })
type Entry = typeof Entry.Type
const ParentModel = Schema.Struct({
  primary: Model,
  secondary: Model,
  requests: Schema.Number,
  entries: Schema.Array(Entry),
})
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({
  ReceivedForeignMessage: { message: Schema.String },
  RequestedReadOperation: {},
})
type ParentMessage = typeof ParentMessage.Type
const LegacyParentMessage = defineMessageUnion({
  GotChildMessage: { message: Message },
  GotEntryMessage: { id: Schema.String, message: Message },
})
type LegacyParentMessage = typeof LegacyParentMessage.Type
const Parent = makeDefinition('ConnectionShorthandsParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const foldChildOutMessage = OutMessage.match<
  Update.Step<ParentModel, ParentMessage>
>({
  ReadRequested: () => model => ({
    model: modifyFields(model, { requests: requests => requests + 1 }),
  }),
})
const PrimaryBinding = Parent.makeBinding(block, {
  field: 'primary',
}).withOutMessagePolicy({ fold: foldChildOutMessage })
const primaryInspection = inspectBinding(PrimaryBinding)
const SecondaryBinding = Parent.makeBinding(block, {
  field: 'secondary',
}).withOutMessagePolicy({ fold: foldChildOutMessage })
const OverriddenBinding = Parent.makeBinding(block, {
  field: 'secondary',
  placement: 'alternate',
}).withOutMessagePolicy({ fold: foldChildOutMessage })
const AccessorBinding = Parent.makeBinding(block, {
  read: model => Option.some(model.primary),
  write: (model, nextPrimary) =>
    modifyFields(model, { primary: () => nextPrimary }),
}).withOutMessagePolicy({ fold: foldChildOutMessage })
const entryKey = (entry: Entry): string => entry.id
const KeyedBinding = Parent.makeBinding(block, {
  placement: 'entries',
  readAll: (model: ParentModel) => model.entries,
  key: entryKey,
  keySchema: Schema.String,
  read: (entry: Entry) => entry.child,
  writeAt: (model: ParentModel, id: string, nextChild: Model) =>
    modifyFields(model, {
      entries: Array.map(entry =>
        entry.id === id
          ? modifyFields(entry, { child: () => nextChild })
          : entry,
      ),
    }),
}).withOutMessagePolicy({
  fold: (_key: string, outMessage: OutMessage) =>
    foldChildOutMessage(outMessage),
})
const ParentComposition = Parent.makeComposition({
  bindings: [PrimaryBinding, KeyedBinding],
})
const update = ParentComposition.makeUpdate({
  ReceivedForeignMessage: model => Parent.makeNoopStep()(model),
  RequestedReadOperation: model => PrimaryBinding.read()(model),
})

const keyedUpdate = update

const initial = ParentModel.make({
  primary: Model.make({ count: 1 }),
  secondary: Model.make({ count: 2 }),
  requests: 0,
  entries: [Entry.make({ id: 'first', child: Model.make({ count: 3 }) })],
})

it('keeps exact placement literals and child operation arguments', () => {
  expectTypeOf<Extract<keyof typeof PrimaryBinding, string>>().toEqualTypeOf<
    | 'placement'
    | 'init'
    | 'fold'
    | 'embedView'
    | 'read'
    | 'withOutMessagePolicy'
  >()
  expectTypeOf(PrimaryBinding.placement).toEqualTypeOf<'primary'>()
  expectTypeOf(SecondaryBinding.placement).toEqualTypeOf<'secondary'>()
  expectTypeOf(OverriddenBinding.placement).toEqualTypeOf<'alternate'>()
  expectTypeOf(AccessorBinding.placement).toEqualTypeOf<'Child'>()
  expectTypeOf(KeyedBinding.placement).toEqualTypeOf<'entries'>()
  expectTypeOf(
    update(initial, {
      _tag: 'GotPrimaryMessage',
      placement: 'primary',
      generation: 0,
      message: Message.RequestedRead(),
    }).model,
  ).toEqualTypeOf<ParentModel>()
  expectTypeOf<Parameters<typeof PrimaryBinding.read>>().toEqualTypeOf<[]>()
  expectTypeOf<
    Update.RequirementsOf<typeof PrimaryBinding.fold>
  >().toEqualTypeOf<Qualify<'primary', Command.HandlerOf<typeof Read>>>()
  expectTypeOf<
    Layer.Services<typeof primaryInspection.EffectsLayer>
  >().toEqualTypeOf<ValueSource>()
  expectTypeOf<
    Layer.Error<typeof primaryInspection.EffectsLayer>
  >().toEqualTypeOf<never>()
  expectTypeOf<(typeof primaryInspection.mounts)[number]>().toEqualTypeOf<
    typeof Observe
  >()
  expect(PrimaryBinding.placement).toBe('primary')
  expect(SecondaryBinding.placement).toBe('secondary')
  expect(OverriddenBinding.placement).toBe('alternate')
  expect(AccessorBinding.placement).toBe('Child')
  expect(Object.keys(PrimaryBinding)).toEqual([
    'placement',
    'init',
    'fold',
    'embedView',
    'read',
  ])
  expect(Object.keys(KeyedBinding)).toEqual([
    'placement',
    'init',
    'fold',
    'embedView',
    'read',
  ])
  expect(inspectBinding(KeyedBinding).subscriptions).toEqual({})
  expect(inspectBinding(KeyedBinding).managedResources).toEqual({})
  expect(Array.head(primaryInspection.mounts)).toEqual(Option.some(Observe))
})

it('lifts real Command execution through the constructor and preserves OutMessage handling', async () => {
  const result = update(initial, {
    _tag: 'GotPrimaryMessage',
    placement: 'primary',
    generation: 0,
    message: Message.RequestedRead(),
  })
  const command = Option.getOrThrow(Array.head(result.commands!))
  const operation = Option.getOrThrow(
    Array.head(
      update(initial, ParentMessage.RequestedReadOperation()).commands!,
    ),
  )
  const services = aggregateChildren([
    PrimaryBinding,
    KeyedBinding,
  ]).EffectsLayer.pipe(Layer.provide(Layer.succeed(ValueSource, { value: 42 })))
  const completed = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const context = yield* Layer.build(services)
        return yield* Effect.provideContext(command.effect, context)
      }),
    ),
  )

  expect(result.model.requests).toBe(1)
  expect(command.name).toBe('primary/Read')
  expect(operation.name).toBe('primary/Read')
  expect(completed).toEqual({
    _tag: 'GotPrimaryMessage',
    placement: 'primary',
    generation: 0,
    message: Message.CompletedRead({ count: 42 }),
  })
  const updated = update(result.model, completed)

  expect(updated.model.primary.count).toBe(42)
  expect(initial.primary.count).toBe(1)
})

it('uses one resolved occurrence placement for lifecycle registrations and mounted views', () => {
  const graph = aggregateChildren([PrimaryBinding, SecondaryBinding])
  const primaryEmbed = PrimaryBinding.embedView({
    slotId: 'primary',
    model: initial.primary,
  })
  const secondaryEmbed = SecondaryBinding.embedView({
    slotId: 'secondary',
    model: initial.secondary,
  })

  expect(inspectBinding(PrimaryBinding).subscriptions.ticks.name).toBe(
    'primary/Ticks',
  )
  expect(inspectBinding(SecondaryBinding).subscriptions.ticks.name).toBe(
    'secondary/Ticks',
  )
  expect(inspectBinding(PrimaryBinding).managedResources.session.name).toBe(
    'primary/ManageSession',
  )
  expect(inspectBinding(SecondaryBinding).managedResources.session.name).toBe(
    'secondary/ManageSession',
  )
  expect(
    inspectBinding(PrimaryBinding).managedResources.session.resource.key,
  ).toBe(`primary/${Session.key}`)
  expect(
    inspectBinding(SecondaryBinding).managedResources.session.resource._tag.key,
  ).not.toBe(
    inspectBinding(PrimaryBinding).managedResources.session.resource._tag.key,
  )
  expect(Reflect.get(primaryEmbed, ViewScopeTypeId).placement).toBe('primary')
  expect(Reflect.get(secondaryEmbed, ViewScopeTypeId).placement).toBe(
    'secondary',
  )
  expect(graph.subscriptions['primary/ticks']).toBe(
    inspectBinding(PrimaryBinding).subscriptions.ticks,
  )
  expect(graph.subscriptions['secondary/ticks']).toBe(
    inspectBinding(SecondaryBinding).subscriptions.ticks,
  )
  expect(() => aggregateChildren([PrimaryBinding, PrimaryBinding])).toThrow(
    /duplicate|Two child Blocks/,
  )
  expect(
    keyedUpdate(initial, {
      _tag: 'GotEntriesMessage',
      placement: 'entries',
      generation: 0,
      key: 'first',
      message: Message.CompletedRead({ count: 9 }),
    }).model.entries,
  ).toEqual([Entry.make({ id: 'first', child: Model.make({ count: 9 }) })])
})

it('rejects ambiguous mappings before building a Binding', () => {
  expect(() =>
    normalizeConnectionConfig({
      Model: ParentModel,
      field: 'primary',
      parentMessage: LegacyParentMessage.GotChildMessage,
      toParentMessage: (message: Message) =>
        LegacyParentMessage.GotChildMessage({ message }),
    }),
  ).toThrow('exactly one parent Message mapping')
})
