import { Schema } from 'effect'
import { Block, Command, Message } from 'foldkit'

const Args = Schema.Struct({ id: Schema.String, revision: Schema.Number })
const Result = Message.defineMessageUnion({ CompletedSave: {} })
const Definition = Block.makeDefinition('DiagnosticInterruptRest', {
  Model: Schema.Struct({}),
  Message: Result,
})

export const makeHost = (
  keyFields: readonly ['id', ...ReadonlyArray<'revision'>],
) => {
  const config = {
    args: Args.fields,
    messages: [Result.CompletedSave],
    interrupt: {
      keyFields,
      toKey: (keyArgs: typeof Args.Type) =>
        `${keyArgs.id}:${keyArgs.revision.toFixed()}`,
    },
  }

  return Definition.makeCommand('Save', config)
}

export const makeUnowned = (
  keyFields: readonly ['id', ...ReadonlyArray<'revision'>],
) => {
  const config = {
    args: Args.fields,
    messages: [Result.CompletedSave],
    interrupt: {
      keyFields,
      toKey: (keyArgs: typeof Args.Type) =>
        `${keyArgs.id}:${keyArgs.revision.toFixed()}`,
    },
  }

  return Command.define('DiagnosticInterruptRestSave', config)
}
