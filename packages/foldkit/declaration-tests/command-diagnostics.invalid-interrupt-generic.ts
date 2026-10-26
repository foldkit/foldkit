import { Effect, Schema } from 'effect'
import { Command, Message } from 'foldkit'

const Result = Message.defineMessageUnion({ CompletedSave: {} })
const Args = Schema.Struct({ id: Schema.String, revision: Schema.Number })
type UnsafePolicy = Readonly<{
  keyFields: readonly ['id' | 'revision', ...ReadonlyArray<'id' | 'revision'>]
  toKey: (keyArgs: typeof Args.Type) => string
}>

export const makeHost = <const Interrupt extends UnsafePolicy>(
  interrupt: Interrupt,
) => {
  const config = {
    args: Args.fields,
    messages: [Result.CompletedSave],
    interrupt,
  }

  return Command.define('SaveHost', config)
}

export const makeAttached = <const Interrupt extends UnsafePolicy>(
  interrupt: Interrupt,
) => {
  const config = {
    args: Args.fields,
    messages: [Result.CompletedSave],
    interrupt,
    handler: function* () {
      return ({ id }: typeof Args.Type) =>
        Effect.as(Effect.succeed(id), Result.CompletedSave())
    },
  }

  return Command.define('SaveAttached', config)
}
