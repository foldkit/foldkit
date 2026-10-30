// Stable before: a Subscription registry built beside the Model.
import { Duration, Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry(
    { isRunning: Schema.Boolean },
    {
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      dependenciesToStream: ({ isRunning }) =>
        Stream.when(
          Stream.tick(Duration.seconds(1)).pipe(
            Stream.drop(1),
            Stream.map(Message.Ticked),
          ),
          Effect.sync(() => isRunning),
        ),
    },
  ),
}))
