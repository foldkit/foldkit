import { Effect, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'
import {
  ItemsStore,
  type ItemsStoreRequirements,
  orderedItemsQuery,
} from './store'

const updatedItemsMessageStream: Stream.Stream<
  typeof Message.UpdatedItems.Type,
  never,
  ItemsStoreRequirements
> = Stream.unwrap(
  Effect.gen(function* () {
    const { store } = yield* ItemsStore

    return store
      .subscribeStream(orderedItemsQuery)
      .pipe(Stream.map(items => Message.UpdatedItems({ items })))
  }),
)

export const subscriptions = Subscription.make<
  Model,
  Message,
  ItemsStoreRequirements
>()(() => ({
  items: Subscription.persistent(updatedItemsMessageStream),
}))
