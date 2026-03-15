import { Duration, Effect, Stream } from 'effect'
import { Subscription } from 'foldkit/subscription'

import { type Model, type SubscriptionDeps, ToggledAiHeading } from '../main'

const TOGGLE_INTERVAL_MS = 3000

export const aiHeading: Subscription<
  Model,
  typeof ToggledAiHeading,
  SubscriptionDeps['aiHeading']
> = {
  modelToDependencies: (model: Model) => ({
    isLandingPage: model.route._tag === 'Home',
  }),
  depsToStream: ({ isLandingPage }) =>
    Stream.when(
      Stream.tick(Duration.millis(TOGGLE_INTERVAL_MS)).pipe(
        Stream.map(() => Effect.succeed(ToggledAiHeading())),
      ),
      () => isLandingPage,
    ),
}
