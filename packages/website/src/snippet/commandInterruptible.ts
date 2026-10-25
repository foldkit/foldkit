// application.ts
import { Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })

export const Message = defineMessageUnion({
  ClickedResetAfterDelay: {},
  ClickedCancelReset: {},
  CompletedWaitBeforeReset: {},
  CompletedCancelWaitBeforeReset: {
    outcome: Command.Interruptible.Outcome,
  },
})

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const ApplicationComposition = ApplicationDefinition.makeComposition()

export const WaitBeforeReset = ApplicationDefinition.makeCommand(
  'WaitBeforeReset',
  {
    messages: [Message.CompletedWaitBeforeReset],
    interrupt: true,
    handler: function* () {
      return () =>
        Effect.sleep('1 second').pipe(
          Effect.as(Message.CompletedWaitBeforeReset()),
        )
    },
  },
)

export const EffectsLayer = WaitBeforeReset.layer

const update = ApplicationComposition.makeUpdate({
  ClickedResetAfterDelay: ApplicationDefinition.makeCommandsStep(() => [
    WaitBeforeReset(),
  ]),
  ClickedCancelReset: ApplicationDefinition.makeCommandsStep(() => [
    WaitBeforeReset.Interrupt(outcome =>
      Message.CompletedCancelWaitBeforeReset({ outcome }),
    ),
  ]),
  CompletedWaitBeforeReset: ApplicationDefinition.makeFieldsStep(() => ({
    count: () => 0,
  })),
  CompletedCancelWaitBeforeReset: ApplicationDefinition.makeNoopStep(),
})
