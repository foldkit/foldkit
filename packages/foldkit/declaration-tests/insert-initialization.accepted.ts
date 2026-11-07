import { Context, Effect, HashMap, Option, Schema, pipe } from 'effect'
import { Block, Message, Update } from 'foldkit'
import { initAndInsert, makeInitIfMissingStep } from 'foldkit/binding'

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
const ChildrenByIdBindingWithoutPolicy = ParentDefinition.makeRecordBinding(
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
export const ChildrenByNumberBinding = ParentDefinition.makeHashMapBinding(
  ChildBlock,
  { field: 'childrenByNumber' },
)
export const RowsByIdBinding = ParentDefinition.makeRecordBinding(ChildBlock, {
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
export const insert = ParentDefinition.makeStep(model =>
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
  steps: [insert],
}))
const prepareParent = () => ParentComposition.prepareBlock({ init, update })
export const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)

export const initRecordIfMissing = makeInitIfMissingStep(ChildrenByIdBinding, {
  key: firstId,
  args: [1, 'first label', 'second label'],
})
export const initHashMapIfMissing = makeInitIfMissingStep(
  ChildrenByNumberBinding,
  { key: 1, args: [1] },
)
export const DomainEntity = Schema.Struct({ id: Id, value: Schema.Number })
export const domainEntity = DomainEntity.make({ id: firstId, value: 1 })
export const initRecordFromEntity = makeInitIfMissingStep(
  ChildrenByIdBinding,
  _model =>
    pipe(
      Option.some(domainEntity),
      Option.map(entity => ({ key: entity.id, args: [entity.value] })),
    ),
)
export const initRecordFromModel = makeInitIfMissingStep(
  ChildrenByIdBinding,
  model =>
    pipe(
      Option.some(domainEntity),
      Option.map(entity => ({
        key: entity.id,
        args: [entity.value, model.label, 'rest label'],
      })),
    ),
)
export const initHashMapFromEntity = makeInitIfMissingStep(
  ChildrenByNumberBinding,
  () =>
    pipe(
      Option.some(domainEntity),
      Option.map(entity => ({ key: entity.value, args: [entity.value] })),
    ),
)
export const skipRecordInitialization = makeInitIfMissingStep(
  ChildrenByIdBinding,
  () => Option.none(),
)
export type RecordInitProducer = (
  model: typeof ParentModel.Type,
) => Option.Option<
  Readonly<{
    key: typeof Id.Type
    args: [count: number, label?: string, ...labels: ReadonlyArray<string>]
  }>
>
export const recordInitProducer: RecordInitProducer = model =>
  Option.some({
    key: firstId,
    args: [model.label.length, model.label],
  })
export const initRecordFromExtractedProducer = makeInitIfMissingStep(
  ChildrenByIdBinding,
  recordInitProducer,
)
export const initChildren = ParentDefinition.makeStep(() =>
  Update.combineSteps([initRecordIfMissing, initRecordIfMissing]),
)
export const initChildrenUpdate = ParentComposition.makeUpdate({
  RequestedInsert: (model, { id, count }) =>
    makeInitIfMissingStep(ChildrenByIdBinding, {
      key: id,
      args: [count],
    })(model),
})
export const initChildrenDirectUpdate = ParentComposition.makeUpdate({
  RequestedInsert: initRecordIfMissing,
})
export const initWithChildren = ParentComposition.makeInit(() => ({
  model,
  steps: [initChildren],
}))
const prepareInitializingParent = () =>
  ParentComposition.prepareBlock({
    init: initWithChildren,
    update: initChildrenUpdate,
  })
export const InitializingParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareInitializingParent
> = Block.assemble(prepareInitializingParent)

export const ZeroChildModel = Schema.Struct({ ready: Schema.Boolean })
const ZeroChildMessage = Message.defineMessageUnion({})
const ZeroChildDefinition = Block.makeDefinition('DeclarationInsertZeroChild', {
  Model: ZeroChildModel,
  Message: ZeroChildMessage,
})
const ZeroChildComposition = ZeroChildDefinition.makeComposition()
const prepareZeroChild = () =>
  ZeroChildComposition.prepareBlock({
    init: ZeroChildComposition.makeInit(() => ({ model: { ready: true } })),
    update: ZeroChildComposition.makeUpdate({}),
  })
export const ZeroChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ZeroChildModel,
  typeof prepareZeroChild
> = Block.assemble(prepareZeroChild)
export const ZeroParentModel = Schema.Struct({
  childrenById: Schema.Record(Id, ZeroChildBlock.Model),
})
const ZeroParentDefinition = Block.makeDefinition(
  'DeclarationInsertZeroParent',
  { Model: ZeroParentModel, Message: Message.defineMessageUnion({}) },
)
export const ZeroChildrenByIdBinding = ZeroParentDefinition.makeRecordBinding(
  ZeroChildBlock,
  { field: 'childrenById' },
)
export const initZeroChildFromProducer = makeInitIfMissingStep(
  ZeroChildrenByIdBinding,
  () => Option.some({ key: firstId, args: [] }),
)
