import { Array, Option, pipe } from 'effect'
import { Ui } from 'foldkit'
import { type Document, html } from 'foldkit/html'

import { Message } from '../message'
import type { Model } from '../model'
import { ghostCardView } from './card'
import { columnView } from './column'

const findDraggedCard = (model: Model) =>
  pipe(
    model.dragAndDrop,
    Ui.DragAndDrop.maybeDraggedItemId,
    Option.flatMap(cardId =>
      pipe(
        model.columns,
        Array.flatMap(({ cards }) => cards),
        Array.findFirst(({ id }) => id === cardId),
      ),
    ),
  )

const ghostElement = (model: Model) => {
  const h = html<Message>()

  return pipe(
    Ui.DragAndDrop.ghostStyle(model.dragAndDrop),
    Option.flatMap(ghostStyle =>
      Option.map(findDraggedCard(model), card => ({ ghostStyle, card })),
    ),
    Option.match({
      onNone: () => h.empty,
      onSome: ({ ghostStyle, card }) =>
        h.div(
          [h.Style(ghostStyle), h.Class('w-64'), h.AriaHidden(true)],
          [ghostCardView(card)],
        ),
    }),
  )
}

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: 'Kanban Board',
    body: h.div(
      [h.Class('flex flex-col min-h-screen bg-gray-100')],
      [
        h.div(
          [h.Class('px-6 py-4 bg-white border-b border-gray-200')],
          [
            h.h1(
              [h.Class('text-lg font-semibold text-gray-900')],
              ['Kanban Board'],
            ),
          ],
        ),
        h.div(
          [
            h.Class(
              'flex-1 p-6 grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-6 items-start',
            ),
          ],
          Array.map(model.columns, column =>
            columnView(model, column, message => message),
          ),
        ),
        ghostElement(model),
        h.div(
          [h.Class('sr-only'), h.AriaLive('assertive')],
          [model.announcement],
        ),
      ],
    ),
  }
}
