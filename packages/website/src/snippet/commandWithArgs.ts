import { Duration, Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedResetAfterDelay: { delayMs: Schema.Number },
  CompletedWaitBeforeReset: {},
})

const WaitBeforeReset = Command.define('WaitBeforeReset', {
  args: { delayMs: Schema.Number },
  messages: [Message.CompletedWaitBeforeReset],
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
        ClickedResetAfterDelay: (model, { delayMs }) => ({
          model,
          commands: [WaitBeforeReset({ delayMs })],
        }),
        CompletedWaitBeforeReset: model => ({
          model: modifyFields(model, { count: () => 0 }),
        }),
      },

      commands: {
        WaitBeforeReset: ({ delayMs }) =>
          Effect.sleep(Duration.millis(delayMs)).pipe(
            Effect.as(Application.Message.CompletedWaitBeforeReset()),
          ),
      },
    }
  }),
)
