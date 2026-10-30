import clsx from 'clsx'
import { Array, Crypto, Effect, Option, Schema, String, pipe } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { generateKeyBetween } from 'fractional-indexing'

import { Button, DragAndDrop } from '@foldkit/ui'
import {
  type RenderInfo,
  ghostStyle,
  isDragging,
  maybeDraggedItemId,
  maybeDropTarget,
} from '@foldkit/ui/dragAndDrop'

import type { Card } from './domain/card'
import * as Column from './domain/column'
import { NewCardForm } from './newCardForm'

const STORAGE_KEY = 'kanban-board'

// SEED DATA

const key1 = generateKeyBetween(null, null)
const key2 = generateKeyBetween(key1, null)
const key3 = generateKeyBetween(key2, null)
const key4 = generateKeyBetween(key3, null)
const key5 = generateKeyBetween(key4, null)
const key6 = generateKeyBetween(key5, null)

const DEFAULT_COLUMNS = [
  {
    id: 'todo',
    name: 'To Do',
    cards: [
      {
        id: 'card-1',
        title: 'Research drag-and-drop patterns',
        description:
          'Review dnd-kit, elm-draggable, and annaghi/dnd-list for inspiration.',
        sortKey: key1,
      },
      {
        id: 'card-2',
        title: 'Design the data model',
        description:
          'Card, Column, and Board schemas with fractional indexing for sort order.',
        sortKey: key2,
      },
      {
        id: 'card-3',
        title: 'Write collision detection',
        description:
          'elementsFromPoint + getBoundingClientRect for drop target resolution.',
        sortKey: key3,
      },
      {
        id: 'card-4',
        title: 'Add keyboard accessibility',
        description:
          'Space to pick up, arrow keys to move, Space to drop, Escape to cancel.',
        sortKey: key4,
      },
      {
        id: 'card-5',
        title: 'Handle touch vs pointer',
        description:
          'Activation threshold distinguishes taps from drags on mobile devices.',
        sortKey: key5,
      },
      {
        id: 'card-6',
        title: 'Add ARIA attributes',
        description:
          'role=option on draggables, role=listbox on containers, aria-roledescription=sortable.',
        sortKey: key6,
      },
    ],
  },
  {
    id: 'in-progress',
    name: 'In Progress',
    cards: [
      {
        id: 'card-7',
        title: 'Build the DragAndDrop component',
        description:
          'Three-state state machine with collision detection and OutMessage support.',
        sortKey: key1,
      },
      {
        id: 'card-8',
        title: 'Create kanban example',
        description:
          'Responsive grid layout with fractional indexing and localStorage persistence.',
        sortKey: key2,
      },
      {
        id: 'card-9',
        title: 'Live reorder preview',
        description:
          'Cards shift to make room for the dragged item. Blue placeholder for pointer, actual card for keyboard.',
        sortKey: key3,
      },
      {
        id: 'card-10',
        title: 'Cross-container movement',
        description:
          'Drag cards between columns. Collision detection finds any droppable container.',
        sortKey: key4,
      },
      {
        id: 'card-11',
        title: 'Ghost element positioning',
        description:
          'position: fixed + translate3d with clientX/clientY for viewport-relative placement.',
        sortKey: key5,
      },
    ],
  },
  {
    id: 'done',
    name: 'Done',
    cards: [
      {
        id: 'card-12',
        title: 'Set up the monorepo',
        description: 'Turborepo with foldkit core, website, and examples.',
        sortKey: key1,
      },
      {
        id: 'card-13',
        title: 'Write the pixel art example',
        description:
          'Undo/redo, UI components, subscriptions, and localStorage persistence.',
        sortKey: key2,
      },
      {
        id: 'card-14',
        title: 'Publish to npm',
        description: 'Changesets, CI/CD pipeline, and automated releases.',
        sortKey: key3,
      },
      {
        id: 'card-15',
        title: 'Build the subscription system',
        description:
          'modelToDependencies + dependenciesToStream with Stream.when gating.',
        sortKey: key4,
      },
      {
        id: 'card-16',
        title: 'Ship DevTools',
        description:
          'Message inspector, Model viewer, time-travel debugging overlay.',
        sortKey: key5,
      },
      {
        id: 'card-17',
        title: 'Write the auth example',
        description:
          'Login/signup with OutMessage pattern, session persistence, route protection.',
        sortKey: key6,
      },
    ],
  },
]

// MODEL

