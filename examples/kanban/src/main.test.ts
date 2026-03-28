import { Option } from 'effect'
import { Test, Ui } from 'foldkit'
import { generateKeyBetween } from 'fractional-indexing'
import { describe, expect, test } from 'vitest'

import { FocusAddCardInput, SaveBoard } from './command'
import { DEFAULT_COLUMNS } from './constant'
import { Column } from './domain'
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

const emptyModel: Model = {
  columns: DEFAULT_COLUMNS,
  dragAndDrop: Ui.DragAndDrop.init({ id: 'kanban' }),
  maybeNewCardColumnId: Option.none(),
  newCardTitle: '',
  nextCardId: 100,
  announcement: '',
}

describe('kanban update', () => {
  describe('add card', () => {
    test('ClickedAddCard opens the add card form for the column', () => {
      Test.story(
        update,
        Test.with(emptyModel),
        Test.message(ClickedAddCard({ columnId: 'todo' })),
        Test.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
        Test.tap(({ model }) => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.some('todo'))
          expect(model.newCardTitle).toBe('')
        }),
      )
    })

    test('ChangedNewCardTitle updates the title', () => {
      Test.story(
        update,
        Test.with(emptyModel),
        Test.message(ClickedAddCard({ columnId: 'todo' })),
        Test.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
        Test.message(ChangedNewCardTitle({ value: 'New task' })),
        Test.tap(({ model }) => {
          expect(model.newCardTitle).toBe('New task')
        }),
      )
    })

    test('SubmittedNewCard adds card to the column and saves', () => {
      Test.story(
        update,
        Test.with(emptyModel),
        Test.message(ClickedAddCard({ columnId: 'done' })),
        Test.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
        Test.message(ChangedNewCardTitle({ value: 'Ship it' })),
        Test.message(SubmittedNewCard()),
        Test.resolve(SaveBoard, CompletedSaveBoard()),
        Test.tap(({ model }) => {
          const doneColumn = model.columns.find(column => column.id === 'done')
          const lastCard = doneColumn?.cards[doneColumn.cards.length - 1]
          expect(lastCard?.title).toBe('Ship it')
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.none())
          expect(model.nextCardId).toBe(101)
        }),
      )
    })

    test('SubmittedNewCard ignores empty title', () => {
      Test.story(
        update,
        Test.with(emptyModel),
        Test.message(ClickedAddCard({ columnId: 'todo' })),
        Test.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
        Test.message(SubmittedNewCard()),
        Test.tap(({ model }) => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.some('todo'))
        }),
      )
    })

    test('CancelledNewCard closes the form', () => {
      Test.story(
        update,
        Test.with(emptyModel),
        Test.message(ClickedAddCard({ columnId: 'todo' })),
        Test.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
        Test.message(ChangedNewCardTitle({ value: 'Draft' })),
        Test.message(CancelledNewCard()),
        Test.tap(({ model }) => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.none())
          expect(model.newCardTitle).toBe('')
        }),
      )
    })
  })

  describe('drag and drop reorder', () => {
    test('reorders a card within the same column', () => {
      const firstCardId = emptyModel.columns[0]!.cards[0]!.id
      Test.story(
        update,
        Test.with(emptyModel),
        Test.message(
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
        Test.message(
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
        Test.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.ReleasedPointer(),
          }),
        ),
        Test.resolve(SaveBoard, CompletedSaveBoard()),
        Test.tap(({ model }) => {
          const todoColumn = model.columns.find(column => column.id === 'todo')
          const cardIds = todoColumn?.cards.map(card => card.id)
          expect(cardIds?.indexOf(firstCardId)).toBeGreaterThan(0)
        }),
      )
    })

    test('moves a card to a different column', () => {
      const cardId = emptyModel.columns[0]!.cards[0]!.id
      Test.story(
        update,
        Test.with(emptyModel),
        Test.message(
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
        Test.message(
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
        Test.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.ReleasedPointer(),
          }),
        ),
        Test.resolve(SaveBoard, CompletedSaveBoard()),
        Test.tap(({ model }) => {
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

    test('cancelled drag does not change columns', () => {
      Test.story(
        update,
        Test.with(emptyModel),
        Test.message(
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
        Test.message(
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
        Test.message(
          GotDragAndDropMessage({
            message: Ui.DragAndDrop.CancelledDrag(),
          }),
        ),
        Test.tap(({ model }) => {
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
