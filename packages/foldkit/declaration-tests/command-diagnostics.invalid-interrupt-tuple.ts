import { Schema } from 'effect'
import { Block, Command, Message } from 'foldkit'

const Args = Schema.Struct({ id: Schema.String, revision: Schema.Number })
const Result = Message.defineMessageUnion({ CompletedSave: {} })
const Definition = Block.makeDefinition('DiagnosticInterruptTuple', {
  Model: Schema.Struct({}),
  Message: Result,
})
const toKey = (keyArgs: typeof Args.Type) =>
  `${keyArgs.id}:${keyArgs.revision.toFixed()}`

export const makeHost = (
  keyFields: readonly ['id'] | readonly ['revision'],
) => {
  const config = {
    args: Args.fields,
    messages: [Result.CompletedSave],
    interrupt: {
      keyFields,
      toKey(keyArgs: typeof Args.Type) {
        return `${keyArgs.id}:${keyArgs.revision.toFixed()}`
      },
    },
  }

  return Definition.makeCommand('Save', config)
}

export const makeUnowned = (
  keyFields: readonly ['id'] | readonly ['revision'],
) => {
  const config = {
    args: Args.fields,
    messages: [Result.CompletedSave],
    interrupt: { keyFields, toKey },
  }

  return Command.define('DiagnosticInterruptTupleSave', config)
}
