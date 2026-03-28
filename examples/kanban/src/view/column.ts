import clsx from 'clsx'
import { Array, Equal, Option, flow, pipe } from 'effect'
import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { ADD_CARD_INPUT_ID } from '../constant'
import { Card, Column } from '../domain'
import {
  AriaHidden,
  Class,
  OnKeyDownPreventDefault,
  OnSubmit,
  button,
  div,
  form,
  h2,
  input,
  keyed,
  span,
  ul,
} from '../html'
import type { Message } from '../message'
import {
  CancelledNewCard,
  ChangedNewCardTitle,
  ClickedAddCard,
  SubmittedNewCard,
} from '../message'
import type { Model } from '../model'
import { cardView } from './card'

const addCardForm = (model: Model, columnId: string): Html => {
  const isAddingToThisColumn = Option.exists(
    model.maybeNewCardColumnId,
    id => id === columnId,
  )

  if (!isAddingToThisColumn) {
    return Ui.Button.view({
      onClick: ClickedAddCard({ columnId }),
      toView: attributes =>
        button(
          [
            ...attributes.button,
            Class(
              'w-full rounded-lg border border-dashed border-gray-300 p-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors cursor-pointer',
            ),
          ],
          ['+ Add card'],
        ),
    })
  }

  return form(
    [Class('flex flex-col gap-2'), OnSubmit(SubmittedNewCard())],
    [
      Ui.Input.view({
        id: ADD_CARD_INPUT_ID,
        onInput: value => ChangedNewCardTitle({ value }),
        value: model.newCardTitle,
        placeholder: 'Card title...',
        toView: attributes =>
          input([
            ...attributes.input,
            Class(
              'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none',
            ),
            OnKeyDownPreventDefault(
              flow(
                Option.liftPredicate(Equal.equals('Escape')),
                Option.map(() => CancelledNewCard()),
              ),
            ),
          ]),
      }),
      div(
        [Class('flex gap-2 justify-end')],
        [
          Ui.Button.view({
            onClick: CancelledNewCard(),
            toView: attributes =>
              button(
                [
                  ...attributes.button,
                  Class(
                    'rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer',
                  ),
                ],
                ['Cancel'],
              ),
          }),
          Ui.Button.view<Message>({
            type: 'submit',
            toView: attributes =>
              button(
                [
                  ...attributes.button,
                  Class(
                    'rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors cursor-pointer',
                  ),
                ],
                ['Add'],
              ),
          }),
        ],
      ),
    ],
  )
}

const dropPlaceholder = (): Html =>
  keyed('li')(
    'drop-placeholder',
    [
      Class(
        'rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 h-12',
      ),
      AriaHidden(true),
    ],
    [],
  )

const findDraggedCard = (
  model: Model,
  draggedId: string,
): Option.Option<Card.Card> =>
  pipe(
    model.columns,
    Array.flatMap(({ cards }) => cards),
    Array.findFirst(({ id }) => id === draggedId),
  )

const defaultCardElements = (
  model: Model,
  column: Column.Column,
): ReadonlyArray<Html> =>
  Array.map(column.cards, (card, index) =>
    cardView(model, card, column.id, index),
  )

const previewCardElements = (
  model: Model,
  column: Column.Column,
): ReadonlyArray<Html> => {
  if (!Ui.DragAndDrop.isDragging(model.dragAndDrop)) {
    return defaultCardElements(model, column)
  }

  return Option.match(Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop), {
    onNone: () => defaultCardElements(model, column),
    onSome: draggedId => {
      const maybeTarget = Ui.DragAndDrop.maybeDropTarget(model.dragAndDrop)
      const visibleCards = Array.filter(
        column.cards,
        ({ id }) => id !== draggedId,
      )
      const cardElements = Array.map(visibleCards, (card, index) =>
        cardView(model, card, column.id, index),
      )

      const isTargetColumn = Option.exists(
        maybeTarget,
        target => target.containerId === column.id,
      )

      if (!isTargetColumn) {
        return cardElements
      }

      const targetIndex = Option.match(maybeTarget, {
        onNone: () => visibleCards.length,
        onSome: target => Math.min(target.index, visibleCards.length),
      })

      const isPointerDrag = model.dragAndDrop.dragState._tag === 'Dragging'
      const insertElement = isPointerDrag
        ? dropPlaceholder()
        : Option.match(findDraggedCard(model, draggedId), {
            onNone: () => dropPlaceholder(),
            onSome: card => cardView(model, card, column.id, targetIndex),
          })

      return pipe(
        cardElements,
        Array.insertAt(targetIndex, insertElement),
        Option.getOrElse(() => [...cardElements, insertElement]),
      )
    },
  })
}

export const columnView = (model: Model, column: Column.Column): Html => {
  const maybeCurrentDropTarget = Ui.DragAndDrop.maybeDropTarget(
    model.dragAndDrop,
  )
  const isDropTarget =
    Ui.DragAndDrop.isDragging(model.dragAndDrop) &&
    Option.exists(
      maybeCurrentDropTarget,
      target => target.containerId === column.id,
    )

  return keyed('div')(
    column.id,
    [
      Class(
        clsx('bg-gray-50 rounded-lg p-3 flex flex-col min-h-0 border-2', {
          'border-dashed border-blue-300': isDropTarget,
          'border-transparent': !isDropTarget,
        }),
      ),
    ],
    [
      div(
        [
          Class(
            'flex items-center justify-between border-b border-gray-200 pb-2 mb-3',
          ),
        ],
        [
          h2(
            [
              Class(
                'text-xs font-semibold uppercase tracking-wide text-gray-500',
              ),
            ],
            [column.name],
          ),
          span([Class('text-xs text-gray-400')], [`${column.cards.length}`]),
        ],
      ),
      ul(
        [
          Class('flex flex-col gap-2 flex-1 overflow-y-auto min-h-0'),
          ...Ui.DragAndDrop.droppable<Message>(column.id, column.name),
        ],
        previewCardElements(model, column),
      ),
      div(
        [Class('mt-3 pt-2 border-t border-gray-200')],
        [addCardForm(model, column.id)],
      ),
    ],
  )
}
