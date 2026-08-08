import { Array, Match as M, Option, String, pipe } from 'effect'
import { Command, Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { DragAndDrop } from '@foldkit/ui'

import { FocusAddCardInput, GenerateCardId, SaveBoard } from './command'
import { Column } from './domain'
import { GotDragAndDropMessage, type Message } from './message'
import type { Model } from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

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

const announceKeyboardDrag = (
  model: Model,
  nextDragAndDrop: DragAndDrop.Model,
): string =>
  M.value(nextDragAndDrop.dragState).pipe(
    M.withReturnType<string>(),
    M.tag('KeyboardDragging', nextState => {
      const wasIdle = model.dragAndDrop.dragState._tag === 'Idle'
      if (wasIdle) {
        const title = findCardTitle(model.columns, nextState.itemId)
        return `Picked up ${title}. Use arrow keys to move within column, Tab to move between columns, Space to drop, Escape to cancel.`
      }

      if (model.dragAndDrop.dragState._tag !== 'KeyboardDragging') {
        return model.announcement
      }

      const prevState = model.dragAndDrop.dragState
      const columnName = findColumnName(
        model.columns,
        nextState.targetContainerId,
      )

      if (prevState.targetContainerId !== nextState.targetContainerId) {
        return `Moved to ${columnName}, position ${nextState.targetIndex + 1}.`
      }
      if (prevState.targetIndex !== nextState.targetIndex) {
        return `Position ${nextState.targetIndex + 1} in ${columnName}.`
      }

      return model.announcement
    }),
    M.orElse(() => model.announcement),
  )

const screenReaderTextForDrop = (
  model: Model,
  outMessage: DragAndDrop.OutMessage,
): string =>
  M.value(outMessage).pipe(
    M.withReturnType<string>(),
    M.tagsExhaustive({
      Reordered: ({ itemId, toContainerId, toIndex }) => {
        const title = findCardTitle(model.columns, itemId)
        const columnName = findColumnName(model.columns, toContainerId)
        return `Dropped ${title} in position ${toIndex + 1} of ${columnName}.`
      },
      Cancelled: () =>
        Option.match(DragAndDrop.maybeDraggedItemId(model.dragAndDrop), {
          onNone: () => 'Drag cancelled.',
          onSome: id => {
            const title = findCardTitle(model.columns, id)
            return `Drag cancelled, ${title} returned to original position.`
          },
        }),
    }),
  )

const foldDragAndDropOutMessage: (
  previousModel: Model,
) => (outMessage: DragAndDrop.OutMessage) => Update.Step<Model, Message> =
  previousModel => outMessage => model =>
    M.value(outMessage).pipe(
      withUpdateReturn,
      M.tagsExhaustive({
        Reordered: ({ itemId, fromContainerId, toContainerId, toIndex }) => {
          const nextColumns = Column.reorder(
            model.columns,
            itemId,
            fromContainerId,
            toContainerId,
            toIndex,
          )
          return [
            evo(model, {
              columns: () => nextColumns,
              announcement: () =>
                screenReaderTextForDrop(previousModel, outMessage),
            }),
            [SaveBoard({ columns: nextColumns })],
          ]
        },
        Cancelled: () => [
          evo(model, {
            announcement: () =>
              screenReaderTextForDrop(previousModel, outMessage),
          }),
          [],
        ],
      }),
    )

const foldDragAndDrop = (previousModel: Model) =>
  Update.foldChild({
    update: DragAndDrop.update,
    read: (model: Model) => Option.some(model.dragAndDrop),
    write: (model, nextDragAndDrop) =>
      evo(model, {
        dragAndDrop: () => nextDragAndDrop,
        announcement: () => announceKeyboardDrag(model, nextDragAndDrop),
      }),
    toParentMessage: message => GotDragAndDropMessage({ message }),
    foldOutMessage: foldDragAndDropOutMessage(previousModel),
  })

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      GotDragAndDropMessage: ({ message }) =>
        foldDragAndDrop(model)(message)(model),

      ClickedAddCard: ({ columnId }) => [
        evo(model, {
          maybeNewCardColumnId: () => Option.some(columnId),
          newCardTitle: () => '',
        }),
        [FocusAddCardInput()],
      ],

      ChangedNewCardTitle: ({ value }) => [
        evo(model, { newCardTitle: () => value }),
        [],
      ],

      SubmittedNewCard: () =>
        Option.match(model.maybeNewCardColumnId, {
          onNone: () => [model, []],
          onSome: columnId => {
            const title = String.trim(model.newCardTitle)
            if (String.isEmpty(title)) {
              return [model, []]
            }

            return [
              model,
              [GenerateCardId({ columnId: columnId, title: title })],
            ]
          },
        }),

      CompletedGenerateCardId: ({ cardId, columnId, title }) => {
        const nextColumns = Array.map(model.columns, column => {
          if (column.id !== columnId) {
            return column
          }
          return Column.appendCard(column, {
            id: cardId,
            title,
            description: '',
            sortKey: '',
          })
        })

        return [
          evo(model, {
            columns: () => nextColumns,
            maybeNewCardColumnId: () => Option.none(),
            newCardTitle: () => '',
          }),
          [SaveBoard({ columns: nextColumns })],
        ]
      },

      CancelledNewCard: () => [
        evo(model, {
          maybeNewCardColumnId: () => Option.none(),
          newCardTitle: () => '',
        }),
        [],
      ],

      CompletedSaveBoard: () => [model, []],

      CompletedFocusAddCardInput: () => [model, []],
    }),
  )
