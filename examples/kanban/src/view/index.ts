import { Array, Option, pipe } from 'effect'
import { Ui } from 'foldkit'
import type { Document, Html } from 'foldkit/html'

import { AriaHidden, AriaLive, Class, Style, div, empty, h1 } from '../html'
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

const ghostElement = (model: Model): Html =>
  pipe(
    Ui.DragAndDrop.ghostStyle(model.dragAndDrop),
    Option.flatMap(ghostStyle =>
      Option.map(findDraggedCard(model), card => ({ ghostStyle, card })),
    ),
    Option.match({
      onNone: () => empty,
      onSome: ({ ghostStyle, card }) =>
        div(
          [Style(ghostStyle), Class('w-64'), AriaHidden(true)],
          [ghostCardView(card)],
        ),
    }),
  )

export const view = (model: Model): Document => ({
  title: 'Kanban Board',
  body: div(
    [Class('flex flex-col min-h-screen bg-gray-100')],
    [
      div(
        [Class('px-6 py-4 bg-white border-b border-gray-200')],
        [h1([Class('text-lg font-semibold text-gray-900')], ['Kanban Board'])],
      ),
      div(
        [
          Class(
            'flex-1 p-6 grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-6 items-start',
          ),
        ],
        Array.map(model.columns, column => columnView(model, column)),
      ),
      ghostElement(model),
      div([Class('sr-only'), AriaLive('assertive')], [model.announcement]),
    ],
  ),
})
