import { Duration, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ dismissDelayMs: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({ CompletedWaitBeforeDismissal: {} })
type Message = typeof Message.Type

export const NotificationKey = Symbol('Notification')
const NotificationBlock = Block.make('Notification', {
  key: NotificationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const { makeCommandsStep, makeCommand } = NotificationBlock

const WaitBeforeDismissal = makeCommand('WaitBeforeDismissal', {
  args: { delayMs: Schema.Number },
  messages: [Message.CompletedWaitBeforeDismissal],
  handler: function* () {
    return ({ delayMs }) =>
      Effect.sleep(Duration.millis(delayMs)).pipe(
        Effect.as(Message.CompletedWaitBeforeDismissal()),
      )
  },
})

export const waitBeforeDismissal = makeCommandsStep(model => [
  WaitBeforeDismissal({ delayMs: model.dismissDelayMs }),
])

export const EffectsLayer = WaitBeforeDismissal.layer
