import { Array, Option, pipe } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { DragAndDrop } from '@foldkit/ui'

import {
  makeFieldsStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeStep,
} from '../block'
import { SaveBoard } from '../command'
import { Column } from '../domain'

const findCardTitle = (
  columns: ReadonlyArray<Column.Column>,
  cardId: string,
): string =>
  pipe(
    columns,
    Array.flatMap(({ cards }) => cards),
    Array.findFirst(({ id }) => id === cardId),
    Option.match({
      onNone: () => cardId,
      onSome: ({ title }) => title,
    }),
  )

const findColumnName = (
  columns: ReadonlyArray<Column.Column>,
  columnId: string,
): string =>
  pipe(
    columns,
    Array.findFirst(({ id }) => id === columnId),
    Option.match({
      onNone: () => columnId,
      onSome: ({ name }) => name,
    }),
  )

const foldDragAndDropOutMessage = makeOutMessageFold(
  DragAndDrop.DragAndDropBlock,
  {
    StartedKeyboardDrag: ({ itemId }) =>
      makeFieldsStep(model => ({
        announcement: () =>
          `Picked up ${findCardTitle(model.columns, itemId)}. Use arrow keys to move within column, Tab to move between columns, Space to drop, Escape to cancel.`,
      })),
    ChangedKeyboardTarget: ({ fromContainerId, toContainerId, toIndex }) =>
      makeFieldsStep(model => ({
        announcement: () => {
          const columnName = findColumnName(model.columns, toContainerId)
          return fromContainerId !== toContainerId
            ? `Moved to ${columnName}, position ${toIndex + 1}.`
            : `Position ${toIndex + 1} in ${columnName}.`
        },
      })),
    Reordered: (outMessage, { modelBeforeUpdate }) =>
      makeStep(model => {
        const { itemId, fromContainerId, toContainerId, toIndex } = outMessage
        const nextColumns = Column.reorder(
          model.columns,
          itemId,
          fromContainerId,
          toContainerId,
          toIndex,
        )
        return {
          model: modifyFields(model, {
            columns: () => nextColumns,
            announcement: () =>
              `Dropped ${findCardTitle(modelBeforeUpdate.columns, itemId)} in position ${toIndex + 1} of ${findColumnName(modelBeforeUpdate.columns, toContainerId)}.`,
          }),
          commands: [SaveBoard({ columns: nextColumns })],
        }
      }),
    Cancelled: (_outMessage, { modelBeforeUpdate }) =>
      makeFieldsStep(() => ({
        announcement: () =>
          Option.match(
            DragAndDrop.maybeDraggedItemId(modelBeforeUpdate.dragAndDrop),
            {
              onNone: () => 'Drag cancelled.',
              onSome: id =>
                `Drag cancelled, ${findCardTitle(modelBeforeUpdate.columns, id)} returned to original position.`,
            },
          ),
      })),
  },
)

export const DragAndDropBinding = makeRequiredFieldBinding(
  DragAndDrop.DragAndDropBlock,
  {
    field: 'dragAndDrop',
    init: { contextToArgs: () => [{ id: 'kanban' }] },
  },
).withOutMessagePolicy({ fold: foldDragAndDropOutMessage })
