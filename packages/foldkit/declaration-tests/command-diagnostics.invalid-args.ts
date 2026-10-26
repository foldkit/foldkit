import { Effect, Schema } from 'effect'
import { Block, Command, Message } from 'foldkit'

const Result = Message.defineMessageUnion({ CompletedSave: {} })
const Definition = Block.makeDefinition('DiagnosticCommandArgs', {
  Model: Schema.Struct({}),
  Message: Result,
})
const WrongArgs = Schema.Struct({ id: Schema.Number })
const config = {
  args: { id: Schema.String },
  messages: [Result.CompletedSave],
  handler: function* () {
    return ({ id }: typeof WrongArgs.Type) =>
      Effect.as(Effect.succeed(id), Result.CompletedSave())
  },
}

export const OwnedSave = Definition.makeCommand('OwnedSave', config)
export const Save = Command.define('DiagnosticSave', config)
