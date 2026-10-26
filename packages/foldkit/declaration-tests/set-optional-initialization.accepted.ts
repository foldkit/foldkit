import { Context, Effect, Option, Schema } from 'effect'
import { Block, Message } from 'foldkit'
import { initAndSet } from 'foldkit/bindingInit'

export class ReadService extends Context.Service<
  ReadService,
  Readonly<{ read: Effect.Effect<number> }>
>()('OptionalSetReadService') {}

export const ChildModel = Schema.Struct({
  count: Schema.Number,
  labels: Schema.Array(Schema.String),
})
const ChildMessage = Message.defineMessageUnion({
  CompletedRead: { count: Schema.Number },
})
const ChildDefinition = Block.makeDefinition('DeclarationOptionalSetChild', {
  Model: ChildModel,
  Message: ChildMessage,
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
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

export const Id = Schema.String.pipe(Schema.brand('OptionalSetId'))
export const Entry = Schema.Struct({
  id: Id,
  child: ChildBlock.Model,
})
export const ParentModel = Schema.Struct({
  maybeEntry: Schema.Option(Entry),
  label: Schema.String,
})
export const ParentMessage = Message.defineMessageUnion({
  RequestedSet: { id: Id, count: Schema.Number },
})
export const ParentDefinition = Block.makeDefinition(
  'DeclarationOptionalSetParent',
  { Model: ParentModel, Message: ParentMessage },
)
export const EntryBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'maybeEntry',
  key: 'id',
  childField: 'child',
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [EntryBinding],
})
export const model = ParentModel.make({
  maybeEntry: Option.none(),
  label: 'current',
})
export const firstId = Id.make('first')
export const setEntry = (
  model: typeof ParentModel.Type,
  id: typeof Id.Type,
  count: number,
) => initAndSet(EntryBinding, model, { key: id, args: [count] })
export const setEntryWithOptional = (model: typeof ParentModel.Type) =>
  initAndSet(EntryBinding, model, {
    key: firstId,
    args: [1, 'first'],
  })
export const setEntryWithRest = (model: typeof ParentModel.Type) =>
  initAndSet(EntryBinding, model, {
    key: firstId,
    args: [1, 'first', 'second'],
  })
export const setGenericEntry = <const Count extends number>(
  model: typeof ParentModel.Type,
  count: Count,
) => initAndSet(EntryBinding, model, { key: firstId, args: [count] })
export const setEntryStep = ParentDefinition.makeStep(model =>
  setEntry(model, firstId, 2),
)
export const update = ParentComposition.makeUpdate({
  RequestedSet: (model, { id, count }) => setEntry(model, id, count),
})
export const init = ParentComposition.makeInit(() => ({
  model: { maybeEntry: Option.none(), label: 'current' },
  steps: [setEntryStep],
}))
const prepareParent = () => ParentComposition.prepareBlock({ init, update })
export const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)