export const SavedBoard = Schema.Struct({
  columns: Schema.Array(Column.Column),
})
export type SavedBoard = typeof SavedBoard.Type

const SavedBoardJsonString = Schema.fromJsonString(
  Schema.toCodecJson(SavedBoard),
)

export const Model = Schema.Struct({
  columns: Schema.Array(Column.Column),
  dragAndDrop: DragAndDrop.DragAndDrop,
  newCardForm: NewCardForm,
  announcement: Schema.String,
})
export type Model = typeof Model.Type

// FLAGS

export const Flags = Schema.Struct({
  maybeSavedBoard: Schema.Option(SavedBoard),
})
export type Flags = typeof Flags.Type

export const flags = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(STORAGE_KEY)),
  )
  const decoded = yield* Schema.decodeEffect(SavedBoardJsonString)(json)

  return Flags.make({ maybeSavedBoard: Option.some(decoded) })
}).pipe(
  Effect.catch(() =>
    Effect.succeed(Flags.make({ maybeSavedBoard: Option.none() })),
  ),
)

// MESSAGE

export const Message = defineMessageUnion({
  ClickedAddCard: { columnId: Schema.String },
  CompletedGenerateCardId: {
    cardId: Schema.String,
    columnId: Schema.String,
    title: Schema.String,
  },
  CompletedSaveBoard: {},
})
export type Message = typeof Message.Type

// COMMAND

export const GenerateCardId = Command.define('GenerateCardId', {
  args: { columnId: Schema.String, title: Schema.String },
  messages: [Message.CompletedGenerateCardId],
})

export const SaveBoard = Command.define('SaveBoard', {
  args: { columns: Schema.Array(Column.Column) },
  messages: [Message.CompletedSaveBoard],
})

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', {
  Model,
  Message,
  Command: [GenerateCardId, SaveBoard],
}) {}

// ANNOUNCEMENT

const findCardTitle = (
  columns: ReadonlyArray<Column.Column>,
  cardId: string,
): string =>
  pipe(
    columns,
    Array.flatMap(({ cards }) => cards),
    Array.findFirst(({ id }) => id === cardId),
    Option.match({
      onNone: () => cardId,
      onSome: ({ title }) => title,
    }),
  )

const findColumnName = (
  columns: ReadonlyArray<Column.Column>,
  columnId: string,
): string =>
  pipe(
    columns,
    Array.findFirst(({ id }) => id === columnId),
    Option.match({
      onNone: () => columnId,
      onSome: ({ name }) => name,
    }),
  )

// VIEW

type ApplicationViewBuilder = HtmlBuilder<Message>

const cardContent = (
  card: Card,
  h: ApplicationViewBuilder,
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

const cardView = (
  model: Model,
  card: Card,
  columnId: string,
  index: number,
  draggable: RenderInfo['draggable'],
  h: ApplicationViewBuilder,
): Html => {
  const isThisCardBeingDragged = Option.exists(
    maybeDraggedItemId(model.dragAndDrop.model),
    id => id === card.id,
  )
  const isPointerDragged =
    model.dragAndDrop.model.dragState._tag === 'Dragging' &&
    isThisCardBeingDragged
  const isKeyboardDragged =
    model.dragAndDrop.model.dragState._tag === 'KeyboardDragging' &&
    isThisCardBeingDragged

  return h.keyed('li')(
    card.id,
    [
      h.Class(
        clsx('rounded-lg p-3 border-2 outline-none', {
          'bg-gray-100 border-dashed border-gray-300 opacity-50':
            isPointerDragged,
          'bg-white shadow-sm border-blue-400': isKeyboardDragged,
          'bg-white shadow-sm select-none border-transparent focus:border-gray-400 cursor-grab':
            !isPointerDragged && !isKeyboardDragged,
        }),
      ),
      ...draggable({ itemId: card.id, containerId: columnId, index }),
    ],
    cardContent(card, h),
  )
}

const ghostCardView = (card: Card, h: ApplicationViewBuilder): Html =>
  h.div(
    [
      h.Class(
        'rounded-lg bg-white shadow-lg p-3 border border-gray-200 scale-105 rotate-2',
      ),
    ],
    cardContent(card, h),
  )

const addCardView = (
  model: Model,
  columnId: string,
  h: ApplicationViewBuilder,
): Html => {
  const isAddingToThisColumn = Option.exists(
    model.newCardForm.model.maybeColumnId,
    id => id === columnId,
  )

  if (isAddingToThisColumn) {
    return model.newCardForm.view()
  }

  return Button.view(
    {
      onClick: Message.ClickedAddCard({ columnId }),
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Class(
              'w-full rounded-lg border border-dashed border-gray-300 p-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors cursor-pointer',
            ),
          ],
          ['+ Add card'],
        ),
    },
    h,
  )
}

