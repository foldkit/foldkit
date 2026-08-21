import clsx from 'clsx'
import { Option, String } from 'effect'
import { Html, HtmlBuilder } from 'foldkit/html'

import { DragAndDrop } from '@foldkit/ui'

import { Card } from '../domain'
import type { Message } from '../message'
import type { Model } from '../model'

const cardContent = (
  card: Card.Card,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => [
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

export const cardView = (
  model: Model,
  card: Card.Card,
  columnId: string,
  index: number,
  toParentMessage: (message: DragAndDrop.Message) => Message,
  h: HtmlBuilder<Message>,
): Html => {
  const isThisCardBeingDragged = Option.exists(
    DragAndDrop.maybeDraggedItemId(model.dragAndDrop),
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
        clsx('rounded-xl p-3.5 border-2 outline-none', {
          'bg-gray-100 border-dashed border-gray-300 opacity-50':
            isPointerDragged,
          'bg-white shadow-sm border-blue-400': isKeyboardDragged,
          'bg-white shadow-sm select-none border-transparent focus:border-gray-400 cursor-grab':
            !isPointerDragged && !isKeyboardDragged,
        }),
      ),
      ...DragAndDrop.draggable(
        {
          model: model.dragAndDrop,
          toParentMessage,
          itemId: card.id,
          containerId: columnId,
          index,
        },
        h,
      ),
    ],
    cardContent(card, h),
  )
}

export const ghostCardView = (card: Card.Card, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Class(
        'rounded-xl bg-white shadow-lg p-3.5 border border-gray-200 scale-105 rotate-2',
      ),
    ],
    cardContent(card, h),
  )
