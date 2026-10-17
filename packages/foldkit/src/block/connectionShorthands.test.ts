import { Array, Context, Effect, Layer, Option, Schema, Stream } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import type * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import { aggregateChildren, inspectBinding } from './binding.js'
import { define } from './define.js'
import { normalizeConnectionConfig } from './directConnection.js'
import { ViewScopeTypeId } from './identity.js'
import type { Qualify } from './scope.js'

class ValueSource extends Context.Service<
  ValueSource,
  Readonly<{ value: number }>
>()('ConnectionShorthands/ValueSource') {}

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({
  RequestedRead: {},
  CompletedRead: { count: Schema.Number },
  ObservedTick: {},
  CompletedObserve: {},
  AcquiredSession: {},
  ReleasedSession: {},
  FailedAcquireSession: {},
})
const OutMessage = defineMessageUnion({ ReadRequested: {} })
const Child = define('Child', { Model, Message, OutMessage })
const Read = Child.command('Read', {
  messages: [Message.CompletedRead],
  handler: function* () {
    const source = yield* ValueSource

    return () => Effect.succeed(Message.CompletedRead({ count: source.value }))
  },
})
const Observe = Child.mount('Observe', {
  messages: [Message.CompletedObserve],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedObserve())
  },
})
const Session = Child.resource<string>()('Session')
const subscriptions = Child.subscriptions(entry => ({
  ticks: entry('Ticks', {
    messages: [Message.ObservedTick],
    handler: function* () {
      return () => Stream.succeed(Message.ObservedTick())
    },
  }),
}))
const managedResources = Child.managedResources(entry => ({
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
const block = registered.makeBlock({
  init: () => ({ model: Model.make({ count: 0 }) }),
  update: registered.makeUpdate((model, message) =>
    Message.match(message, {
      RequestedRead: () => ({
        model,
        commands: [Read()],
        outMessage: OutMessage.ReadRequested(),
      }),
      CompletedRead: ({ count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
      ObservedTick: () => ({ model }),
      CompletedObserve: () => ({ model }),
      AcquiredSession: () => ({ model }),
      ReleasedSession: () => ({ model }),
      FailedAcquireSession: () => ({ model }),
    }),
  ),
  view,
  subscriptions,
  managedResources,
  EffectsLayer: Layer.mergeAll(
    Read.layer,
    Observe.layer,
    subscriptions.ticks.layer,
    managedResources.session.layer,
  ),
  expose: { read: Child.step(model => ({ model, commands: [Read()] })) },
})
const Entry = Schema.Struct({ id: Schema.String, child: Model })
const ParentModel = Schema.Struct({
  primary: Model,
  secondary: Model,
  requests: Schema.Number,
  entries: Schema.Array(Entry),
})
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({
  GotChildMessage: { message: Message },
  GotEntryMessage: { id: Schema.String, message: Message },
  GotForeignMessage: { message: Schema.String },
  RequestedReadOperation: {},
})
type ParentMessage = typeof ParentMessage.Type
const Parent = define('ConnectionShorthandsParent', {
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
const PrimaryBinding = Parent.bindChild(block, {
  field: 'primary',
  parentMessage: ParentMessage.GotChildMessage,
  outMessage: { fold: foldChildOutMessage },
})
const primaryInspection = inspectBinding(PrimaryBinding)
const SecondaryBinding = Parent.bindChild(block, {
  field: 'secondary',
  parentMessage: ParentMessage.GotChildMessage,
  outMessage: { fold: foldChildOutMessage },
})
const OverriddenBinding = Parent.bindChild(block, {
  field: 'secondary',
  placement: 'alternate',
  parentMessage: ParentMessage.GotChildMessage,
  outMessage: { fold: foldChildOutMessage },
})
const AccessorBinding = Parent.bindChild(block, {
  read: model => Option.some(model.primary),
  write: (model, nextPrimary) =>
    modifyFields(model, { primary: () => nextPrimary }),
  parentMessage: ParentMessage.GotChildMessage,
  outMessage: { fold: foldChildOutMessage },
})
const entryKey = (entry: typeof Entry.Type): string => entry.id
const KeyedBinding = Parent.bindChild(block, {
  fromParentMessage: false,
  placement: 'entries',
  readAll: (model: ParentModel) => model.entries,
  key: entryKey,
  read: (entry: typeof Entry.Type) => entry.child,
  writeAt: (model: ParentModel, id: string, nextChild: typeof Model.Type) =>
    modifyFields(model, {
      entries: Array.map(entry =>
        entry.id === id
          ? modifyFields(entry, { child: () => nextChild })
          : entry,
      ),
    }),
  toParentMessage: (id: string, message: typeof Message.Type) =>
    ParentMessage.GotEntryMessage({ id, message }),
  outMessage: {
    fold: (_key: string, outMessage: typeof OutMessage.Type) =>
      foldChildOutMessage(outMessage),
  },
})
const ParentComposition = Parent.makeComposition({
  childBindings: [PrimaryBinding],
})
const update = ParentComposition.makeUpdate((model, message) =>
  ParentMessage.match(message, {
    GotEntryMessage: () => ({ model }),
    GotForeignMessage: () => ({ model }),
    RequestedReadOperation: () => PrimaryBinding.read()(model),
  }),
)

const KeyedComposition = Parent.makeComposition({
  childBindings: [KeyedBinding],
})
const keyedUpdate = KeyedComposition.makeUpdate((model, message) =>
  ParentMessage.match(message, {
    GotEntryMessage: ({ id, message }) => KeyedBinding.fold(model, id, message),
    GotChildMessage: () => ({ model }),
    GotForeignMessage: () => ({ model }),
    RequestedReadOperation: () => ({ model }),
  }),
)

const initial = ParentModel.make({
  primary: Model.make({ count: 1 }),
  secondary: Model.make({ count: 2 }),
  requests: 0,
  entries: [Entry.make({ id: 'first', child: Model.make({ count: 3 }) })],
})

if (false) {
  Parent.bindChild(block, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    field: 'primary',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    parentMessage: ParentMessage.GotForeignMessage,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    outMessage: { fold: foldChildOutMessage },
  })
  Parent.bindChild(block, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    field: 'primary',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    parentMessage: ParentMessage.GotEntryMessage,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    outMessage: { fold: foldChildOutMessage },
  })
  Parent.bindChild(block, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    field: 'primary',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    toParentMessage: (message: typeof Message.Type) =>
      ParentMessage.GotChildMessage({ message }),
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    parentMessage: ParentMessage.GotChildMessage,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    outMessage: { fold: foldChildOutMessage },
  })
  Parent.bindChild(block, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    read: (model: ParentModel) => Option.some(model.primary),
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    write: (model: ParentModel, nextPrimary: typeof Model.Type) =>
      modifyFields(model, { primary: () => nextPrimary }),
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    toParentMessage: (message: typeof Message.Type) =>
      ParentMessage.GotChildMessage({ message }),
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    parentMessage: ParentMessage.GotChildMessage,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    outMessage: { fold: foldChildOutMessage },
  })
  Parent.bindChild(block, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    field: 'primary',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    parentMessage: ParentMessage.GotChildMessage,
  })
  Parent.bindChild(block, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    readAll: (model: ParentModel) => model.entries,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    key: (entry: typeof Entry.Type) => entry.id,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    read: (entry: typeof Entry.Type) => entry.child,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    writeAt: (model: ParentModel) => model,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    parentMessage: ParentMessage.GotEntryMessage,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    outMessage: { fold: () => foldChildOutMessage },
  })
}

it('keeps exact placement literals and child operation arguments', () => {
  expectTypeOf<Extract<keyof typeof PrimaryBinding, string>>().toEqualTypeOf<
    'placement' | 'init' | 'fold' | 'embedView' | 'read'
  >()
  expectTypeOf(PrimaryBinding.placement).toEqualTypeOf<'primary'>()
  expectTypeOf(SecondaryBinding.placement).toEqualTypeOf<'secondary'>()
  expectTypeOf(OverriddenBinding.placement).toEqualTypeOf<'alternate'>()
  expectTypeOf(AccessorBinding.placement).toEqualTypeOf<'Child'>()
  expectTypeOf(KeyedBinding.placement).toEqualTypeOf<'entries'>()
  expectTypeOf(
    update(
      initial,
      ParentMessage.GotChildMessage({ message: Message.RequestedRead() }),
    ).model,
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
  const result = update(
    initial,
    ParentMessage.GotChildMessage({ message: Message.RequestedRead() }),
  )
  const command = Option.getOrThrow(Array.head(result.commands!))
  const operation = Option.getOrThrow(
    Array.head(
      update(initial, ParentMessage.RequestedReadOperation()).commands!,
    ),
  )
  const services = inspectBinding(PrimaryBinding).EffectsLayer.pipe(
    Layer.provide(Layer.succeed(ValueSource, { value: 42 })),
  )
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
  expect(completed).toEqual(
    ParentMessage.GotChildMessage({
      message: Message.CompletedRead({ count: 42 }),
    }),
  )
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
    keyedUpdate(
      initial,
      ParentMessage.GotEntryMessage({
        id: 'first',
        message: Message.CompletedRead({ count: 9 }),
      }),
    ).model.entries,
  ).toEqual([Entry.make({ id: 'first', child: Model.make({ count: 9 }) })])
})

it('rejects ambiguous mappings before building a Binding', () => {
  expect(() =>
    normalizeConnectionConfig({
      Model: ParentModel,
      field: 'primary',
      parentMessage: ParentMessage.GotChildMessage,
      toParentMessage: (message: typeof Message.Type) =>
        ParentMessage.GotChildMessage({ message }),
    }),
  ).toThrow('exactly one parent Message mapping')
})
