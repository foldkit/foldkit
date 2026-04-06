import { Option } from 'effect'
import { Story, Ui } from 'foldkit'
import { generateKeyBetween } from 'fractional-indexing'
import { describe, expect, test } from 'vitest'

import { FocusAddCardInput, SaveBoard } from './command'
import { Column } from './domain'
import type { Card } from './domain/card'
import {
  CancelledNewCard,
  ChangedNewCardTitle,
  ClickedAddCard,
  CompletedFocusAddCardInput,
  CompletedSaveBoard,
  GotDragAndDropMessage,
  SubmittedNewCard,
} from './message'
import type { Model } from './model'
import { update } from './update'

const card = (id: string, title: string, sortKey: string): Card => ({
  id,
  title,
  description: '',
  sortKey,
})

const k1 = generateKeyBetween(null, null)
const k2 = generateKeyBetween(k1, null)
const k3 = generateKeyBetween(k2, null)
const k4 = generateKeyBetween(k3, null)

const testColumns: ReadonlyArray<Column.Column> = [
  {
    id: 'todo',
    name: 'To Do',
    cards: [
      card('card-1', 'Write tests', k1),
      card('card-2', 'Fix bug', k2),
      card('card-3', 'Add feature', k3),
      card('card-4', 'Update docs', k4),
    ],
  },
  {
    id: 'in-progress',
    name: 'In Progress',
    cards: [
      card('card-5', 'Review PR', k1),
      card('card-6', 'Deploy staging', k2),
    ],
  },
  {
    id: 'done',
    name: 'Done',
    cards: [card('card-7', 'Ship v1', k1)],
  },
]

const emptyModel: Model = {
  columns: testColumns,
  dragAndDrop: Ui.DragAndDrop.init({ id: 'kanban' }),
  maybeNewCardColumnId: Option.none(),
  newCardTitle: '',
  nextCardId: 100,
  announcement: '',
}

describe('kanban update', () => {
  describe('add card', () => {
    test('ClickedAddCard opens the add card form for the column', () => {
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(ClickedAddCard({ columnId: 'todo' })),
        Story.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
        Story.model(model => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.some('todo'))
          expect(model.newCardTitle).toBe('')
        }),
      )
    })

    test('ChangedNewCardTitle updates the title', () => {
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(ClickedAddCard({ columnId: 'todo' })),
        Story.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
        Story.message(ChangedNewCardTitle({ value: 'New task' })),
        Story.model(model => {
          expect(model.newCardTitle).toBe('New task')
        }),
      )
    })

    test('SubmittedNewCard adds card to the column and saves', () => {
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(ClickedAddCard({ columnId: 'done' })),
        Story.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
        Story.message(ChangedNewCardTitle({ value: 'Ship it' })),
        Story.message(SubmittedNewCard()),
        Story.resolve(SaveBoard, CompletedSaveBoard()),
        Story.model(model => {
          const doneColumn = model.columns.find(column => column.id === 'done')
          const lastCard = doneColumn?.cards[doneColumn.cards.length - 1]
          expect(lastCard?.title).toBe('Ship it')
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.none())
          expect(model.nextCardId).toBe(101)
        }),
      )
    })

    test('SubmittedNewCard ignores empty title', () => {
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(ClickedAddCard({ columnId: 'todo' })),
        Story.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
        Story.message(SubmittedNewCard()),
        Story.model(model => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.some('todo'))
        }),
      )
    })

    test('CancelledNewCard closes the form', () => {
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(ClickedAddCard({ columnId: 'todo' })),
        Story.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
        Story.message(ChangedNewCardTitle({ value: 'Draft' })),
        Story.message(CancelledNewCard()),
        Story.model(model => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.none())
          expect(model.newCardTitle).toBe('')
        }),
      )
    })
  })

  describe('drag and drop reorder', () => {
    test('reorders a card within the same column', () => {
      const firstCardId = emptyModel.columns[0]!.cards[0]!.id
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.PressedDraggable({
              itemId: firstCardId,
              containerId: 'todo',
              index: 0,
              screenX: 100,
              screenY: 100,
            }),
          }),
        ),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.MovedPointer({
              screenX: 100,
              screenY: 200,
              clientX: 100,
              clientY: 200,
              maybeDropTarget: Option.some({ containerId: 'todo', index: 3 }),
            }),
          }),
        ),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.ReleasedPointer(),
          }),
        ),
        Story.resolve(SaveBoard, CompletedSaveBoard()),
        Story.model(model => {
          const todoColumn = model.columns.find(column => column.id === 'todo')
          const cardIds = todoColumn?.cards.map(card => card.id)
          expect(cardIds?.indexOf(firstCardId)).toBeGreaterThan(0)
        }),
      )
    })

    test('moves a card to a different column', () => {
      const cardId = emptyModel.columns[0]!.cards[0]!.id
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.PressedDraggable({
              itemId: cardId,
              containerId: 'todo',
              index: 0,
              screenX: 100,
              screenY: 100,
            }),
          }),
        ),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.MovedPointer({
              screenX: 300,
              screenY: 100,
              clientX: 300,
              clientY: 100,
              maybeDropTarget: Option.some({
                containerId: 'in-progress',
                index: 0,
              }),
            }),
          }),
        ),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.ReleasedPointer(),
          }),
        ),
        Story.resolve(SaveBoard, CompletedSaveBoard()),
        Story.model(model => {
          const todoCards = model.columns
            .find(column => column.id === 'todo')
            ?.cards.map(card => card.id)
          const inProgressCards = model.columns
            .find(column => column.id === 'in-progress')
            ?.cards.map(card => card.id)
          expect(todoCards).not.toContain(cardId)
          expect(inProgressCards).toContain(cardId)
        }),
      )
    })

    test('keyboard drag reorders within the same column', () => {
      const firstCardId = emptyModel.columns[0]!.cards[0]!.id
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.ActivatedKeyboardDrag({
              itemId: firstCardId,
              containerId: 'todo',
              index: 0,
            }),
          }),
        ),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.ResolvedKeyboardMove({
              targetContainerId: 'todo',
              targetIndex: 2,
            }),
          }),
        ),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.ConfirmedKeyboardDrop(),
          }),
        ),
        Story.resolve(
          Ui.DragAndDrop.FocusItem,
          Ui.DragAndDrop.CompletedFocusItem(),
          message => GotDragAndDropMessage({ message }),
        ),
        Story.resolve(SaveBoard, CompletedSaveBoard()),
        Story.model(model => {
          const todoColumn = model.columns.find(column => column.id === 'todo')
          const cardIds = todoColumn?.cards.map(card => card.id)
          expect(cardIds?.indexOf(firstCardId)).toBe(2)
        }),
      )
    })

    test('keyboard drag moves a card to a different column', () => {
      const cardId = emptyModel.columns[0]!.cards[0]!.id
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.ActivatedKeyboardDrag({
              itemId: cardId,
              containerId: 'todo',
              index: 0,
            }),
          }),
        ),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.ResolvedKeyboardMove({
              targetContainerId: 'in-progress',
              targetIndex: 0,
            }),
          }),
        ),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.ConfirmedKeyboardDrop(),
          }),
        ),
        Story.resolve(
          Ui.DragAndDrop.FocusItem,
          Ui.DragAndDrop.CompletedFocusItem(),
          message => GotDragAndDropMessage({ message }),
        ),
        Story.resolve(SaveBoard, CompletedSaveBoard()),
        Story.model(model => {
          const todoCards = model.columns
            .find(column => column.id === 'todo')
            ?.cards.map(card => card.id)
          const inProgressCards = model.columns
            .find(column => column.id === 'in-progress')
            ?.cards.map(card => card.id)
          expect(todoCards).not.toContain(cardId)
          expect(inProgressCards).toContain(cardId)
        }),
      )
    })

    test('cancelled keyboard drag does not change columns', () => {
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.ActivatedKeyboardDrag({
              itemId: emptyModel.columns[0]!.cards[0]!.id,
              containerId: 'todo',
              index: 0,
            }),
          }),
        ),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.CancelledDrag(),
          }),
        ),
        Story.resolve(
          Ui.DragAndDrop.FocusItem,
          Ui.DragAndDrop.CompletedFocusItem(),
          message => GotDragAndDropMessage({ message }),
        ),
        Story.model(model => {
          expect(model.columns).toStrictEqual(emptyModel.columns)
        }),
      )
    })

    test('cancelled drag does not change columns', () => {
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.PressedDraggable({
              itemId: emptyModel.columns[0]!.cards[0]!.id,
              containerId: 'todo',
              index: 0,
              screenX: 100,
              screenY: 100,
            }),
          }),
        ),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.MovedPointer({
              screenX: 100,
              screenY: 200,
              clientX: 100,
              clientY: 200,
              maybeDropTarget: Option.none(),
            }),
          }),
        ),
        Story.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.CancelledDrag(),
          }),
        ),
        Story.model(model => {
          expect(model.columns).toStrictEqual(emptyModel.columns)
        }),
      )
    })
  })
})

