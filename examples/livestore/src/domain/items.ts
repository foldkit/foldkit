import { Array, Match, Schema, pipe } from 'effect'

export const Item = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  isCompleted: Schema.Boolean,
  createdAt: Schema.Number,
})
export type Item = typeof Item.Type

export const Items = Schema.Array(Item)
export type Items = typeof Items.Type

export const Filter = Schema.Literals(['All', 'Active', 'Completed'])
export type Filter = typeof Filter.Type

export const filter = (items: Items, filter: Filter): Items =>
  Match.value(filter).pipe(
    Match.when('All', () => items),
    Match.when('Active', () =>
      Array.filter(items, ({ isCompleted }) => !isCompleted),
    ),
    Match.when('Completed', () =>
      Array.filter(items, ({ isCompleted }) => isCompleted),
    ),
    Match.exhaustive,
  )

export const determineCounts = (
  items: Items,
): Readonly<{ activeItemCount: number; completedItemCount: number }> => {
  const activeItemCount = pipe(
    items,
    Array.filter(({ isCompleted }) => !isCompleted),
    Array.length,
  )

  return {
    activeItemCount,
    completedItemCount: Array.length(items) - activeItemCount,
  }
}
