import { Duration, Effect, Schema } from 'effect'
import { Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import type { Model } from './main'

const Message = defineMessageUnion({
  ClickedResetAfterDelay: { delayMs: Schema.Number },
  CompletedWaitBeforeReset: {},
})
type Message = typeof Message.Type

const WaitBeforeReset = Command.define(
  'WaitBeforeReset',
  {
    args: { delayMs: Schema.Number },
    messages: [Message.CompletedWaitBeforeReset],
  },
  Effect.succeed(({ delayMs }) =>
    Effect.sleep(Duration.millis(delayMs)).pipe(
      Effect.as(Message.CompletedWaitBeforeReset()),
    ),
  ),
)

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedResetAfterDelay: ({ delayMs }) => ({
      model,
      commands: [WaitBeforeReset({ delayMs })],
    }),
    CompletedWaitBeforeReset: () => ({
      model: modifyFields(model, { count: () => 0 }),
    }),
  }),
)
