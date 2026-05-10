import clsx from 'clsx'
import { Array, Option, pipe } from 'effect'
import { Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { GotDragAndDropDemoMessage, type UiMessage } from '../message'
import type { DemoCard, DemoColumn, UiModel } from '../model'

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

const cardView = <ParentMessage>(
  card: DemoCard,
  index: number,
  containerId: string,
  dragAndDropModel: Ui.DragAndDrop.Model,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()
  const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(dragAndDropModel)
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
      ...Ui.DragAndDrop.draggable<ParentMessage>({
        model: dragAndDropModel,
        toParentMessage: message =>
          toParentMessage(GotDragAndDropDemoMessage({ message })),
        itemId: card.id,
        containerId,
        index,
      }),
      ...Ui.DragAndDrop.sortable<ParentMessage>(card.id),
    ],
    [card.label],
  )
}

const dropPlaceholder = <ParentMessage>(): Html => {
  const h = html<ParentMessage>()

  return h.keyed('div')(
    'drop-placeholder',
    [h.Class('rounded-lg border-2 border-dashed border-accent-400/50 h-9')],
    [],
  )
}

const renderColumn = <ParentMessage>(
  column: DemoColumn,
  dragAndDropModel: Ui.DragAndDrop.Model,
  children: ReadonlyArray<Html>,
): Html => {
  const h = html<ParentMessage>()
  const maybeTarget = Ui.DragAndDrop.maybeDropTarget(dragAndDropModel)
  const isDropTarget =
    Ui.DragAndDrop.isDragging(dragAndDropModel) &&
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
          ...Ui.DragAndDrop.droppable<ParentMessage>(column.id, column.label),
        ],
        [...children],
      ),
    ],
  )
}

const columnView = <ParentMessage>(
  columns: ReadonlyArray<DemoColumn>,
  column: DemoColumn,
  dragAndDropModel: Ui.DragAndDrop.Model,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html => {
  const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(dragAndDropModel)
  const maybeTarget = Ui.DragAndDrop.maybeDropTarget(dragAndDropModel)
  const isDragging = Ui.DragAndDrop.isDragging(dragAndDropModel)
  const isPointerDragging = dragAndDropModel.dragState._tag === 'Dragging'

  const isTargetColumn =
    isDragging &&
    Option.exists(maybeTarget, ({ containerId }) => containerId === column.id)

  const visibleCards = Option.match(maybeItemId, {
    onNone: () => column.cards,
    onSome: draggedId =>
      isDragging
        ? Array.filter(column.cards, ({ id }) => id !== draggedId)
        : column.cards,
  })

  const cardElements = Array.map(visibleCards, (card, index) =>
    cardView<ParentMessage>(
      card,
      index,
      column.id,
      dragAndDropModel,
      toParentMessage,
    ),
  )

  if (!isTargetColumn) {
    return renderColumn<ParentMessage>(column, dragAndDropModel, cardElements)
  }

  const targetIndex = Option.match(maybeTarget, {
    onNone: () => visibleCards.length,
    onSome: ({ index }) => Math.min(index, visibleCards.length),
  })

  const insertElement = isPointerDragging
    ? dropPlaceholder<ParentMessage>()
    : Option.match(findDraggedCard(columns, maybeItemId), {
        onNone: () => dropPlaceholder<ParentMessage>(),
        onSome: card =>
          cardView<ParentMessage>(
            card,
            targetIndex,
            column.id,
            dragAndDropModel,
            toParentMessage,
          ),
      })

  const withInsert: ReadonlyArray<Html> = pipe(
    cardElements,
    Array.insertAt(targetIndex, insertElement),
    Option.getOrElse(() => [...cardElements, insertElement]),
  )

  return renderColumn<ParentMessage>(column, dragAndDropModel, withInsert)
}

const ghostView = <ParentMessage>(
  columns: ReadonlyArray<DemoColumn>,
  dragAndDropModel: Ui.DragAndDrop.Model,
): Html => {
  const h = html<ParentMessage>()
  const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(dragAndDropModel)

  return pipe(
    Ui.DragAndDrop.ghostStyle(dragAndDropModel),
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

export const view = <ParentMessage>(
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

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
              columnView<ParentMessage>(
                model.dragAndDropDemoColumns,
                column,
                model.dragAndDropDemo,
                toParentMessage,
              ),
            ),
          ),
          ghostView<ParentMessage>(
            model.dragAndDropDemoColumns,
            model.dragAndDropDemo,
          ),
        ],
      ),
    ],
  )
}
