import {
  Array,
  Context,
  Effect,
  Layer,
  Order,
  Queue,
  Stream,
  pipe,
} from 'effect'

import { Items } from './domain'
import { type ItemsCollection, makeItemsCollection } from './itemsCollection'

const byCreatedAtThenId = Order.combine(
  Order.mapInput(Order.Number, ({ createdAt }: Items.Item) => createdAt),
  Order.mapInput(Order.String, ({ id }: Items.Item) => id),
)

const orderedItems = (rows: ReadonlyArray<Items.Item>): Items.Items =>
  pipe(
    rows,
    Array.map(({ id, text, isCompleted, createdAt }) =>
      Items.Item.make({ id, text, isCompleted, createdAt }),
    ),
    Array.sort(byCreatedAtThenId),
  )

const awaitPersistence = (
  transaction: ReturnType<ItemsCollection['insert']>,
): Effect.Effect<void, unknown> =>
  Effect.tryPromise({
    try: () => transaction.isPersisted.promise,
    catch: error => error,
  })

type ItemsStoreService = Readonly<{
  initialItems: Effect.Effect<Items.Items>
  snapshots: Stream.Stream<Items.Items>
  add: (item: Items.Item) => Effect.Effect<void, unknown>
  toggle: (id: string) => Effect.Effect<void, unknown>
  delete: (id: string) => Effect.Effect<void, unknown>
  clearCompleted: Effect.Effect<void, unknown>
}>

export class ItemsStore extends Context.Service<
  ItemsStore,
  ItemsStoreService
>()('ItemsStore') {}

export type ItemsStoreRequirements = ItemsStore

const makeItemsStore = Effect.acquireRelease(
  Effect.sync(() => {
    const collection = makeItemsCollection()

    const service: ItemsStoreService = {
      initialItems: Effect.tryPromise({
        try: () =>
          collection.toArrayWhenReady().then(rows => orderedItems(rows)),
        catch: error => error,
      }).pipe(Effect.orDie),
      snapshots: Stream.callback<Items.Items>(queue =>
        Effect.acquireRelease(
          Effect.sync(() =>
            collection.subscribeChanges(
              () => Queue.offerUnsafe(queue, orderedItems(collection.toArray)),
              { includeInitialState: true },
            ),
          ),
          subscription => Effect.sync(() => subscription.unsubscribe()),
        ).pipe(Effect.flatMap(() => Effect.never)),
      ),
      add: item => awaitPersistence(collection.insert(item)),
      toggle: id =>
        awaitPersistence(
          collection.update(id, draft => {
            draft.isCompleted = !draft.isCompleted
          }),
        ),
      delete: id => awaitPersistence(collection.delete(id)),
      clearCompleted: Effect.suspend(() => {
        const completedIds = pipe(
          collection.toArray,
          Array.filter(({ isCompleted }) => isCompleted),
          Array.map(({ id }) => id),
        )

        if (Array.isArrayEmpty(completedIds)) {
          return Effect.void
        }

        return awaitPersistence(
          collection.delete(completedIds, {
            metadata: { operation: 'ClearCompletedItems' },
          }),
        )
      }),
    }

    return { collection, service }
  }),
  ({ collection }) => Effect.promise(() => collection.cleanup()),
)

export const ItemsStoreLayer: Layer.Layer<ItemsStore> = Layer.effect(
  ItemsStore,
  makeItemsStore.pipe(Effect.map(({ service }) => service)),
)