describe('Column.reorder', () => {
  const k1 = generateKeyBetween(null, null)
  const k2 = generateKeyBetween(k1, null)
  const k3 = generateKeyBetween(k2, null)

  const columns = [
    {
      id: 'a',
      name: 'A',
      cards: [
        { id: '1', title: '1', description: '', sortKey: k1 },
        { id: '2', title: '2', description: '', sortKey: k2 },
        { id: '3', title: '3', description: '', sortKey: k3 },
      ],
    },
    {
      id: 'b',
      name: 'B',
      cards: [{ id: '4', title: '4', description: '', sortKey: k1 }],
    },
  ]

  test('reorders within column', () => {
    const result = Column.reorder(columns, '1', 'a', 'a', 2)
    const cardIds = result
      .find(column => column.id === 'a')
      ?.cards.map(card => card.id)
    expect(cardIds).toStrictEqual(['2', '3', '1'])
  })

  test('moves card to a different column', () => {
    const result = Column.reorder(columns, '1', 'a', 'b', 0)
    const aIds = result
      .find(column => column.id === 'a')
      ?.cards.map(card => card.id)
    const bIds = result
      .find(column => column.id === 'b')
      ?.cards.map(card => card.id)
    expect(aIds).toStrictEqual(['2', '3'])
    expect(bIds).toStrictEqual(['1', '4'])
  })

  test('moves card to end of another column', () => {
    const result = Column.reorder(columns, '1', 'a', 'b', 1)
    const bIds = result
      .find(column => column.id === 'b')
      ?.cards.map(card => card.id)
    expect(bIds).toStrictEqual(['4', '1'])
  })

  test('assigns valid sortKeys after reorder', () => {
    const result = Column.reorder(columns, '3', 'a', 'a', 0)
    const cards = result.find(column => column.id === 'a')?.cards
    const sortKeys = cards?.map(card => card.sortKey) ?? []
    const isSorted = sortKeys.every(
      (key, index) => index === 0 || key > sortKeys[index - 1]!,
    )
    expect(isSorted).toBe(true)
  })
})
