import { Effect } from 'effect'
import { Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import type { Model } from './main'

export const Message = defineMessageUnion({
  ClickedResetAfterDelay: {},
  ClickedCancelReset: {},
  CompletedWaitBeforeReset: {},
  CompletedCancelWaitBeforeReset: {
    outcome: Command.Interruptible.Outcome,
  },
})
export type Message = typeof Message.Type

export const WaitBeforeReset = Command.define(
  'WaitBeforeReset',
  {
    messages: [Message.CompletedWaitBeforeReset],
    interrupt: true,
  },
  Effect.succeed(() =>
    Effect.sleep('1 second').pipe(
      Effect.as(Message.CompletedWaitBeforeReset()),
    ),
  ),
)

export const EffectsLayer = WaitBeforeReset.layer

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedResetAfterDelay: () => ({
      model,
      commands: [WaitBeforeReset()],
    }),
    ClickedCancelReset: () => ({
      model,
      commands: [
        WaitBeforeReset.Interrupt(outcome =>
          Message.CompletedCancelWaitBeforeReset({ outcome }),
        ),
      ],
    }),
    CompletedWaitBeforeReset: () => ({
      model: modifyFields(model, { count: () => 0 }),
    }),
    CompletedCancelWaitBeforeReset: () => ({ model }),
  }),
)