const dropPlaceholder = (h: ApplicationViewBuilder): Html =>
  h.keyed('li')('drop-placeholder', [
    h.Class(
      'rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 h-12',
    ),
    h.AriaHidden(true),
  ])

const findCard = (model: Model, cardId: string): Option.Option<Card> =>
  pipe(
    model.columns,
    Array.flatMap(({ cards }) => cards),
    Array.findFirst(({ id }) => id === cardId),
  )

const defaultCardElements = (
  model: Model,
  column: Column.Column,
  draggable: RenderInfo['draggable'],
  h: ApplicationViewBuilder,
): ReadonlyArray<Html> =>
  Array.map(column.cards, (card, index) =>
    cardView(model, card, column.id, index, draggable, h),
  )

const previewCardElements = (
  model: Model,
  column: Column.Column,
  draggable: RenderInfo['draggable'],
  h: ApplicationViewBuilder,
): ReadonlyArray<Html> => {
  if (!isDragging(model.dragAndDrop.model)) {
    return defaultCardElements(model, column, draggable, h)
  }

  return Option.match(maybeDraggedItemId(model.dragAndDrop.model), {
    onNone: () => defaultCardElements(model, column, draggable, h),
    onSome: draggedId => {
      const maybeTarget = maybeDropTarget(model.dragAndDrop.model)
      const visibleCards = Array.filter(
        column.cards,
        ({ id }) => id !== draggedId,
      )
      const cardElements = Array.map(visibleCards, (card, index) =>
        cardView(model, card, column.id, index, draggable, h),
      )

      const isTargetColumn = Option.exists(
        maybeTarget,
        target => target.containerId === column.id,
      )

      if (!isTargetColumn) {
        return cardElements
      }

      const targetIndex = Option.match(maybeTarget, {
        onNone: () => visibleCards.length,
        onSome: target => Math.min(target.index, visibleCards.length),
      })

      const isPointerDrag =
        model.dragAndDrop.model.dragState._tag === 'Dragging'
      const insertElement = isPointerDrag
        ? dropPlaceholder(h)
        : Option.match(findCard(model, draggedId), {
            onNone: () => dropPlaceholder(h),
            onSome: card =>
              cardView(model, card, column.id, targetIndex, draggable, h),
          })

      return pipe(
        cardElements,
        Array.insertAt(targetIndex, insertElement),
        Option.getOrElse(() => [...cardElements, insertElement]),
      )
    },
  })
}

const columnView = (
  model: Model,
  column: Column.Column,
  render: RenderInfo,
  h: ApplicationViewBuilder,
): Html => {
  const maybeCurrentDropTarget = maybeDropTarget(model.dragAndDrop.model)
  const isDropTarget =
    isDragging(model.dragAndDrop.model) &&
    Option.exists(
      maybeCurrentDropTarget,
      target => target.containerId === column.id,
    )

  return h.keyed('div')(
    column.id,
    [
      h.Role('region'),
      h.AriaLabel(column.name),
      h.Class(
        clsx('bg-gray-50 rounded-lg p-3 flex flex-col min-h-0 border-2', {
          'border-dashed border-blue-300': isDropTarget,
          'border-transparent': !isDropTarget,
        }),
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'flex items-center justify-between border-b border-gray-200 pb-2 mb-3',
          ),
        ],
        [
          h.h2(
            [
              h.Class(
                'text-xs font-semibold uppercase tracking-wide text-gray-500',
              ),
            ],
            [column.name],
          ),
          h.span(
            [h.Class('text-xs text-gray-400')],
            [`${column.cards.length}`],
          ),
        ],
      ),
      h.ul(
        [
          h.Class('flex flex-col gap-2 flex-1 overflow-y-auto min-h-0'),
          ...render.droppable(column.id, column.name),
        ],
        previewCardElements(model, column, render.draggable, h),
      ),
      h.div(
        [h.Class('mt-3 pt-2 border-t border-gray-200')],
        [addCardView(model, column.id, h)],
      ),
    ],
  )
}

const findDraggedCard = (model: Model): Option.Option<Card> =>
  pipe(
    model.dragAndDrop.model,
    maybeDraggedItemId,
    Option.flatMap(cardId => findCard(model, cardId)),
  )

