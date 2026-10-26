import { Effect, Schema } from 'effect'
import { Block, Command, Message } from 'foldkit'

const Result = Message.defineMessageUnion({ CompletedSave: {} })
const Definition = Block.makeDefinition('DiagnosticCommandInterrupt', {
  Model: Schema.Struct({}),
  Message: Result,
})
const Args = Schema.Struct({ id: Schema.String, revision: Schema.Number })

export const makeHost = <
  const Interrupt extends Command.InterruptOption<typeof Args.Type>,
>(
  interrupt: Interrupt,
) => {
  const config = {
    args: Args.fields,
    messages: [Result.CompletedSave],
    interrupt,
  }

  return Definition.makeCommand('SaveHost', config)
}

export const makeAttached = <
  const Interrupt extends Command.InterruptOption<typeof Args.Type>,
>(
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

  return Definition.makeCommand('SaveAttached', config)
}
