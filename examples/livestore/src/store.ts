import { Context, Effect } from 'effect'

import type { LiveStoreEvent, Store } from '@livestore/livestore'

import { schema } from './schema'

export class ItemsStore extends Context.Service<
  ItemsStore,
  Store<typeof schema>
>()('ItemsStore') {}

export const commitItemEvent = (
  event: LiveStoreEvent.Input.ForSchema<typeof schema>,
) => Effect.flatMap(ItemsStore, store => Effect.try(() => store.commit(event)))
