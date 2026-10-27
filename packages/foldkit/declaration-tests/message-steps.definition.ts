import { Context, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({
  RequestedIncrement: { amount: Schema.Number },
  RequestedReport: { label: Schema.String },
  CompletedSave: {},
})
export const OutMessage = defineMessageUnion({
  ReportedCount: { count: Schema.Number, label: Schema.String },
})
export const CounterDefinition = Block.makeDefinition('MessageOnlyCounter', {
  Model,
  Message,
  OutMessage,
})
export const { makeStep, makeFieldsStep, makeCommandsStep, makeNoopStep } =
  CounterDefinition
export class Store extends Context.Service<
  Store,
  { save: (count: number) => Effect.Effect<void> }
>()('MessageOnlyCounter/Store') {}
export const Save = CounterDefinition.makeCommand('Save', {
  args: { count: Schema.Number },
  messages: [Message.CompletedSave],
  handler: function* () {
    const store = yield* Store
    return ({ count }) =>
      store.save(count).pipe(Effect.as(Message.CompletedSave()))
  },
})
