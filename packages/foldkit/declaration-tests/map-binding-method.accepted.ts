import { Context, Effect, HashMap, Layer, Schema, Stream } from 'effect'
import { Block, Message, Struct } from 'foldkit'
import { initAndInsert } from 'foldkit/bindingInit'

import type { Assert, Equal } from './from-assembly.assertions.js'
import { createPicker } from './from-assembly.generic.js'

export class ReadService extends Context.Service<
  ReadService,
  Readonly<{ read: Effect.Effect<number> }>
>()('MapMethodReadService') {}

export const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = Message.defineMessageUnion({
  RequestedRead: {},
  CompletedRead: { count: Schema.Number },
  RequestedNotify: {},
})
const ChildOutMessage = Message.defineMessageUnion({
  NotifiedCount: { count: Schema.Number },
})
const ChildDefinition = Block.makeDefinition('MapMethodChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const construction: Effect.Effect<void, 'ReadUnavailable'> = Effect.void
export const Read = ChildDefinition.makeCommand('Read', {
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    const service = yield* ReadService
    yield* construction

    return () =>
      Effect.map(service.read, count => ChildMessage.CompletedRead({ count }))
  },
})
const subscriptions = ChildDefinition.makeSubscriptions(entry => ({
  activity: entry('ObserveMapMethodActivity', {
    messages: [],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))
const ChildComposition = ChildDefinition.makeComposition()
const prepare = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(
      (count: number, label?: string, ...labels: ReadonlyArray<string>) => ({
        model: { count: count + (label === undefined ? labels.length : 1) },
        commands: [Read()],
      }),
    ),
    update: ChildComposition.makeUpdate.withContext(
      (context: Readonly<{ multiplier: number }>) => ({
        RequestedRead: model => ({ model, commands: [Read()] }),
        CompletedRead: (model, { count }) => ({
          model: Struct.modifyFields(model, {
            count: () => count * context.multiplier,
          }),
        }),
        RequestedNotify: model => ({
          model,
          outMessage: ChildOutMessage.NotifiedCount({ count: model.count }),
        }),
      }),
    ),
    operations: {
      read: ChildMessage.RequestedRead,
      notify: ChildMessage.RequestedNotify,
    },
    subscriptions,
    EffectsLayer: Layer.merge(Read.layer, subscriptions.layer),
  })
export const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepare
> = Block.assemble(prepare)

export const Id = Schema.String.pipe(Schema.brand('MapMethodId'))
export const ParentModel = Schema.Struct({
  children: Schema.Record(Id, ChildBlock.Model),
  finiteChildren: Schema.HashMap(
    Schema.Literals(['First', 'Second']),
    ChildBlock.Model,
  ),
  rows: Schema.Record(
    Id,
    Schema.Struct({ child: ChildBlock.Model, label: Schema.String }),
  ),
  multiplier: Schema.Number,
})
export const ParentMessage = Message.defineMessageUnion({
  RequestedInsert: { id: Id, count: Schema.Number },
})
export const ParentOutMessage = Message.defineMessageUnion({
  Selected: { id: Id, count: Schema.Number },
})
export const ChildInitContext = Schema.Struct({ seed: Schema.Number })
export const ParentDefinition = Block.makeDefinition('MapMethodParent', {
  Model: ParentModel,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
  ChildInitContext,
})
export const { makeMapBinding } = ParentDefinition

export const ChildrenBinding = makeMapBinding(ChildBlock, {
  field: 'children',
  subscriptions: {
    when: {
      activity: (model, key) => {
        const exactModel: Assert<Equal<typeof model, typeof ParentModel.Type>> =
          true
        const exactKey: Assert<Equal<typeof key, typeof Id.Type>> = true
        void exactModel
        void exactKey

        return model.multiplier > 0
      },
    },
  },
  delivery: {
    when: (model, key) => model.multiplier > 0 && key.length > 0,
    toUpdateContext: (model, key) => {
      const exactKey: Assert<Equal<typeof key, typeof Id.Type>> = true
      void exactKey

      return [{ multiplier: model.multiplier }]
    },
  },
}).withOutMessagePolicy({
  fold: (id, outMessage) =>
    ChildBlock.OutMessage.match(outMessage, {
      NotifiedCount: ({ count }) =>
        ParentDefinition.makeOutMessageStep(() =>
          ParentOutMessage.Selected({ id, count }),
        ),
    }),
})
export const FiniteBinding = ParentDefinition.makeMapBinding(ChildBlock, {
  field: 'finiteChildren',
  subscriptions: {
    when: (model, key) => {
      const exactKey: Assert<Equal<typeof key, 'First' | 'Second'>> = true
      void exactKey

      return HashMap.has(model.finiteChildren, key)
    },
  },
  delivery: {
    toUpdateContext: model => [{ multiplier: model.multiplier }],
  },
})
export const RowsBinding = makeMapBinding(ChildBlock, {
  field: 'rows',
  childField: 'child',
  delivery: {
    toUpdateContext: model => [{ multiplier: model.multiplier }],
  },
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildrenBinding],
})
export const insert = (model: typeof ParentModel.Type, id: typeof Id.Type) =>
  initAndInsert(ChildrenBinding, model, {
    key: id,
    args: [1, 'first label', 'second label'],
  })
export const update = ParentComposition.makeUpdate({
  RequestedInsert: (model, { id, count }) =>
    initAndInsert(ChildrenBinding, model, { key: id, args: [count] }),
})
export const init = ParentComposition.makeInit((seed: number) => ({
  model: ParentModel.make({
    children: {},
    finiteChildren: HashMap.empty(),
    rows: {},
    multiplier: seed,
  }),
  childInitContext: { seed },
}))
const prepareParent = () => ParentComposition.prepareBlock({ init, update })
export const ParentBlock: Block.FromAssemblyWithOutMessage<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)

export const { PickerBlock } = createPicker(Schema.Literals(['Red', 'Blue']))
export const PickerModel = Schema.Struct({
  pickers: Schema.Record(Schema.String, PickerBlock.Model),
})
export const PickerDefinition = Block.makeDefinition('MapMethodPickerParent', {
  Model: PickerModel,
  Message: Schema.Never,
})
export const PickerBinding = PickerDefinition.makeMapBinding(PickerBlock, {
  field: 'pickers',
}).withOutMessagePolicy({
  fold: (_key, outMessage) =>
    PickerBlock.OutMessage.match(outMessage, {
      Selected: ({ selected }) => {
        const exactSelected: Assert<Equal<typeof selected, 'Red' | 'Blue'>> =
          true
        void exactSelected

        return PickerDefinition.makeNoopStep()
      },
    }),
})

export const createMappedPicker = <Item, Encoded, Decoding, Encoding>(
  Item: Schema.Codec<Item, Encoded, Decoding, Encoding> & {
    readonly '~type.make': Item
  },
) => {
  const { PickerBlock } = createPicker(Item)
  const Model = Schema.Struct({
    pickers: Schema.Record(Schema.String, PickerBlock.Model),
  })
  const Definition = Block.makeDefinition('GenericMapMethodPickerParent', {
    Model,
    Message: Schema.Never,
  })
  const Binding = Definition.makeMapBinding(PickerBlock, { field: 'pickers' })

  return { PickerBlock, Model, Definition, Binding }
}
