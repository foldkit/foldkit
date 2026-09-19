import { Array, Option, Schema } from 'effect'

import { Events, State, makeSchema } from '@livestore/livestore'

import { Items } from './domain'

const ItemAddedV1 = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  completed: Schema.Boolean,
  createdAt: Schema.Number,
})

export const tables = {
  items: State.SQLite.table({
    name: 'items',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      text: State.SQLite.text(),
      isCompleted: State.SQLite.boolean(),
      createdAt: State.SQLite.integer(),
    },
  }),
}

export const events = {
  itemAddedV1: Events.synced({
    name: 'v1.ItemAdded',
    schema: ItemAddedV1,
  }),
  itemAddedV2: Events.synced({
    name: 'v2.ItemAdded',
    schema: Items.Item,
  }),
  itemToggled: Events.synced({
    name: 'v1.ItemToggled',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  itemDeleted: Events.synced({
    name: 'v1.ItemDeleted',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  completedItemsCleared: Events.synced({
    name: 'v1.CompletedItemsCleared',
    schema: Schema.Struct({}),
  }),
}

const SQLiteCompletionRows = Schema.Array(
  Schema.Struct({ isCompleted: Schema.Literals([0, 1]) }),
)

const materializers = State.SQLite.materializers(events, {
  'v1.ItemAdded': ({ id, text, completed, createdAt }) =>
    tables.items.insert({ id, text, isCompleted: completed, createdAt }),
  'v2.ItemAdded': item => tables.items.insert(item),
  'v1.ItemToggled': ({ id }, { query }) => {
    // NOTE: The pinned LiveStore snapshot's typed materializer query fails to decode SQLite rows in the leader worker.
    const rawItems = query({
      query: 'SELECT isCompleted FROM items WHERE id = $id LIMIT 1',
      bindValues: { id },
    })
    const completedItems =
      Schema.decodeUnknownSync(SQLiteCompletionRows)(rawItems)
    const maybeItem = Array.head(completedItems)

    return Option.match(maybeItem, {
      onNone: () => [],
      onSome: item =>
        tables.items
          .update({ isCompleted: item.isCompleted === 0 })
          .where({ id }),
    })
  },
  'v1.ItemDeleted': ({ id }) => tables.items.delete().where({ id }),
  'v1.CompletedItemsCleared': () =>
    tables.items.delete().where({ isCompleted: true }),
})

const state = State.SQLite.makeState({ tables, materializers })

export const schema = makeSchema({ events, state })
