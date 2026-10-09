import { Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { capturedKeyDownStream } from '../../keyboard'
import { Message } from './message'
import { Model, capturesKeyboard } from './model'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  homeKeyboard: entry(
    'HomeKeyPresses',
    { shouldCaptureKeyboard: Schema.Boolean },
    {
      messages: [Message.PressedKey],
      modelToDependencies: model => ({
        shouldCaptureKeyboard: capturesKeyboard(model),
      }),
    },
  ),
}))

const HomeKeyPressesLive = subscriptions.homeKeyboard.toLayer(
  ({ shouldCaptureKeyboard }) =>
    Stream.when(
      capturedKeyDownStream(key => Message.PressedKey({ key })),
      Effect.sync(() => shouldCaptureKeyboard),
    ),
)

export const SubscriptionsLive = HomeKeyPressesLive
