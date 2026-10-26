import { Duration, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ dismissDelayMs: Schema.Number })
const Message = defineMessageUnion({ CompletedWaitBeforeDismissal: {} })

const NotificationDefinition = Block.makeDefinition('Notification', {
  Model,
  Message,
})

const { makeCommandsStep } = NotificationDefinition

const WaitBeforeDismissal = NotificationDefinition.makeCommand(
  'WaitBeforeDismissal',
  {
    args: { delayMs: Schema.Number },
    messages: [Message.CompletedWaitBeforeDismissal],
    handler: function* () {
      return ({ delayMs }) =>
        Effect.sleep(Duration.millis(delayMs)).pipe(
          Effect.as(Message.CompletedWaitBeforeDismissal()),
        )
    },
  },
)

export const waitBeforeDismissalStep = makeCommandsStep(model => [
  WaitBeforeDismissal({ delayMs: model.dismissDelayMs }),
])

export const EffectsLayer = WaitBeforeDismissal.layer
