import clsx from 'clsx'
import { Array, Effect, Layer, Option, Schema, pipe } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { DragAndDrop } from '@foldkit/ui'
import {
  type RenderInfo,
  ghostStyle,
  isDragging,
  maybeDraggedItemId,
  maybeDropTarget,
} from '@foldkit/ui/dragAndDrop'

const DemoCard = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
})
type DemoCard = typeof DemoCard.Type

const DemoColumn = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  cards: Schema.Array(DemoCard),
})
type DemoColumn = typeof DemoColumn.Type

const Model = Schema.Struct({
  dragAndDropDemo: DragAndDrop.DragAndDrop,
  dragAndDropDemoColumns: Schema.Array(DemoColumn),
})
type Model = typeof Model.Type

export class DragAndDropPage extends Block<DragAndDropPage>()(
  'DragAndDropPage',
  { Model },
) {}

export const DragAndDropPageLive = DragAndDropPage.make(
  Effect.fn(function* () {
    const dragAndDropDemo = yield* new DragAndDrop.DragAndDrop(
      'dragAndDropDemo',
      { id: 'drag-and-drop-demo' },
    )

    return {
      model: {
        dragAndDropDemo,
        dragAndDropDemoColumns: [
          {
            id: 'backlog',
            label: 'Backlog',
            cards: [
              { id: 'card-1', label: 'Design API' },
              { id: 'card-2', label: 'Write tests' },
              { id: 'card-3', label: 'Build docs' },
            ],
          },
          {
            id: 'done',
            label: 'Done',
            cards: [
              { id: 'card-4', label: 'Set up repo' },
              { id: 'card-5', label: 'Add CI' },
            ],
          },
        ],
      },

      update: {
        ...dragAndDropDemo.on({
          Reordered: (
            model,
            { itemId, fromContainerId, toContainerId, toIndex },
          ) => ({
            model: modifyFields(model, {
              dragAndDropDemoColumns: dragAndDropDemoColumns =>
                reorderColumns(
                  dragAndDropDemoColumns,
                  itemId,
                  fromContainerId,
                  toContainerId,
                  toIndex,
                ),
            }),
          }),
          StartedKeyboardDrag: model => ({ model }),
          ChangedKeyboardTarget: model => ({ model }),
          Cancelled: model => ({ model }),
        }),
      },

      view,
    }
  }),
).pipe(Layer.provide(DragAndDrop.DragAndDropLive))

