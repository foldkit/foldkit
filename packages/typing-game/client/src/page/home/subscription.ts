import { Effect, Schema, Stream } from 'effect'

import { capturedKeyDownStream } from '../../keyboard'
import { Home } from './definition'
import { Message } from './message'
import { capturesKeyboard } from './model'

export const subscriptions = Home.subscriptions(entry => ({
  homeKeyPresses: entry(
    'HomeKeyPresses',
    { shouldCaptureKeyboard: Schema.Boolean },
    {
      messages: [Message.PressedKey],
      modelToDependencies: model => ({
        shouldCaptureKeyboard: capturesKeyboard(model),
      }),
      handler: function* () {
        return ({ shouldCaptureKeyboard }) =>
          Stream.when(
            capturedKeyDownStream(key => Message.PressedKey({ key })),
            Effect.sync(() => shouldCaptureKeyboard),
          )
      },
    },
  ),
}))
