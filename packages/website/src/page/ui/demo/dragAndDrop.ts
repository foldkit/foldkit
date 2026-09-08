import { Array, Option, pipe } from 'effect'
import { type Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import { DragAndDrop } from '@foldkit/ui'

import { Message } from '../message'
import type { DemoCard, DemoColumn, Model } from '../model'

// HELPERS

type DemoColumnType = typeof DemoColumn.Type
type DemoCardType = typeof DemoCard.Type

const findDraggedCard = (
  columns: ReadonlyArray<DemoColumnType>,
  maybeItemId: Option.Option<string>,
): Option.Option<DemoCardType> =>
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

// VIEW

const cardClassName =
  'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 cursor-grab active:cursor-grabbing select-none transition-opacity'

const cardView = (
  card: DemoCardType,
  index: number,
  containerId: string,
  dragAndDropModel: DragAndDrop.Model,
  h: HtmlBuilder<Message>,
): Html => {
  const maybeItemId = DragAndDrop.maybeDraggedItemId(dragAndDropModel)
  const isBeingDragged = Option.exists(maybeItemId, id => id === card.id)

  const isKeyboardDragged =
    isBeingDragged && dragAndDropModel.dragState._tag === 'KeyboardDragging'
  const isPointerDragged =
    isBeingDragged && dragAndDropModel.dragState._tag === 'Dragging'

  const opacityClass = isPointerDragged ? ' opacity-40' : ''
  const keyboardClass = isKeyboardDragged
    ? ' ring-2 ring-accent-500 dark:ring-accent-400'
    : ''

  return h.div(
    [
      h.Class(cardClassName + opacityClass + keyboardClass),
      ...DragAndDrop.draggable(
        {
          model: dragAndDropModel,
          toParentMessage: message =>
            Message.GotDragAndDropDemoMessage({ message }),
          itemId: card.id,
          containerId,
          index,
        },
        h,
      ),
      ...DragAndDrop.sortable(card.id),
    ],
    [card.label],
  )
}

const columnView = (
  columns: ReadonlyArray<DemoColumnType>,
  column: DemoColumnType,
  dragAndDropModel: DragAndDrop.Model,
  h: HtmlBuilder<Message>,
): Html => {
  const dropPlaceholder: Html = h.div([
    h.Class(
      'rounded-lg border-2 border-dashed border-accent-400/50 dark:border-accent-500/50 h-9',
    ),
  ])

  const maybeItemId = DragAndDrop.maybeDraggedItemId(dragAndDropModel)
  const maybeTarget = DragAndDrop.maybeDropTarget(dragAndDropModel)
  const isDragging = DragAndDrop.isDragging(dragAndDropModel)
  const isPointerDragging = dragAndDropModel.dragState._tag === 'Dragging'

  const isTargetColumn =
    isDragging &&
    Option.exists(maybeTarget, ({ containerId }) => containerId === column.id)

  const visibleCards = pipe(
    maybeItemId,
    Option.match({
      onNone: () => column.cards,
      onSome: draggedId =>
        isDragging
          ? Array.filter(column.cards, ({ id }) => id !== draggedId)
          : column.cards,
    }),
  )

  const cardElements = Array.map(visibleCards, (card, index) =>
    cardView(card, index, column.id, dragAndDropModel, h),
  )

  if (!isTargetColumn) {
    return renderColumn(column, dragAndDropModel, cardElements, h)
  }

  const targetIndex = pipe(
    maybeTarget,
    Option.match({
      onNone: () => visibleCards.length,
      onSome: ({ index }) => Math.min(index, visibleCards.length),
    }),
  )

  const insertElement = isPointerDragging
    ? dropPlaceholder
    : Option.match(findDraggedCard(columns, maybeItemId), {
        onNone: () => dropPlaceholder,
        onSome: card =>
          cardView(card, targetIndex, column.id, dragAndDropModel, h),
      })

  const withInsert: ReadonlyArray<Html> = pipe(
    cardElements,
    Array.insertAt(targetIndex, insertElement),
    Option.getOrElse(() => [...cardElements, insertElement]),
  )

  return renderColumn(column, dragAndDropModel, withInsert, h)
}

const renderColumn = (
  column: DemoColumnType,
  dragAndDropModel: DragAndDrop.Model,
  children: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html => {
  const maybeTarget = DragAndDrop.maybeDropTarget(dragAndDropModel)
  const isDropTarget =
    DragAndDrop.isDragging(dragAndDropModel) &&
    Option.exists(maybeTarget, ({ containerId }) => containerId === column.id)

  return h.div(
    [h.Class('flex flex-col gap-1')],
    [
      h.div(
        [
          h.Class(
            'text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1',
          ),
        ],
        [column.label],
      ),
      h.div(
        [
          h.Class(
            `flex flex-col gap-1.5 rounded-lg border-2 bg-gray-50 dark:bg-gray-900/50 p-2 min-h-[120px] transition-colors ${
              isDropTarget
                ? 'border-dashed border-accent-400/50 dark:border-accent-500/50'
                : 'border-transparent'
            }`,
          ),
          ...DragAndDrop.droppable(column.id, column.label),
        ],
        [...children],
      ),
    ],
  )
}

const ghostView = (
  columns: ReadonlyArray<DemoColumnType>,
  dragAndDropModel: DragAndDrop.Model,
): Html => {
  const maybeItemId = DragAndDrop.maybeDraggedItemId(dragAndDropModel)

  return pipe(
    DragAndDrop.ghostStyle(dragAndDropModel),
    Option.flatMap(ghostStyle =>
      Option.map(findDraggedCard(columns, maybeItemId), card => ({
        ghostStyle,
        card,
      })),
    ),
    Option.match({
      onNone: () => ih.empty,
      onSome: ({ ghostStyle, card }) =>
        ih.div(
          [
            ih.Style(ghostStyle),
            ih.Class(
              'rounded-lg border border-accent-400 dark:border-accent-500 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-lg',
            ),
          ],
          [card.label],
        ),
    }),
  )
}

export const demo = (
  model: Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  return [
    h.div(
      [h.Class('mb-8 w-full max-w-md')],
      [
        h.div(
          [h.Class('grid grid-cols-2 gap-4')],
          Array.map(model.dragAndDropDemoColumns, column =>
            columnView(
              model.dragAndDropDemoColumns,
              column,
              model.dragAndDropDemo,
              h,
            ),
          ),
        ),
        ghostView(model.dragAndDropDemoColumns, model.dragAndDropDemo),
      ],
    ),
  ]
}
