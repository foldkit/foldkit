import { Effect, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { capturedKeyDownStream } from '../../keyboard'
import { Message, PressedKey } from './message'
import { Model, capturesKeyboard } from './model'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  homeKeyboard: entry(
    { shouldCaptureKeyboard: S.Boolean },
    {
      modelToDependencies: model => ({
        shouldCaptureKeyboard: capturesKeyboard(model),
      }),
      dependenciesToStream: ({ shouldCaptureKeyboard }) =>
        Stream.when(
          capturedKeyDownStream(key => PressedKey({ key })),
          Effect.sync(() => shouldCaptureKeyboard),
        ),
    },
  ),
}))
