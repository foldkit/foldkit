import { Layer, Option } from 'effect'
import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'
import { generateKeyBetween } from 'fractional-indexing'

import { describe, expect, it } from '@effect/vitest'
import { DragAndDrop } from '@foldkit/ui'

import {
  ApplicationLive,
  GenerateCardId,
  Message,
  SaveBoard,
} from './application'
import type { Card } from './domain/card'
import type * as Column from './domain/column'
import { FocusAddCardInput, NewCardForm, NewCardFormLive } from './newCardForm'
import { ApplicationLayer } from './services'

type DragAndDropMessage = typeof DragAndDrop.DragAndDrop.Message.Type
type NewCardFormMessage = typeof NewCardForm.Message.Type

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

const application = ApplicationLive.pipe(
  Layer.provide(NewCardFormLive),
  Layer.provide(DragAndDrop.DragAndDropLive),
  Layer.provide(ApplicationLayer),
)

const startArgs = {
  flags: { maybeSavedBoard: Option.some({ columns: testColumns }) },
}

const dragAndDropMessage = (message: DragAndDropMessage) =>
  Block.deliver(DragAndDrop.DragAndDrop, 'dragAndDrop', message)

const newCardFormMessage = (message: NewCardFormMessage) =>
  Block.deliver(NewCardForm, 'newCardForm', message)