const ghostElement = (model: Model, h: ApplicationViewBuilder) =>
  pipe(
    ghostStyle(model.dragAndDrop.model),
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

const view = (model: Model, h: ApplicationViewBuilder) => ({
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
      model.dragAndDrop.view({
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
                  columnView(model, column, render, h),
                ),
              ),
              ghostElement(model, h),
            ],
          ),
      }),
      h.div(
        [h.Class('sr-only'), h.AriaLive('assertive')],
        [model.announcement],
      ),
    ],
  ),
})

// LIVE

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags }) {
    const crypto = yield* Crypto.Crypto
    const store = yield* KeyValueStore.KeyValueStore
    const dragAndDrop = yield* new DragAndDrop.DragAndDrop('dragAndDrop', {
      id: 'kanban',
    })
    const newCardForm = yield* new NewCardForm('newCardForm')

    const columns = Option.match(flags.maybeSavedBoard, {
      onNone: () => DEFAULT_COLUMNS,
      onSome: savedBoard => savedBoard.columns,
    })

    return {
      model: {
        columns,
        dragAndDrop,
        newCardForm,
        announcement: '',
      },

      update: {
        ClickedAddCard: (model, { columnId }) => ({
          model,
          messages: [
            model.newCardForm.send(
              NewCardForm.Message.RequestedOpen({ columnId }),
            ),
          ],
        }),

        CompletedGenerateCardId: (model, { cardId, columnId, title }) => {
          const nextColumns = Array.map(model.columns, column => {
            if (column.id !== columnId) {
              return column
            }

            return Column.appendCard(column, {
              id: cardId,
              title,
              description: '',
              sortKey: '',
            })
          })

          return {
            model: modifyFields(model, { columns: () => nextColumns }),
            commands: [SaveBoard({ columns: nextColumns })],
            messages: [
              model.newCardForm.send(NewCardForm.Message.RequestedClose()),
            ],
          }
        },

        CompletedSaveBoard: model => ({ model }),

        ...newCardForm.on({
          SubmittedCard: (model, { columnId, title }) => ({
            model,
            commands: [GenerateCardId({ columnId, title })],
          }),
        }),

        ...dragAndDrop.on({
          StartedKeyboardDrag: (model, { itemId }) => ({
            model: modifyFields(model, {
              announcement: () =>
                `Picked up ${findCardTitle(model.columns, itemId)}. Use arrow keys to move within column, Tab to move between columns, Space to drop, Escape to cancel.`,
            }),
          }),

          ChangedKeyboardTarget: (
            model,
            { fromContainerId, toContainerId, toIndex },
          ) => {
            const columnName = findColumnName(model.columns, toContainerId)

            return {
              model: modifyFields(model, {
                announcement: () =>
                  fromContainerId !== toContainerId
                    ? `Moved to ${columnName}, position ${toIndex + 1}.`
                    : `Position ${toIndex + 1} in ${columnName}.`,
              }),
            }
          },

          Reordered: (
            model,
            { itemId, fromContainerId, toContainerId, toIndex },
          ) => {
            const nextColumns = Column.reorder(
              model.columns,
              itemId,
              fromContainerId,
              toContainerId,
              toIndex,
            )

            return {
              model: modifyFields(model, {
                columns: () => nextColumns,
                announcement: () =>
                  `Dropped ${findCardTitle(model.columns, itemId)} in position ${toIndex + 1} of ${findColumnName(model.columns, toContainerId)}.`,
              }),
              commands: [SaveBoard({ columns: nextColumns })],
            }
          },

          Cancelled: (model, { itemId }) => ({
            model: modifyFields(model, {
              announcement: () =>
                `Drag cancelled, ${findCardTitle(model.columns, itemId)} returned to original position.`,
            }),
          }),
        }),
      },

      commands: {
        GenerateCardId: ({ columnId, title }) =>
          Effect.gen(function* () {
            const cardId = yield* Effect.orDie(crypto.randomUUIDv4)
            return Message.CompletedGenerateCardId({ cardId, columnId, title })
          }),

        SaveBoard: ({ columns: nextColumns }) =>
          Effect.gen(function* () {
            const encodedBoard = yield* Schema.encodeEffect(
              SavedBoardJsonString,
            )({ columns: nextColumns })
            yield* store.set(STORAGE_KEY, encodedBoard)
            return Message.CompletedSaveBoard()
          }).pipe(
            Effect.catch(() => Effect.succeed(Message.CompletedSaveBoard())),
          ),
      },

      view,
    }
  }),
)
