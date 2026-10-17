import clsx from 'clsx'
import { Array, Option, pipe } from 'effect'
import type { Html } from 'foldkit/html'

import { DragAndDrop } from '@foldkit/ui'
import {
  draggable,
  droppable,
  ghostStyle,
  isDragging,
  maybeDraggedItemId,
  maybeDropTarget,
  sortable,
} from '@foldkit/ui/dragAndDrop'

import { UiComposition } from '../composition'
import type { UiViewBuilder } from '../composition'
import { Message } from '../message'
import type { DemoCard, DemoColumn } from '../model'

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
  dragAndDropModel: typeof DragAndDrop.Model.Type,
  h: UiViewBuilder,
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
      ...draggable(
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
      ...sortable(card.id),
    ],
    [card.label],
  )
}

const dropPlaceholder = (h: UiViewBuilder) => {
  return h.keyed('div')('drop-placeholder', [
    h.Class('rounded-lg border-2 border-dashed border-accent-400/50 h-9'),
  ])
}

const renderColumn = (
  column: DemoColumn,
  dragAndDropModel: typeof DragAndDrop.Model.Type,
  children: ReadonlyArray<Html>,
  h: UiViewBuilder,
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
          ...droppable(column.id, column.label),
        ],
        [...children],
      ),
    ],
  )
}

const columnView = (
  columns: ReadonlyArray<DemoColumn>,
  column: DemoColumn,
  dragAndDropModel: typeof DragAndDrop.Model.Type,
  h: UiViewBuilder,
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
    cardView(card, index, column.id, dragAndDropModel, h),
  )

  if (!isTargetColumn) {
    return renderColumn(column, dragAndDropModel, cardElements, h)
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
          cardView(card, targetIndex, column.id, dragAndDropModel, h),
      })

  const withInsert: ReadonlyArray<Html> = pipe(
    cardElements,
    Array.insertAt(targetIndex, insertElement),
    Option.getOrElse(() => [...cardElements, insertElement]),
  )

  return renderColumn(column, dragAndDropModel, withInsert, h)
}

const ghostView = (
  columns: ReadonlyArray<DemoColumn>,
  dragAndDropModel: typeof DragAndDrop.Model.Type,
  h: UiViewBuilder,
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

export const view = UiComposition.makeView((model, h) => {
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
          ghostView(model.dragAndDropDemoColumns, model.dragAndDropDemo, h),
        ],
      ),
    ],
  )
})
