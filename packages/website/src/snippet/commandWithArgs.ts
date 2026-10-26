// application.ts
import { Duration, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })

const Message = defineMessageUnion({
  ClickedResetAfterDelay: { delayMs: Schema.Number },
  CompletedWaitBeforeReset: {},
})

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep, makeCommandsStep } = ApplicationDefinition

const ApplicationComposition = ApplicationDefinition.makeComposition()

const WaitBeforeReset = ApplicationDefinition.makeCommand('WaitBeforeReset', {
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
