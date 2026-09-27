import { Effect, Option, Schema } from 'effect'
import { Runtime } from 'foldkit'

import { Items } from './domain'
import { Message } from './message'
import { Model } from './model'
import { ItemsStore, type ItemsStoreRequirements } from './store'

export const Flags = Schema.Struct({
  items: Items.Items,
})
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags, never, ItemsStoreRequirements> =
  Effect.gen(function* () {
    const store = yield* ItemsStore
    const items = yield* store.initialItems

    return Flags.make({ items })
  })

export const init: Runtime.ApplicationInit<Model, Message, Flags> = flags => ({
  model: {
    items: flags.items,
    maybeWriteError: Option.none(),
    newItemText: '',
    filter: 'All',
  },
})

export { Message, Model }
export { subscriptions } from './subscription'
export { update } from './update'
export { view } from './view'
