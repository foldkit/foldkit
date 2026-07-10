import { Array, Option, pipe } from 'effect'
import { type Document, html } from 'foldkit/html'

import { DragAndDrop } from '@foldkit/ui'

import { Message } from '../message'
import type { Model } from '../model'
import { ghostCardView } from './card'
import { columnView } from './column'

const findDraggedCard = (model: Model) =>
  pipe(
    model.dragAndDrop,
    DragAndDrop.maybeDraggedItemId,
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
    DragAndDrop.ghostStyle(model.dragAndDrop),
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
      [h.Class('flex flex-col min-h-screen bg-gray-50')],
      [
        h.div(
          [
            h.Class(
              'sticky top-0 z-10 px-6 py-4 bg-white/90 border-b border-gray-200 backdrop-blur shadow-sm',
            ),
          ],
          [
            h.h1(
              [h.Class('text-xl font-semibold tracking-tight text-gray-900')],
              ['Kanban Board'],
            ),
          ],
        ),
        h.div(
          [
            h.Class(
              'flex-1 p-4 sm:p-6 grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-5 items-start',
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
