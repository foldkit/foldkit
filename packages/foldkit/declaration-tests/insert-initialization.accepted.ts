import { Context, Effect, HashMap, Schema } from 'effect'
import { Block, Message } from 'foldkit'
import { initAndInsert } from 'foldkit/bindingInit'
import { makeMapBinding } from 'foldkit/mapBinding'

export class ReadService extends Context.Service<
  ReadService,
  Readonly<{ read: Effect.Effect<number> }>
>()('InsertReadService') {}

export const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = Message.defineMessageUnion({
  CompletedRead: { count: Schema.Number },
})
const ChildOutMessage = Message.defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})
const ChildDefinition = Block.makeDefinition('DeclarationInsertChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
export const Read = ChildDefinition.makeCommand('Read', {
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    const service = yield* ReadService
    return () =>
      Effect.map(service.read, count => ChildMessage.CompletedRead({ count }))
  },
})
const ChildComposition = ChildDefinition.makeComposition()
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(
      (count: number, label?: string, ...labels: ReadonlyArray<string>) => ({
        model: { count: count + (label === undefined ? labels.length : 1) },
        commands: [Read()],
      }),
    ),
    update: ChildComposition.makeUpdate({
      CompletedRead: model => ({ model }),
    }),
    EffectsLayer: Read.layer,
  })
export const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

export const Id = Schema.String.pipe(Schema.brand('InsertId'))
export const Wrapper = Schema.Struct({
  child: ChildBlock.Model,
  label: Schema.String,
})
export const ParentModel = Schema.Struct({
  childrenById: Schema.Record(Id, ChildBlock.Model),
  childrenByNumber: Schema.HashMap(Schema.Int, ChildBlock.Model),
  rowsById: Schema.Record(Id, Wrapper),
  label: Schema.String,
})
export const ParentMessage = Message.defineMessageUnion({
  RequestedInsert: { id: Id, count: Schema.Number },
})
export const ParentDefinition = Block.makeDefinition(
  'DeclarationInsertParent',
  { Model: ParentModel, Message: ParentMessage },
)
const ChildrenByIdBindingWithoutPolicy = makeMapBinding(
  ParentDefinition,
  ChildBlock,
  { field: 'childrenById' },
)
export const ChildrenByIdBinding =
  ChildrenByIdBindingWithoutPolicy.withOutMessagePolicy({
    fold: (_key, outMessage) =>
      ChildBlock.OutMessage.match({
        ChangedCount: () => ParentDefinition.makeNoopStep(),
      })(outMessage),
  })
export const ChildrenByNumberBinding = makeMapBinding(
  ParentDefinition,
  ChildBlock,
  { field: 'childrenByNumber' },
)
export const RowsByIdBinding = makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'rowsById',
  childField: 'child',
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildrenByIdBinding],
})
export const firstId = Id.make('first')
export const model = ParentModel.make({
  childrenById: {},
  childrenByNumber: HashMap.empty(),
  rowsById: {},
  label: 'current',
})
export const insertRecord = (
  model: typeof ParentModel.Type,
  id: typeof Id.Type,
) =>
  initAndInsert(ChildrenByIdBinding, model, {
    key: id,
    args: [1, 'first label', 'second label'],
  })
export const insertHashMap = (model: typeof ParentModel.Type, key: number) =>
  initAndInsert(ChildrenByNumberBinding, model, { key, args: [1] })
export const insertStep = ParentDefinition.makeStep(model =>
  insertRecord(model, firstId),
)
export const update = ParentComposition.makeUpdate({
  RequestedInsert: (model, { id, count }) =>
    initAndInsert(ChildrenByIdBinding, model, { key: id, args: [count] }),
})
export const init = ParentComposition.makeInit(() => ({
  model: {
    childrenById: {},
    childrenByNumber: HashMap.empty(),
    rowsById: {},
    label: 'current',
  },
  steps: [insertStep],
}))
const prepareParent = () => ParentComposition.prepareBlock({ init, update })
export const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)
