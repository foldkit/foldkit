import { Effect, Schema } from 'effect'
import { Block, Command, Message } from 'foldkit'

const Result = Message.defineMessageUnion({
  CompletedSave: { id: Schema.String },
  FailedSave: { reason: Schema.String },
})
const Definition = Block.makeDefinition('DiagnosticCommandResult', {
  Model: Schema.Struct({}),
  Message: Result,
})
const Args = Schema.Struct({ id: Schema.String })
const config = {
  args: Args.fields,
  messages: [Result.CompletedSave],
  handler: function* () {
    return ({ id }: typeof Args.Type) =>
      Effect.succeed(Result.FailedSave({ reason: id }))
  },
}

export const OwnedSave = Definition.makeCommand('OwnedSave', config)
export const Save = Command.define('DiagnosticSave', config)
