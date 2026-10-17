import { Effect, Schema, Stream } from 'effect'
import { Dom } from 'foldkit'

import { Application } from './definition'
import { Message } from './message'

export const subscriptions = Application.subscriptions(entry => ({
  animationFrameTicks: entry(
    'AnimationFrameTicks',
    { isActive: Schema.Boolean },
    {
      messages: [Message.TickedFrame],
      modelToDependencies: model => ({ isActive: model.isRunning }),
      handler: function* () {
        return ({ isActive }) =>
          Stream.when(
            Dom.animationFrameTicks.pipe(
              Stream.map(deltaTimeMs => Message.TickedFrame({ deltaTimeMs })),
            ),
            Effect.sync(() => isActive),
          )
      },
    },
  ),
}))
