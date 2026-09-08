import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { generateKeyBetween } from 'fractional-indexing'
import { describe, expect, test } from 'vitest'

import { DragAndDrop } from '@foldkit/ui'

import { FocusAddCardInput, GenerateCardId, SaveBoard } from './command'
import { Column } from './domain'
import type { Card } from './domain/card'
import { Message } from './message'
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
  dragAndDrop: DragAndDrop.init({ id: 'kanban' }),
  maybeNewCardColumnId: Option.none(),
  newCardTitle: '',
  announcement: '',
}

describe('update', () => {
  describe('add card', () => {
    const acknowledgeFocusInput = Command.resolve(
      FocusAddCardInput,
      Message.CompletedFocusAddCardInput(),
    )

    test('ClickedAddCard opens the add card form for the column', () => {
      story(
        update,
        given(emptyModel),
        message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        model(model => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.some('todo'))
          expect(model.newCardTitle).toBe('')
        }),
      )
    })

    test('ChangedNewCardTitle updates the title', () => {
      story(
        update,
        given(emptyModel),
        message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        message(Message.ChangedNewCardTitle({ value: 'New task' })),
        model(model => {
          expect(model.newCardTitle).toBe('New task')
        }),
      )
    })

    test('SubmittedNewCard adds card to the column and saves', () => {
      story(
        update,
        given(emptyModel),
        message(Message.ClickedAddCard({ columnId: 'done' })),
        acknowledgeFocusInput,
        message(Message.ChangedNewCardTitle({ value: 'Ship it' })),
        message(Message.SubmittedNewCard()),
        Command.resolve(
          GenerateCardId,
          Message.CompletedGenerateCardId({
            cardId: 'test-uuid',
            columnId: 'done',
            title: 'Ship it',
          }),
        ),
        Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
        model(model => {
          const doneColumn = model.columns.find(column => column.id === 'done')
          const lastCard = doneColumn?.cards[doneColumn.cards.length - 1]
          expect(lastCard?.title).toBe('Ship it')
          expect(lastCard?.id).toBe('test-uuid')
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.none())
        }),
      )
    })

    test('SubmittedNewCard ignores empty title', () => {
      story(
        update,
        given(emptyModel),
        message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        message(Message.SubmittedNewCard()),
        model(model => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.some('todo'))
        }),
      )
    })

    test('CancelledNewCard closes the form', () => {
      story(
        update,
        given(emptyModel),
        message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        message(Message.ChangedNewCardTitle({ value: 'Draft' })),
        message(Message.CancelledNewCard()),
        model(model => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.none())
          expect(model.newCardTitle).toBe('')
        }),
      )
    })
  })

  describe('drag and drop reorder', () => {
    test('reorders a card within the same column', () => {
      const firstCardId = emptyModel.columns[0]!.cards[0]!.id
      story(
        update,
        given(emptyModel),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.PressedDraggable({
              itemId: firstCardId,
              containerId: 'todo',
              index: 0,
              screenX: 100,
              screenY: 100,
            }),
          }),
        ),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.MovedPointer({
              screenX: 100,
              screenY: 200,
              clientX: 100,
              clientY: 200,
              maybeDropTarget: Option.some({ containerId: 'todo', index: 3 }),
            }),
          }),
        ),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.ReleasedPointer(),
          }),
        ),
        Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
        model(model => {
          const todoColumn = model.columns.find(column => column.id === 'todo')
          const cardIds = todoColumn?.cards.map(card => card.id)
          expect(cardIds?.indexOf(firstCardId)).toBeGreaterThan(0)
        }),
      )
    })

    test('moves a card to a different column', () => {
      const cardId = emptyModel.columns[0]!.cards[0]!.id
      story(
        update,
        given(emptyModel),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.PressedDraggable({
              itemId: cardId,
              containerId: 'todo',
              index: 0,
              screenX: 100,
              screenY: 100,
            }),
          }),
        ),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.MovedPointer({
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
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.ReleasedPointer(),
          }),
        ),
        Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
        model(model => {
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
      story(
        update,
        given(emptyModel),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.ActivatedKeyboardDrag({
              itemId: firstCardId,
              containerId: 'todo',
              index: 0,
            }),
          }),
        ),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.CompletedResolveKeyboardMove({
              targetContainerId: 'todo',
              targetIndex: 2,
            }),
          }),
        ),
        Command.resolve(
          DragAndDrop.FocusItem({ itemId: firstCardId }),
          DragAndDrop.Message.CompletedFocusItem(),
        ),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.ConfirmedKeyboardDrop(),
          }),
        ),
        Command.resolve(
          DragAndDrop.FocusItem,
          DragAndDrop.Message.CompletedFocusItem(),
        ),
        Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
        model(model => {
          const todoColumn = model.columns.find(column => column.id === 'todo')
          const cardIds = todoColumn?.cards.map(card => card.id)
          expect(cardIds?.indexOf(firstCardId)).toBe(2)
        }),
      )
    })

    test('keyboard drag moves a card to a different column', () => {
      const cardId = emptyModel.columns[0]!.cards[0]!.id
      story(
        update,
        given(emptyModel),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.ActivatedKeyboardDrag({
              itemId: cardId,
              containerId: 'todo',
              index: 0,
            }),
          }),
        ),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.CompletedResolveKeyboardMove({
              targetContainerId: 'in-progress',
              targetIndex: 0,
            }),
          }),
        ),
        Command.resolve(
          DragAndDrop.FocusItem({ itemId: cardId }),
          DragAndDrop.Message.CompletedFocusItem(),
        ),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.ConfirmedKeyboardDrop(),
          }),
        ),
        Command.resolve(
          DragAndDrop.FocusItem,
          DragAndDrop.Message.CompletedFocusItem(),
        ),
        Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
        model(model => {
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
      story(
        update,
        given(emptyModel),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.ActivatedKeyboardDrag({
              itemId: emptyModel.columns[0]!.cards[0]!.id,
              containerId: 'todo',
              index: 0,
            }),
          }),
        ),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.CancelledDrag(),
          }),
        ),
        Command.resolve(
          DragAndDrop.FocusItem,
          DragAndDrop.Message.CompletedFocusItem(),
        ),
        model(model => {
          expect(model.columns).toStrictEqual(emptyModel.columns)
        }),
      )
    })

    test('cancelled drag does not change columns', () => {
      story(
        update,
        given(emptyModel),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.PressedDraggable({
              itemId: emptyModel.columns[0]!.cards[0]!.id,
              containerId: 'todo',
              index: 0,
              screenX: 100,
              screenY: 100,
            }),
          }),
        ),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.MovedPointer({
              screenX: 100,
              screenY: 200,
              clientX: 100,
              clientY: 200,
              maybeDropTarget: Option.none(),
            }),
          }),
        ),
        message(
          Message.GotDragAndDropMessage({
            message: DragAndDrop.Message.CancelledDrag(),
          }),
        ),
        model(model => {
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
