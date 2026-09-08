import { Array, Match, Option, Schema, pipe } from 'effect'
import { evo } from 'foldkit/struct'
import { generateKeyBetween } from 'fractional-indexing'

import type { Card } from './card'
import { Card as CardSchema } from './card'

export const Column = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  cards: Schema.Array(CardSchema),
})

export type Column = typeof Column.Type

const generateSortKeyAtIndex = (
  cards: ReadonlyArray<Card>,
  targetIndex: number,
): string => {
  const maybeBefore = Array.get(cards, targetIndex - 1)
  const maybeAfter = Array.get(cards, targetIndex)
  return generateKeyBetween(
    Option.match(maybeBefore, {
      onNone: () => null,
      onSome: ({ sortKey }) => sortKey,
    }),
    Option.match(maybeAfter, {
      onNone: () => null,
      onSome: ({ sortKey }) => sortKey,
    }),
  )
}

export const removeCard = (
  column: Column,
  cardId: string,
): { readonly column: Column; readonly maybeCard: Option.Option<Card> } => {
  const maybeCard = Array.findFirst(column.cards, ({ id }) => id === cardId)
  return {
    column: evo(column, {
      cards: () => Array.filter(column.cards, ({ id }) => id !== cardId),
    }),
    maybeCard,
  }
}

export const insertCard = (
  column: Column,
  card: Card,
  targetIndex: number,
): Column => {
  const sortKey = generateSortKeyAtIndex(column.cards, targetIndex)
  const updatedCard = evo(card, { sortKey: () => sortKey })
  return evo(column, {
    cards: () =>
      pipe(
        column.cards,
        Array.insertAt(targetIndex, updatedCard),
        Option.getOrElse(() => [...column.cards, updatedCard]),
      ),
  })
}

export const appendCard = (column: Column, card: Card): Column => {
  const sortKey = generateSortKeyAtIndex(column.cards, column.cards.length)
  return evo(column, {
    cards: () => [...column.cards, evo(card, { sortKey: () => sortKey })],
  })
}

const findCard = (
  columns: ReadonlyArray<Column>,
  containerId: string,
  cardId: string,
): Option.Option<Card> =>
  pipe(
    columns,
    Array.findFirst(({ id }) => id === containerId),
    Option.flatMap(({ cards }) =>
      Array.findFirst(cards, ({ id }) => id === cardId),
    ),
  )

export const reorder = (
  columns: ReadonlyArray<Column>,
  itemId: string,
  fromContainerId: string,
  toContainerId: string,
  toIndex: number,
): ReadonlyArray<Column> => {
  if (fromContainerId === toContainerId) {
    return Array.map(columns, column => {
      if (column.id !== fromContainerId) {
        return column
      }
      const { column: withoutCard, maybeCard } = removeCard(column, itemId)
      return Option.match(maybeCard, {
        onNone: () => column,
        onSome: card => insertCard(withoutCard, card, toIndex),
      })
    })
  }

  return Option.match(findCard(columns, fromContainerId, itemId), {
    onNone: () => columns,
    onSome: card =>
      Array.map(columns, column =>
        Match.value(column.id).pipe(
          Match.when(fromContainerId, () => removeCard(column, itemId).column),
          Match.when(toContainerId, () => insertCard(column, card, toIndex)),
          Match.orElse(() => column),
        ),
      ),
  })
}
