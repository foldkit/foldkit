import clsx from 'clsx'
import { Option, String } from 'effect'
import { Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { Card } from '../domain'
import type { Message } from '../message'
import type { Model } from '../model'

const cardContent = (card: Card.Card): ReadonlyArray<Html> => {
  const h = html<Message>()
  return [
    h.span([h.Class('text-sm font-medium text-gray-900')], [card.title]),
    ...(String.isNonEmpty(card.description)
      ? [
          h.div(
            [h.Class('mt-1 text-xs text-gray-500 line-clamp-2')],
            [card.description],
          ),
        ]
      : []),
  ]
}

export const cardView = (
  model: Model,
  card: Card.Card,
  columnId: string,
  index: number,
  toParentMessage: (message: Ui.DragAndDrop.Message) => Message,
): Html => {
  const h = html<Message>()

  const isThisCardBeingDragged = Option.exists(
    Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop),
    id => id === card.id,
  )
  const isPointerDragged =
    model.dragAndDrop.dragState._tag === 'Dragging' && isThisCardBeingDragged
  const isKeyboardDragged =
    model.dragAndDrop.dragState._tag === 'KeyboardDragging' &&
    isThisCardBeingDragged

  return h.keyed('li')(
    card.id,
    [
      h.Class(
        clsx('rounded-lg p-3 border-2 outline-none', {
          'bg-gray-100 border-dashed border-gray-300 opacity-50':
            isPointerDragged,
          'bg-white shadow-sm border-blue-400': isKeyboardDragged,
          'bg-white shadow-sm select-none border-transparent focus:border-gray-400 cursor-grab':
            !isPointerDragged && !isKeyboardDragged,
        }),
      ),
      ...Ui.DragAndDrop.draggable({
        model: model.dragAndDrop,
        toParentMessage,
        itemId: card.id,
        containerId: columnId,
        index,
      }),
    ],
    cardContent(card),
  )
}

export const ghostCardView = (card: Card.Card): Html => {
  const h = html<Message>()
  return h.div(
    [
      h.Class(
        'rounded-lg bg-white shadow-lg p-3 border border-gray-200 scale-105 rotate-2',
      ),
    ],
    cardContent(card),
  )
}
