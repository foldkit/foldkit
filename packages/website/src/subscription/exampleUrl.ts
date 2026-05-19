import { Effect, Option, Queue, Schema as S, Stream, pipe } from 'effect'
import { Subscription } from 'foldkit'

import { type Model } from '../main'
import { GotExampleDetailMessage, type Message } from '../message'
import { ChangedExampleUrl } from '../page/example/exampleDetail'
import { ExampleDetailRoute } from '../route'

const BRIDGE_MESSAGE_TYPE = 'foldkit-example-url'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  exampleUrl: entry(
    { maybeExampleSlug: S.Option(S.String) },
    {
      modelToDependencies: model => ({
        maybeExampleSlug: pipe(
          model.route,
          Option.liftPredicate(
            (route): route is typeof ExampleDetailRoute.Type =>
              route._tag === 'ExampleDetail',
          ),
          Option.map(route => route.exampleSlug),
        ),
      }),
      dependenciesToStream: ({ maybeExampleSlug }) =>
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
                Effect.sync(() =>
                  window.removeEventListener('message', handler),
                ),
            ).pipe(Effect.flatMap(() => Effect.never)),
          ),
          Effect.sync(() => Option.isSome(maybeExampleSlug)),
        ),
    },
  ),
}))
