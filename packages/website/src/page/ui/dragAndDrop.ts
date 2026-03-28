import { Array, Option, pipe } from 'effect'
import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, Style, div, empty } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { heading } from '../../prose'
import { GotDragAndDropDemoMessage, type Message } from './message'
import type { Model } from './model'
import type { DemoCard, DemoColumn } from './model'

// TABLE OF CONTENTS

export const demoHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'demo',
  text: 'Demo',
}

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
  dragAndDropModel: Ui.DragAndDrop.Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(dragAndDropModel)
  const isBeingDragged = Option.exists(maybeItemId, id => id === card.id)

  const isKeyboardDragged =
    isBeingDragged && dragAndDropModel.dragState._tag === 'KeyboardDragging'
  const isPointerDragged =
    isBeingDragged && dragAndDropModel.dragState._tag === 'Dragging'

  const opacityClass = isPointerDragged ? ' opacity-40' : ''
  const keyboardClass = isKeyboardDragged
    ? ' ring-2 ring-accent-500 dark:ring-accent-400'
    : ''

  return div(
    [
      Class(cardClassName + opacityClass + keyboardClass),
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

const dropPlaceholder: Html = div(
  [
    Class(
      'rounded-lg border-2 border-dashed border-accent-400/50 dark:border-accent-500/50 h-9',
    ),
  ],
  [],
)

const columnView = (
  column: DemoColumnType,
  dragAndDropModel: Ui.DragAndDrop.Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(dragAndDropModel)
  const maybeTarget = Ui.DragAndDrop.maybeDropTarget(dragAndDropModel)
  const isPointerDragging = dragAndDropModel.dragState._tag === 'Dragging'
  const isKeyboardDragging =
    dragAndDropModel.dragState._tag === 'KeyboardDragging'

  const filtered = pipe(
    maybeItemId,
    Option.match({
      onNone: () => column.cards,
      onSome: draggedId => {
        if (isKeyboardDragging) {
          return column.cards
        }
        return Array.filter(column.cards, ({ id }) => id !== draggedId)
      },
    }),
  )

  const showPlaceholder =
    isPointerDragging &&
    Option.exists(maybeTarget, ({ containerId }) => containerId === column.id)

  const placeholderIndex = pipe(
    maybeTarget,
    Option.filter(() => showPlaceholder),
    Option.map(({ index }) => index),
  )

  const cardElements: ReadonlyArray<Html> = pipe(
    filtered,
    Array.flatMap((card, index) => {
      const cardHtml = cardView(
        card,
        index,
        column.id,
        dragAndDropModel,
        toParentMessage,
      )

      return pipe(
        placeholderIndex,
        Option.filter(placeholderIdx => placeholderIdx === index),
        Option.match({
          onNone: () => [cardHtml],
          onSome: () => [dropPlaceholder, cardHtml],
        }),
      )
    }),
  )

  const trailingPlaceholder: ReadonlyArray<Html> = pipe(
    placeholderIndex,
    Option.filter(index => index >= filtered.length),
    Option.match({
      onNone: (): ReadonlyArray<Html> => [],
      onSome: () => [dropPlaceholder],
    }),
  )

  return div(
    [Class('flex flex-col gap-1')],
    [
      div(
        [
          Class(
            'text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1',
          ),
        ],
        [column.label],
      ),
      div(
        [
          Class(
            'flex flex-col gap-1.5 rounded-lg border-2 border-transparent bg-gray-50 dark:bg-gray-900/50 p-2 min-h-[120px] transition-colors',
          ),
          ...Ui.DragAndDrop.droppable<ParentMessage>(column.id, column.label),
        ],
        [...cardElements, ...trailingPlaceholder],
      ),
    ],
  )
}

const ghostView = (
  columns: ReadonlyArray<DemoColumnType>,
  dragAndDropModel: Ui.DragAndDrop.Model,
): Html => {
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
      onNone: () => empty,
      onSome: ({ ghostStyle, card }) =>
        div(
          [
            Style(ghostStyle),
            Class(
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
  toParentMessage: (message: Message) => ParentMessage,
): ReadonlyArray<Html> => [
  heading('h3', demoHeader.id, demoHeader.text),
  div(
    [Class('mb-8')],
    [
      div(
        [Class('grid grid-cols-2 gap-4')],
        Array.map(model.dragAndDropDemoColumns, column =>
          columnView(column, model.dragAndDropDemo, toParentMessage),
        ),
      ),
      ghostView(model.dragAndDropDemoColumns, model.dragAndDropDemo),
    ],
  ),
]
