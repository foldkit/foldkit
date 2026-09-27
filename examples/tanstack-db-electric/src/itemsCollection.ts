import { Array, Schema } from 'effect'

import { snakeCamelMapper } from '@electric-sql/client'
import { createCollection } from '@tanstack/db'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'

import { Items, ItemsMutation, ItemsMutationResult } from './domain'
import { persistItemsMutation } from './itemsApi'

type MatchingStrategy = Readonly<{ txid: number }> | undefined

const toMatchingStrategy = ItemsMutationResult.match<MatchingStrategy>({
  Committed: ({ transactionId }) => ({ txid: transactionId }),
  Unchanged: () => undefined,
})

export const makeItemsCollection = () =>
  createCollection(
    electricCollectionOptions({
      id: 'items',
      schema: Schema.toStandardSchemaV1(Items.Item),
      getKey: item => item.id,
      shapeOptions: {
        url: new URL('/api/items/shape', window.location.origin).toString(),
        columnMapper: snakeCamelMapper(),
      },
      onInsert: async ({ transaction }) =>
        toMatchingStrategy(
          await persistItemsMutation(
            ItemsMutation.AddItems({
              items: Array.map(
                transaction.mutations,
                ({ modified }) => modified,
              ),
            }),
          ),
        ),
      onUpdate: async ({ transaction }) =>
        toMatchingStrategy(
          await persistItemsMutation(
            ItemsMutation.ToggleItems({
              ids: Array.map(
                transaction.mutations,
                ({ original }) => original.id,
              ),
            }),
          ),
        ),
      onDelete: async ({ transaction }) => {
        const mutation =
          transaction.metadata['operation'] === 'ClearCompletedItems'
            ? ItemsMutation.ClearCompletedItems()
            : ItemsMutation.DeleteItems({
                ids: Array.map(
                  transaction.mutations,
                  ({ original }) => original.id,
                ),
              })

        return toMatchingStrategy(await persistItemsMutation(mutation))
      },
    }),
  )

export type ItemsCollection = ReturnType<typeof makeItemsCollection>
