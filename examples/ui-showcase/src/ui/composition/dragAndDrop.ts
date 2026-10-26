import { Array, Option, pipe } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { DragAndDropBlock } from '@foldkit/ui'

import { UiDefinition, makeFieldsStep, makeNoopStep } from '../definition'
import type { DemoColumn } from '../domain'

const reorderColumns = (
  columns: ReadonlyArray<typeof DemoColumn.Type>,
  itemId: string,
  fromContainerId: string,
  toContainerId: string,
  toIndex: number,
): ReadonlyArray<typeof DemoColumn.Type> => {
  const maybeCard = pipe(
    columns,
    Array.findFirst(({ id }) => id === fromContainerId),
    Option.flatMap(column =>
      Array.findFirst(column.cards, ({ id }) => id === itemId),
    ),
  )

  return Option.match(maybeCard, {
    onNone: () => columns,
    onSome: card =>
      Array.map(columns, column => {
        const withRemoved =
          column.id === fromContainerId
            ? Array.filter(column.cards, ({ id }) => id !== itemId)
            : column.cards

        if (column.id !== toContainerId) {
          return modifyFields(column, { cards: () => withRemoved })
        }

        const inserted = [
          ...Array.take(withRemoved, toIndex),
          card,
          ...Array.drop(withRemoved, toIndex),
        ]

        return modifyFields(column, { cards: () => inserted })
      }),
  })
}

export const DragAndDropDemoBinding = UiDefinition.makeBinding(
  DragAndDropBlock,
  {
    field: 'dragAndDropDemo',
    init: { contextToArgs: () => [{ id: 'drag-and-drop-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(DragAndDropBlock, {
    Reordered: ({ itemId, fromContainerId, toContainerId, toIndex }) =>
      makeFieldsStep(() => ({
        dragAndDropDemoColumns: dragAndDropDemoColumns =>
          reorderColumns(
            dragAndDropDemoColumns,
            itemId,
            fromContainerId,
            toContainerId,
            toIndex,
          ),
      })),
    StartedKeyboardDrag: makeNoopStep,
    ChangedKeyboardTarget: makeNoopStep,
    Cancelled: makeNoopStep,
  }),
})
