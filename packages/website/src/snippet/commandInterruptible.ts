import { Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Message = defineMessageUnion({
  ClickedResetAfterDelay: {},
  ClickedCancelReset: {},
  CompletedWaitBeforeReset: {},
  CompletedCancelWaitBeforeReset: {
    outcome: Command.Interruptible.Outcome,
  },
})

export const WaitBeforeReset = Command.define('WaitBeforeReset', {
  messages: [Message.CompletedWaitBeforeReset],
  interrupt: true,
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ count: Schema.Number }),
  Message,
  Command: [WaitBeforeReset],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },

      update: {
        ClickedResetAfterDelay: model => ({
          model,
          commands: [WaitBeforeReset()],
        }),
        ClickedCancelReset: model => ({
          model,
          commands: [
            WaitBeforeReset.Interrupt(outcome =>
              Message.CompletedCancelWaitBeforeReset({ outcome }),
            ),
          ],
        }),
        CompletedWaitBeforeReset: model => ({
          model: modifyFields(model, { count: () => 0 }),
        }),
        CompletedCancelWaitBeforeReset: model => ({ model }),
      },

      commands: {
        WaitBeforeReset: () =>
          Effect.sleep('1 second').pipe(
            Effect.as(Message.CompletedWaitBeforeReset()),
          ),
      },
    }
  }),
)