describe('update', () => {
  describe('add card', () => {
    const acknowledgeFocusInput = Command.resolve(
      FocusAddCardInput,
      NewCardForm.Message.CompletedFocusAddCardInput(),
    )

    it.effect('ClickedAddCard opens the add card form for the column', () =>
      story(
        application,
        startArgs,
        message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        model(model => {
          expect(model.newCardForm.maybeColumnId).toStrictEqual(
            Option.some('todo'),
          )
          expect(model.newCardForm.title).toBe('')
        }),
      ),
    )

    it.effect('ChangedNewCardTitle updates the title', () =>
      story(
        application,
        startArgs,
        message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        message(
          newCardFormMessage(
            NewCardForm.Message.ChangedNewCardTitle({ value: 'New task' }),
          ),
        ),
        model(model => {
          expect(model.newCardForm.title).toBe('New task')
        }),
      ),
    )

    it.effect('SubmittedNewCard adds card to the column and saves', () =>
      story(
        application,
        startArgs,
        message(Message.ClickedAddCard({ columnId: 'done' })),
        acknowledgeFocusInput,
        message(
          newCardFormMessage(
            NewCardForm.Message.ChangedNewCardTitle({ value: 'Ship it' }),
          ),
        ),
        message(newCardFormMessage(NewCardForm.Message.SubmittedNewCard())),
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
          expect(model.newCardForm.maybeColumnId).toStrictEqual(Option.none())
        }),
      ),
    )

    it.effect('SubmittedNewCard ignores empty title', () =>
      story(
        application,
        startArgs,
        message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        message(newCardFormMessage(NewCardForm.Message.SubmittedNewCard())),
        model(model => {
          expect(model.newCardForm.maybeColumnId).toStrictEqual(
            Option.some('todo'),
          )
        }),
      ),
    )

    it.effect('CancelledNewCard closes the form', () =>
      story(
        application,
        startArgs,
        message(Message.ClickedAddCard({ columnId: 'todo' })),
        acknowledgeFocusInput,
        message(
          newCardFormMessage(
            NewCardForm.Message.ChangedNewCardTitle({ value: 'Draft' }),
          ),
        ),
        message(newCardFormMessage(NewCardForm.Message.CancelledNewCard())),
        model(model => {
          expect(model.newCardForm.maybeColumnId).toStrictEqual(Option.none())
          expect(model.newCardForm.title).toBe('')
        }),
      ),
    )
  })

  describe('drag and drop reorder', () => {
    it.effect('reorders a card within the same column', () => {
      const firstCardId = testColumns[0]!.cards[0]!.id
      return story(
        application,
        startArgs,
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.PressedDraggable({
              itemId: firstCardId,
              containerId: 'todo',
              index: 0,
              screenX: 100,
              screenY: 100,
            }),
          ),
        ),
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.MovedPointer({
              screenX: 100,
              screenY: 200,
              clientX: 100,
              clientY: 200,
              maybeDropTarget: Option.some({ containerId: 'todo', index: 3 }),
            }),
          ),
        ),
        message(
          dragAndDropMessage(DragAndDrop.DragAndDrop.Message.ReleasedPointer()),
        ),
        Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
        model(model => {
          const todoColumn = model.columns.find(column => column.id === 'todo')
          const cardIds = todoColumn?.cards.map(card => card.id)
          expect(cardIds?.indexOf(firstCardId)).toBeGreaterThan(0)
        }),
      )
    })

    it.effect('moves a card to a different column', () => {
      const cardId = testColumns[0]!.cards[0]!.id
      return story(
        application,
        startArgs,
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.PressedDraggable({
              itemId: cardId,
              containerId: 'todo',
              index: 0,
              screenX: 100,
              screenY: 100,
            }),
          ),
        ),
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.MovedPointer({
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
        ),
        message(
          dragAndDropMessage(DragAndDrop.DragAndDrop.Message.ReleasedPointer()),
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

    it.effect('keyboard drag reorders within the same column', () => {
      const firstCardId = testColumns[0]!.cards[0]!.id
      return story(
        application,
        startArgs,
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.ActivatedKeyboardDrag({
              itemId: firstCardId,
              containerId: 'todo',
              index: 0,
            }),
          ),
        ),
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.CompletedResolveKeyboardMove({
              keyboardDragGeneration: 1,
              targetContainerId: 'todo',
              targetIndex: 2,
            }),
          ),
        ),
        DragAndDrop.test.settleFocus({
          path: 'dragAndDrop',
          itemId: firstCardId,
        }),
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.ConfirmedKeyboardDrop(),
          ),
        ),
        DragAndDrop.test.settleFocus({
          path: 'dragAndDrop',
          itemId: firstCardId,
        }),
        Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
        model(model => {
          const todoColumn = model.columns.find(column => column.id === 'todo')
          const cardIds = todoColumn?.cards.map(card => card.id)
          expect(cardIds?.indexOf(firstCardId)).toBe(2)
        }),
      )
    })

    it.effect('keyboard drag moves a card to a different column', () => {
      const cardId = testColumns[0]!.cards[0]!.id
      return story(
        application,
        startArgs,
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.ActivatedKeyboardDrag({
              itemId: cardId,
              containerId: 'todo',
              index: 0,
            }),
          ),
        ),
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.CompletedResolveKeyboardMove({
              keyboardDragGeneration: 1,
              targetContainerId: 'in-progress',
              targetIndex: 0,
            }),
          ),
        ),
        DragAndDrop.test.settleFocus({
          path: 'dragAndDrop',
          itemId: cardId,
        }),
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.ConfirmedKeyboardDrop(),
          ),
        ),
        DragAndDrop.test.settleFocus({
          path: 'dragAndDrop',
          itemId: cardId,
        }),
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

    it.effect('cancelled keyboard drag does not change columns', () => {
      const cardId = 'card-1'

      return story(
        application,
        startArgs,
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.ActivatedKeyboardDrag({
              itemId: cardId,
              containerId: 'todo',
              index: 0,
            }),
          ),
        ),
        message(
          dragAndDropMessage(DragAndDrop.DragAndDrop.Message.CancelledDrag()),
        ),
        DragAndDrop.test.settleFocus({
          path: 'dragAndDrop',
          itemId: cardId,
        }),
        model(model => {
          expect(model.columns).toStrictEqual(testColumns)
          expect(model.announcement).toBe(
            'Drag cancelled, Write tests returned to original position.',
          )
        }),
      )
    })

    it.effect('cancelled drag does not change columns', () =>
      story(
        application,
        startArgs,
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.PressedDraggable({
              itemId: testColumns[0]!.cards[0]!.id,
              containerId: 'todo',
              index: 0,
              screenX: 100,
              screenY: 100,
            }),
          ),
        ),
        message(
          dragAndDropMessage(
            DragAndDrop.DragAndDrop.Message.MovedPointer({
              screenX: 100,
              screenY: 200,
              clientX: 100,
              clientY: 200,
              maybeDropTarget: Option.none(),
            }),
          ),
        ),
        message(
          dragAndDropMessage(DragAndDrop.DragAndDrop.Message.CancelledDrag()),
        ),
        model(model => {
          expect(model.columns).toStrictEqual(testColumns)
        }),
      ),
    )
  })
})
