import { Context, Effect, HashMap, Layer, Schema } from 'effect'
import { Block, Message, Struct } from 'foldkit'

import { ChildBlock, ChildModel, Choice, Observe, childLayer } from './child.js'

export class SelectionLog extends Context.Service<
  SelectionLog,
  Readonly<{ record: (value: Choice) => Effect.Effect<void> }>
>()('KeyedFoldSelectionLog') {}

export const EntryId = Schema.String.pipe(Schema.brand('KeyedFoldEntryId'))
export type EntryId = typeof EntryId.Type
export const Model = Schema.Struct({
  entries: Schema.Record(EntryId, ChildModel),
  numberedEntries: Schema.HashMap(Schema.Int, ChildModel),
  selected: Choice,
  selectedId: Schema.String,
  beforeCount: Schema.Number,
})
export type Model = typeof Model.Type
export const ParentMessage = Message.defineMessageUnion({
  RequestedChoose: { id: EntryId, value: Choice },
  RequestedChooseNumbered: { id: Schema.Int, value: Choice },
  CompletedRecord: {},
})
export type ParentMessage = typeof ParentMessage.Type
export const ParentOutMessage = Message.defineMessageUnion({
  Selected: { value: Choice },
})
export type ParentOutMessage = typeof ParentOutMessage.Type
export const ParentKey = Symbol('KeyedFoldParent')
export const ParentBlock = Block.make('KeyedFoldParent', {
  key: ParentKey,
  Model,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
  InitArgs: Schema.Tuple([]),
  effects: { services: [SelectionLog] },
})
export const { makeFieldsStep, makeOutMessageFold, makeOutMessageStep } =
  ParentBlock
export const RecordSelection = ParentBlock.makeCommand('RecordSelection', {
  args: { value: Choice },
  messages: [ParentMessage.CompletedRecord],
  handler: function* () {
    const log = yield* SelectionLog

    return ({ value }) =>
      Effect.as(log.record(value), ParentMessage.CompletedRecord())
  },
})
export const foldSelection = makeOutMessageFold(ChildBlock, {
  Selected:
    ({ value }, { modelBeforeUpdate }) =>
    model => ({
      model: Struct.modifyFields(model, {
        selected: () => value,
        beforeCount: () => modelBeforeUpdate.beforeCount,
      }),
      commands: [RecordSelection({ value })],
      outMessage: ParentOutMessage.Selected({ value }),
    }),
  Closed: ParentBlock.makeNoopStep,
})
export const foldLiftedSelection = makeOutMessageFold(ChildBlock, {
  Selected: (_outMessage, { liftCommand }) =>
    ParentBlock.makeCommandsStep(() => [liftCommand(Observe())]),
  Closed: ParentBlock.makeNoopStep,
})
export const EntriesBinding = ParentBlock.makeRecordBinding(ChildBlock, {
  field: 'entries',
}).withOutMessagePolicy({ fold: foldSelection })
export const NumberedEntriesBinding = ParentBlock.makeHashMapBinding(
  ChildBlock,
  {
    field: 'numberedEntries',
  },
).withOutMessagePolicy({
  fold: key =>
    makeOutMessageFold(ChildBlock, {
      Selected: ({ value }) =>
        makeFieldsStep(() => ({
          selected: () => value,
          selectedId: () => key.toFixed(),
        })),
      Closed: ParentBlock.makeNoopStep,
    }),
})
export const composition = ParentBlock.makeComposition({
  bindings: [EntriesBinding, NumberedEntriesBinding],
})
export const update = composition.makeUpdate({
  RequestedChoose: (model, { id, value }) =>
    EntriesBinding.requestChoose(id, { value })(model),
  RequestedChooseNumbered: (model, { id, value }) =>
    NumberedEntriesBinding.requestChoose(id, { value })(model),
  CompletedRecord: ParentBlock.makeNoopStep(),
})
export const layer = ParentBlock.makeLayer(
  Effect.gen(function* () {
    const entries = yield* EntriesBinding
    const numberedEntries = yield* NumberedEntriesBinding

    return {
      children: [entries, numberedEntries],
      init: composition.makeInit(() => ({
        model: {
          entries: {},
          numberedEntries: HashMap.empty(),
          selected: 'Apple',
          selectedId: '',
          beforeCount: 0,
        },
      })),
      update,
      EffectsLayer: RecordSelection.layer,
    }
  }),
).pipe(Layer.provide(childLayer))
