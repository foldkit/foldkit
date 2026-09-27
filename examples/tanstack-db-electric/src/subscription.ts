import { Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'
import { ItemsStore, type ItemsStoreRequirements } from './store'

const updatedItemsMessageStream: Stream.Stream<
  typeof Message.UpdatedItems.Type,
  never,
  ItemsStoreRequirements
> = ItemsStore.pipe(
  Stream.fromEffect,
  Stream.flatMap(store => store.snapshots),
  Stream.map(items => Message.UpdatedItems({ items })),
)

export const subscriptions = Subscription.make<
  Model,
  Message,
  ItemsStoreRequirements
>()(() => ({
  items: Subscription.persistent(updatedItemsMessageStream),
}))
