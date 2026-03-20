import { Effect, Option, Stream, pipe } from 'effect'
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
      Stream.async<typeof GotExampleDetailMessage.Type>(emit => {
        const handler = (event: MessageEvent) => {
          if (
            event.origin === window.location.origin &&
            event.data &&
            event.data.type === BRIDGE_MESSAGE_TYPE &&
            typeof event.data.url === 'string'
          ) {
            emit.single(
              GotExampleDetailMessage({
                message: ChangedExampleUrl({ url: event.data.url }),
              }),
            )
          }
        }

        window.addEventListener('message', handler)

        return Effect.sync(() => window.removeEventListener('message', handler))
      }),
      () => Option.isSome(maybeSlug),
    ),
}
