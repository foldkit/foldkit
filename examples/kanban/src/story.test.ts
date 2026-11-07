import { Option } from 'effect'
import { Story } from 'foldkit'
import { generateKeyBetween } from 'fractional-indexing'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { DragAndDrop } from '@foldkit/ui'

import { FocusAddCardInput, GenerateCardId, SaveBoard } from './command'
import { DragAndDropBinding } from './composition'
import { Column } from './domain'
import type { Card } from './domain/card'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import type { Model } from './model'

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
  dragAndDrop: DragAndDrop.DragAndDropBlock.Model.make({
    id: 'kanban',
    orientation: 'Vertical',
    activationThreshold: 5,
    keyboardDragGeneration: 0,
    dragState: DragAndDrop.DragAndDropBlock.Model.fields.dragState.make({
      _tag: 'Idle',
    }),
  }),
  maybeNewCardColumnId: Option.none(),
  newCardTitle: '',
  announcement: '',
}

describe('update', () => {
  describe('add card', () => {
    const acknowledgeFocusInput = Story.Command.resolve(
      FocusAddCardInput,
      Message.CompletedFocusAddCardInput(),
    )

    it.effect('ClickedAddCard opens the add card form for the column', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        Story.model(model => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.some('todo'))
          expect(model.newCardTitle).toBe('')
        }),
      ),
    )

    it.effect('ChangedNewCardTitle updates the title', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        Story.message(Message.ChangedNewCardTitle({ value: 'New task' })),
        Story.model(model => {
          expect(model.newCardTitle).toBe('New task')
        }),
      ),
    )

    it.effect('SubmittedNewCard adds card to the column and saves', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.message(Message.ClickedAddCard({ columnId: 'done' })),
        acknowledgeFocusInput,
        Story.message(Message.ChangedNewCardTitle({ value: 'Ship it' })),
        Story.message(Message.SubmittedNewCard()),
        Story.Command.resolve(
          GenerateCardId,
          Message.CompletedGenerateCardId({
            cardId: 'test-uuid',
            columnId: 'done',
            title: 'Ship it',
          }),
        ),
        Story.Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
        Story.model(model => {
          const doneColumn = model.columns.find(column => column.id === 'done')
          const lastCard = doneColumn?.cards[doneColumn.cards.length - 1]
          expect(lastCard?.title).toBe('Ship it')
          expect(lastCard?.id).toBe('test-uuid')
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.none())
        }),
      ),
    )

    it.effect('SubmittedNewCard ignores empty title', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        Story.message(Message.SubmittedNewCard()),
        Story.model(model => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.some('todo'))
        }),
      ),
    )

    it.effect('CancelledNewCard closes the form', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        Story.message(Message.ChangedNewCardTitle({ value: 'Draft' })),
        Story.message(Message.CancelledNewCard()),
        Story.model(model => {
          expect(model.maybeNewCardColumnId).toStrictEqual(Option.none())
          expect(model.newCardTitle).toBe('')
        }),
      ),
    )
  })

  describe('drag and drop reorder', () => {
    it.effect('reorders a card within the same column', () => {
      const firstCardId = emptyModel.columns[0]!.cards[0]!.id
      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.PressedDraggable({
            itemId: firstCardId,
            containerId: 'todo',
            index: 0,
            screenX: 100,
            screenY: 100,
          }),
        ),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.MovedPointer({
            screenX: 100,
            screenY: 200,
            clientX: 100,
            clientY: 200,
            maybeDropTarget: Option.some({ containerId: 'todo', index: 3 }),
          }),
        ),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.ReleasedPointer(),
        ),
        Story.Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
        Story.model(model => {
          const todoColumn = model.columns.find(column => column.id === 'todo')
          const cardIds = todoColumn?.cards.map(card => card.id)
          expect(cardIds?.indexOf(firstCardId)).toBeGreaterThan(0)
        }),
      )
    })

    it.effect('moves a card to a different column', () => {
      const cardId = emptyModel.columns[0]!.cards[0]!.id
      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.PressedDraggable({
            itemId: cardId,
            containerId: 'todo',
            index: 0,
            screenX: 100,
            screenY: 100,
          }),
        ),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.MovedPointer({
            screenX: 300,
            screenY: 100,
            clientX: 300,
            clientY: 100,
            maybeDropTarget: Option.some({
              containerId: 'in-progress',
              index: 0,
            }),
          }),
        ),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.ReleasedPointer(),
        ),
        Story.Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
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

    it.effect('keyboard drag reorders within the same column', () => {
      const firstCardId = emptyModel.columns[0]!.cards[0]!.id
      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.ActivatedKeyboardDrag({
            itemId: firstCardId,
            containerId: 'todo',
            index: 0,
          }),
        ),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.CompletedResolveKeyboardMove({
            keyboardDragGeneration: 1,
            targetContainerId: 'todo',
            targetIndex: 2,
          }),
        ),
        DragAndDrop.test.settleFocus({
          binding: DragAndDropBinding,
          itemId: firstCardId,
        }),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.ConfirmedKeyboardDrop(),
        ),
        DragAndDrop.test.settleFocus({
          binding: DragAndDropBinding,
          itemId: firstCardId,
        }),
        Story.Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
        Story.model(model => {
          const todoColumn = model.columns.find(column => column.id === 'todo')
          const cardIds = todoColumn?.cards.map(card => card.id)
          expect(cardIds?.indexOf(firstCardId)).toBe(2)
        }),
      )
    })

    it.effect('keyboard drag moves a card to a different column', () => {
      const cardId = emptyModel.columns[0]!.cards[0]!.id
      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.ActivatedKeyboardDrag({
            itemId: cardId,
            containerId: 'todo',
            index: 0,
          }),
        ),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.CompletedResolveKeyboardMove({
            keyboardDragGeneration: 1,
            targetContainerId: 'in-progress',
            targetIndex: 0,
          }),
        ),
        DragAndDrop.test.settleFocus({
          binding: DragAndDropBinding,
          itemId: cardId,
        }),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.ConfirmedKeyboardDrop(),
        ),
        DragAndDrop.test.settleFocus({
          binding: DragAndDropBinding,
          itemId: cardId,
        }),
        Story.Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
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

    it.effect('cancelled keyboard drag does not change columns', () => {
      const cardId = 'card-1'

      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.ActivatedKeyboardDrag({
            itemId: cardId,
            containerId: 'todo',
            index: 0,
          }),
        ),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.CancelledDrag(),
        ),
        DragAndDrop.test.settleFocus({
          binding: DragAndDropBinding,
          itemId: cardId,
        }),
        Story.model(model => {
          expect(model.columns).toStrictEqual(emptyModel.columns)
        }),
      )
    })

    it.effect('cancelled drag does not change columns', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.PressedDraggable({
            itemId: emptyModel.columns[0]!.cards[0]!.id,
            containerId: 'todo',
            index: 0,
            screenX: 100,
            screenY: 100,
          }),
        ),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.MovedPointer({
            screenX: 100,
            screenY: 200,
            clientX: 100,
            clientY: 200,
            maybeDropTarget: Option.none(),
          }),
        ),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.CancelledDrag(),
        ),
        Story.model(model => {
          expect(model.columns).toStrictEqual(emptyModel.columns)
        }),
      ),
    )
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

  it('reorders within column', () => {
    const result = Column.reorder(columns, '1', 'a', 'a', 2)
    const cardIds = result
      .find(column => column.id === 'a')
      ?.cards.map(card => card.id)
    expect(cardIds).toStrictEqual(['2', '3', '1'])
  })

  it('moves card to a different column', () => {
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

  it('moves card to end of another column', () => {
    const result = Column.reorder(columns, '1', 'a', 'b', 1)
    const bIds = result
      .find(column => column.id === 'b')
      ?.cards.map(card => card.id)
    expect(bIds).toStrictEqual(['4', '1'])
  })

  it('assigns valid sortKeys after reorder', () => {
    const result = Column.reorder(columns, '3', 'a', 'a', 0)
    const cards = result.find(column => column.id === 'a')?.cards
    const sortKeys = cards?.map(card => card.sortKey) ?? []
    const isSorted = sortKeys.every(
      (key, index) => index === 0 || key > sortKeys[index - 1]!,
    )
    expect(isSorted).toBe(true)
  })
})
