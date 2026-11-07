// application.ts
import { Duration, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedResetAfterDelay: { delayMs: Schema.Number },
  CompletedWaitBeforeReset: {},
})
type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const { makeFieldsStep, makeCommandsStep, makeComposition, makeCommand } =
  ApplicationBlock

const ApplicationComposition = makeComposition()

const WaitBeforeReset = makeCommand('WaitBeforeReset', {
  args: { delayMs: Schema.Number },
  messages: [Message.CompletedWaitBeforeReset],
  handler: function* () {
    return ({ delayMs }) =>
      Effect.sleep(Duration.millis(delayMs)).pipe(
        Effect.as(Message.CompletedWaitBeforeReset()),
      )
  },
})

const update = ApplicationComposition.makeUpdate({
  ClickedResetAfterDelay: makeCommandsStep.fromMessage(({ delayMs }) => [
    WaitBeforeReset({ delayMs }),
  ]),
  CompletedWaitBeforeReset: makeFieldsStep(() => ({
    count: () => 0,
  })),
})
