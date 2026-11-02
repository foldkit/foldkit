import { Effect, Option } from 'effect'
import {
  Command,
  click,
  expect,
  given,
  inside,
  label,
  role,
  scene,
  submit,
  text,
  type,
  within,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { DragAndDropBlock } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import { FocusAddCardInput, GenerateCardId, SaveBoard } from './command'
import type { Card } from './domain/card'
import type { Column } from './domain/column'
import { Message } from './message'
import type { Model } from './model'

const card = (id: string, title: string, sortKey: string): Card => ({
  id,
  title,
  description: '',
  sortKey,
})

const testColumns: ReadonlyArray<Column> = [
  {
    id: 'todo',
    name: 'To Do',
    cards: [card('1', 'Write tests', 'a0'), card('2', 'Fix bug', 'a1')],
  },
  {
    id: 'in-progress',
    name: 'In Progress',
    cards: [card('3', 'Review PR', 'a0')],
  },
  { id: 'done', name: 'Done', cards: [] },
]

const testModel: Model = {
  columns: testColumns,
  dragAndDrop: DragAndDropBlock.Model.make({
    id: 'kanban',
    orientation: 'Vertical',
    activationThreshold: 5,
    keyboardDragGeneration: 0,
    dragState: DragAndDropBlock.Model.fields.dragState.make({ _tag: 'Idle' }),
  }),
  maybeNewCardColumnId: Option.none(),
  newCardTitle: '',
  announcement: '',
}

const toDoColumn = role('region', { name: 'To Do' })
const inProgressColumn = role('region', { name: 'In Progress' })
const doneColumn = role('region', { name: 'Done' })

const acknowledgeFocusInput = Command.resolve(
  FocusAddCardInput,
  Message.CompletedFocusAddCardInput(),
)

describe('view', () => {
  test('board renders columns with correct names', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(testModel),
        expect(role('heading', { name: 'To Do' })).toExist(),
        expect(role('heading', { name: 'In Progress' })).toExist(),
        expect(role('heading', { name: 'Done' })).toExist(),
      ),
    )
  })

  test('columns show card counts from test data', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(testModel),
        expect(toDoColumn).toContainText('2'),
        expect(inProgressColumn).toContainText('1'),
        expect(doneColumn).toContainText('0'),
      ),
    )
  })

  test('card titles are rendered within their columns', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(testModel),
        expect(within(toDoColumn, text('Write tests'))).toExist(),
        expect(within(toDoColumn, text('Fix bug'))).toExist(),
        expect(within(inProgressColumn, text('Review PR'))).toExist(),
      ),
    )
  })

  test('clicking add card shows the form within the column', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(testModel),
        inside(
          toDoColumn,
          click(role('button', { name: '+ Add card' })),
          acknowledgeFocusInput,
          expect(label('New card title')).toExist(),
        ),
      ),
    )
  })

  test('typing a card title updates the input', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(testModel),
        click(within(toDoColumn, role('button', { name: '+ Add card' }))),
        acknowledgeFocusInput,
        type(label('New card title'), 'Buy groceries'),
        expect(label('New card title')).toHaveValue('Buy groceries'),
      ),
    )
  })

  test('submitting the form adds a card to the column', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(testModel),
        inside(
          toDoColumn,
          click(role('button', { name: '+ Add card' })),
          acknowledgeFocusInput,
          type(label('New card title'), 'Buy groceries'),
          submit(role('form')),
          Command.expectExact(GenerateCardId),
          Command.resolve(
            GenerateCardId,
            Message.CompletedGenerateCardId({
              cardId: 'test-uuid',
              columnId: 'todo',
              title: 'Buy groceries',
            }),
          ),
          Command.expectExact(SaveBoard),
          Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
          expect(text('Buy groceries')).toExist(),
        ),
      ),
    )
  })

  test('cancelling closes the form and restores the add card button', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(testModel),
        click(within(toDoColumn, role('button', { name: '+ Add card' }))),
        acknowledgeFocusInput,
        expect(label('New card title')).toExist(),
        click(role('button', { name: 'Cancel' })),
        expect(label('New card title')).toBeAbsent(),
        expect(
          within(toDoColumn, role('button', { name: '+ Add card' })),
        ).toExist(),
      ),
    )
  })
})