const reorderColumns = (
  columns: ReadonlyArray<DemoColumn>,
  itemId: string,
  fromContainerId: string,
  toContainerId: string,
  toIndex: number,
): ReadonlyArray<DemoColumn> => {
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

type DragAndDropModel = Model['dragAndDropDemo']['model']

const cardClassName =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 cursor-grab active:cursor-grabbing select-none transition-opacity'

const findDraggedCard = (
  columns: ReadonlyArray<DemoColumn>,
  maybeItemId: Option.Option<string>,
): Option.Option<DemoCard> =>
  pipe(
    maybeItemId,
    Option.flatMap(itemId =>
      pipe(
        columns,
        Array.flatMap(({ cards }) => cards),
        Array.findFirst(({ id }) => id === itemId),
      ),
    ),
  )

const cardView = (
  card: DemoCard,
  index: number,
  containerId: string,
  dragAndDropModel: DragAndDropModel,
  render: RenderInfo,
  h: HtmlBuilder<never>,
): Html => {
  const maybeItemId = maybeDraggedItemId(dragAndDropModel)
  const isBeingDragged = Option.exists(maybeItemId, id => id === card.id)

  const isKeyboardDragged =
    isBeingDragged && dragAndDropModel.dragState._tag === 'KeyboardDragging'
  const isPointerDragged =
    isBeingDragged && dragAndDropModel.dragState._tag === 'Dragging'

  return h.keyed('div')(
    card.id,
    [
      h.Class(
        clsx(cardClassName, {
          'opacity-40': isPointerDragged,
          'ring-2 ring-accent-500': isKeyboardDragged,
        }),
      ),
      ...render.draggable({ itemId: card.id, containerId, index }),
      ...render.sortable(card.id),
    ],
    [card.label],
  )
}

const dropPlaceholder = (h: HtmlBuilder<never>) => {
  return h.keyed('div')('drop-placeholder', [
    h.Class('rounded-lg border-2 border-dashed border-accent-400/50 h-9'),
  ])
}

const renderColumn = (
  column: DemoColumn,
  dragAndDropModel: DragAndDropModel,
  children: ReadonlyArray<Html>,
  render: RenderInfo,
  h: HtmlBuilder<never>,
): Html => {
  const maybeTarget = maybeDropTarget(dragAndDropModel)
  const isDropTarget =
    isDragging(dragAndDropModel) &&
    Option.exists(maybeTarget, ({ containerId }) => containerId === column.id)

  return h.keyed('div')(
    column.id,
    [h.Class('flex flex-col gap-1')],
    [
      h.div(
        [
          h.Class(
            'text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1',
          ),
        ],
        [column.label],
      ),
      h.div(
        [
          h.Class(
            clsx(
              'flex flex-col gap-1.5 rounded-lg border-2 bg-gray-50 p-2 min-h-[120px] transition-colors',
              isDropTarget
                ? 'border-dashed border-accent-400/50'
                : 'border-transparent',
            ),
          ),
          ...render.droppable(column.id, column.label),
        ],
        [...children],
      ),
    ],
  )
}

const columnView = (
  columns: ReadonlyArray<DemoColumn>,
  column: DemoColumn,
  dragAndDropModel: DragAndDropModel,
  render: RenderInfo,
  h: HtmlBuilder<never>,
): Html => {
  const maybeItemId = maybeDraggedItemId(dragAndDropModel)
  const maybeTarget = maybeDropTarget(dragAndDropModel)
  const isDraggingNow = isDragging(dragAndDropModel)
  const isPointerDragging = dragAndDropModel.dragState._tag === 'Dragging'

  const isTargetColumn =
    isDraggingNow &&
    Option.exists(maybeTarget, ({ containerId }) => containerId === column.id)

  const visibleCards = Option.match(maybeItemId, {
    onNone: () => column.cards,
    onSome: draggedId =>
      isDraggingNow
        ? Array.filter(column.cards, ({ id }) => id !== draggedId)
        : column.cards,
  })

  const cardElements = Array.map(visibleCards, (card, index) =>
    cardView(card, index, column.id, dragAndDropModel, render, h),
  )

  if (!isTargetColumn) {
    return renderColumn(column, dragAndDropModel, cardElements, render, h)
  }

  const targetIndex = Option.match(maybeTarget, {
    onNone: () => visibleCards.length,
    onSome: ({ index }) => Math.min(index, visibleCards.length),
  })

  const insertElement = isPointerDragging
    ? dropPlaceholder(h)
    : Option.match(findDraggedCard(columns, maybeItemId), {
        onNone: () => dropPlaceholder(h),
        onSome: card =>
          cardView(card, targetIndex, column.id, dragAndDropModel, render, h),
      })

  const withInsert: ReadonlyArray<Html> = pipe(
    cardElements,
    Array.insertAt(targetIndex, insertElement),
    Option.getOrElse(() => [...cardElements, insertElement]),
  )

  return renderColumn(column, dragAndDropModel, withInsert, render, h)
}

const ghostView = (
  columns: ReadonlyArray<DemoColumn>,
  dragAndDropModel: DragAndDropModel,
  h: HtmlBuilder<never>,
): Html => {
  const maybeItemId = maybeDraggedItemId(dragAndDropModel)

  return pipe(
    ghostStyle(dragAndDropModel),
    Option.flatMap(ghostStyle =>
      Option.map(findDraggedCard(columns, maybeItemId), card => ({
        ghostStyle,
        card,
      })),
    ),
    Option.match({
      onNone: () => h.empty,
      onSome: ({ ghostStyle, card }) =>
        h.div(
          [
            h.Style(ghostStyle),
            h.Class(
              'rounded-lg border border-accent-400 bg-white px-3 py-2 text-sm text-gray-900 shadow-lg',
            ),
          ],
          [card.label],
        ),
    }),
  )
}

const view = (model: Model, h: HtmlBuilder<never>): Html => {
  return h.div(
    [],
    [
      h.h2(
        [h.Class('text-2xl font-bold text-gray-900 mb-6')],
        ['Drag and Drop'],
      ),
      h.div(
        [h.Class('w-full max-w-md')],
        [
          model.dragAndDropDemo.view({
            toView: render =>
              h.div(
                [],
                [
                  h.div(
                    [h.Class('grid grid-cols-2 gap-4')],
                    Array.map(model.dragAndDropDemoColumns, column =>
                      columnView(
                        model.dragAndDropDemoColumns,
                        column,
                        model.dragAndDropDemo.model,
                        render,
                        h,
                      ),
                    ),
                  ),
                  ghostView(
                    model.dragAndDropDemoColumns,
                    model.dragAndDropDemo.model,
                    h,
                  ),
                ],
              ),
          }),
        ],
      ),
    ],
  )
}
