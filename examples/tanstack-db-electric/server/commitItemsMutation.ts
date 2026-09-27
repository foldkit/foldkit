import { Array, Data, Effect, Option, Schema } from 'effect'
import * as SqlError from 'effect/unstable/sql/SqlError'

import { PgClient } from '@effect/sql-pg'

import {
  ItemsMutation,
  ItemsMutationResult,
  type ItemsMutation as ItemsMutationType,
} from '../src/domain/index.ts'

type ChangedItem = Readonly<{ id: string }>
type MutationEffect<A> = Effect.Effect<A, SqlError.SqlError>

class MissingTransactionIdError extends Data.TaggedError(
  'MissingTransactionIdError',
) {}

const transactionId = Effect.gen(function* () {
  const sql = yield* PgClient.PgClient
  const rows = yield* sql<Readonly<{ transactionId: string }>>`
    SELECT pg_current_xact_id()::xid::text AS "transactionId"
  `
  const maybeRow = Array.head(rows)

  return yield* Option.match(maybeRow, {
    onNone: () => Effect.fail(new MissingTransactionIdError()),
    onSome: ({ transactionId }) =>
      Schema.decodeUnknownEffect(Schema.NumberFromString)(transactionId).pipe(
        Effect.mapError(() => new MissingTransactionIdError()),
      ),
  })
})

const executeMutation = (
  mutation: ItemsMutationType,
): Effect.Effect<
  ReadonlyArray<ChangedItem>,
  SqlError.SqlError,
  PgClient.PgClient
> =>
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient

    return yield* ItemsMutation.match<
      MutationEffect<ReadonlyArray<ChangedItem>>
    >(mutation, {
      AddItems: ({ items }) =>
        Array.match(items, {
          onEmpty: () => Effect.succeed(Array.empty<ChangedItem>()),
          onNonEmpty: items =>
            sql<ChangedItem>`
              INSERT INTO items ${sql.insert(
                Array.map(items, item => ({
                  id: item.id,
                  text: item.text,
                  is_completed: item.isCompleted,
                  created_at: item.createdAt,
                })),
              )}
              RETURNING id
            `,
        }),
      ToggleItems: ({ ids }) =>
        sql<ChangedItem>`
          UPDATE items
          SET is_completed = NOT is_completed
          WHERE ${sql.in('id', ids)}
          RETURNING id
        `,
      DeleteItems: ({ ids }) =>
        sql<ChangedItem>`
          DELETE FROM items
          WHERE ${sql.in('id', ids)}
          RETURNING id
        `,
      ClearCompletedItems: () =>
        sql<ChangedItem>`
          DELETE FROM items
          WHERE is_completed
          RETURNING id
        `,
    })
  })

export const commitItemsMutation = (mutation: ItemsMutationType) =>
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient

    return yield* sql.withTransaction(
      Effect.gen(function* () {
        const changedItems = yield* executeMutation(mutation)

        if (Array.isReadonlyArrayEmpty(changedItems)) {
          return ItemsMutationResult.Unchanged()
        }

        return ItemsMutationResult.Committed({
          transactionId: yield* transactionId,
        })
      }),
    )
  })
