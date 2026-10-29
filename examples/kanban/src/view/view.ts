import { Array, Option, pipe } from 'effect'

import { ghostStyle, maybeDraggedItemId } from '@foldkit/ui/dragAndDrop'

import { ApplicationComposition, DragAndDropBinding } from '../composition'
import type { ApplicationViewBuilder } from '../composition'
import type { Model } from '../model'
import { ghostCardView } from './card'
import { columnView } from './column'

const findDraggedCard = (model: Model) =>
  pipe(
    model.dragAndDrop,
    maybeDraggedItemId,
    Option.flatMap(cardId =>
      pipe(
        model.columns,
        Array.flatMap(({ cards }) => cards),
        Array.findFirst(({ id }) => id === cardId),
      ),
    ),
  )

const ghostElement = (model: Model, h: ApplicationViewBuilder) =>
  pipe(
    ghostStyle(model.dragAndDrop),
    Option.flatMap(ghostStyle =>
      Option.map(findDraggedCard(model), card => ({ ghostStyle, card })),
    ),
    Option.match({
      onNone: () => h.empty,
      onSome: ({ ghostStyle, card }) =>
        h.div(
          [h.Style(ghostStyle), h.Class('w-64'), h.AriaHidden(true)],
          [ghostCardView(card, h)],
        ),
    }),
  )

export const view = ApplicationComposition.makeView((model, h) => ({
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
      h.block(
        DragAndDropBinding.embedView({
          slotId: 'drag-and-drop',
          model: model.dragAndDrop,
          viewInputs: {
            toView: render =>
              h.div(
                [],
                [
                  h.div(
                    [
                      h.Class(
                        'flex-1 p-6 grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-6 items-start',
                      ),
                    ],
                    Array.map(model.columns, column =>
                      columnView(model, column, render, message => message, h),
                    ),
                  ),
                  ghostElement(model, h),
                ],
              ),
          },
        }),
      ),
      h.div(
        [h.Class('sr-only'), h.AriaLive('assertive')],
        [model.announcement],
      ),
    ],
  ),
}))
