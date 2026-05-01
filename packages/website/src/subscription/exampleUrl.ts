import { Effect, Option, Queue, Stream, pipe } from 'effect'
import { Subscription } from 'foldkit/subscription'

import { type Model, type SubscriptionDeps } from '../main'
import { GotExampleDetailMessage } from '../message'
import { ChangedExampleUrl } from '../page/example/exampleDetail'
import { ExampleDetailRoute } from '../route'

const BRIDGE_MESSAGE_TYPE = 'foldkit-example-url'

export const exampleUrl: Subscription<
  Model,
  typeof GotExampleDetailMessage,
  SubscriptionDeps['exampleUrl']
> = {
  modelToDependencies: (model: Model) =>
    pipe(
      model.route,
      Option.liftPredicate(
        (route): route is typeof ExampleDetailRoute.Type =>
          route._tag === 'ExampleDetail',
      ),
      Option.map(route => route.exampleSlug),
    ),
  dependenciesToStream: maybeSlug =>
    Stream.when(
      Stream.callback<typeof GotExampleDetailMessage.Type>(queue =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const handler = (event: MessageEvent) => {
              if (
                event.origin === window.location.origin &&
                event.data &&
                event.data.type === BRIDGE_MESSAGE_TYPE &&
                typeof event.data.url === 'string'
              ) {
                Queue.offerUnsafe(
                  queue,
                  GotExampleDetailMessage({
                    message: ChangedExampleUrl({ url: event.data.url }),
                  }),
                )
              }
            }
            window.addEventListener('message', handler)
            return handler
          }),
          handler =>
            Effect.sync(() => window.removeEventListener('message', handler)),
        ).pipe(Effect.flatMap(() => Effect.never)),
      ),
      Effect.sync(() => Option.isSome(maybeSlug)),
    ),
}
