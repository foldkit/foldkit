import { Effect, Schema, Stream } from 'effect'

import { capturedKeyDownStream } from '../../keyboard'
import { HomeDefinition } from './definition'
import { Message } from './message'
import { capturesKeyboard } from './model'

export const subscriptions = HomeDefinition.makeSubscriptions(entry => ({
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
