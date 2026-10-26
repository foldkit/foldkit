import { Context, Effect, Schema } from 'effect'
import { Block, Message } from 'foldkit'
import { initAndAppend } from 'foldkit/bindingInit'

export class ReadService extends Context.Service<
  ReadService,
  Readonly<{ read: Effect.Effect<number> }>
>()('AppendReadService') {}

export const ChildModel = Schema.Struct({
  count: Schema.Number,
  labels: Schema.Array(Schema.String),
})
const ChildMessage = Message.defineMessageUnion({
  CompletedRead: { count: Schema.Number },
})
const ChildOutMessage = Message.defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})
const ChildDefinition = Block.makeDefinition('DeclarationAppendChild', {
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
        model: {
          count,
          labels: label === undefined ? labels : [label, ...labels],
        },
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

export const Id = Schema.String.pipe(Schema.brand('AppendId'))
export const Entry = Schema.Struct({
  id: Id,
  child: ChildBlock.Model,
  label: Schema.String,
})
export const ParentModel = Schema.Struct({
  entries: Schema.Array(Entry),
  label: Schema.String,
})
export const ParentMessage = Message.defineMessageUnion({
  RequestedAppend: { id: Id, count: Schema.Number },
})
export const ParentDefinition = Block.makeDefinition(
  'DeclarationAppendParent',
  { Model: ParentModel, Message: ParentMessage },
)
export const BaseEntriesBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
  init: {
    instances: () => [],
    toItem: ({ key }, child) => ({ id: key, child, label: `Entry ${key}` }),
  },
})
export const EntriesBinding = BaseEntriesBinding.withOutMessagePolicy({
  fold: (_key, outMessage) =>
    ChildBlock.OutMessage.match({
      ChangedCount: () => ParentDefinition.makeNoopStep(),
    })(outMessage),
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [EntriesBinding],
})
export const model = ParentModel.make({ entries: [], label: 'current' })
export const firstId = Id.make('first')
export const append = (model: typeof ParentModel.Type, id: typeof Id.Type) =>
  initAndAppend(EntriesBinding, model, {
    key: id,
    args: [1, 'first label', 'second label'],
  })
export const appendWithRequiredArgs = (model: typeof ParentModel.Type) =>
  initAndAppend(BaseEntriesBinding, model, { key: firstId, args: [1] })
export const appendStep = ParentDefinition.makeStep(model =>
  append(model, firstId),
)
export const update = ParentComposition.makeUpdate({
  RequestedAppend: (model, { id, count }) =>
    initAndAppend(EntriesBinding, model, { key: id, args: [count] }),
})
export const explicitInitialization = () =>
  EntriesBinding.init({
    key: firstId,
    args: [1],
    toParentModel: child =>
      ParentModel.make({
        entries: [{ id: firstId, child, label: 'explicit' }],
        label: 'current',
      }),
  })
export const init = ParentComposition.makeInit(() => ({
  model: { label: 'current' },
  steps: [appendStep],
}))
const prepareParent = () => ParentComposition.prepareBlock({ init, update })
export const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)
