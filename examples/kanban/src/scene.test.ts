import { Layer, Option } from 'effect'
import {
  Command,
  click,
  expect,
  inside,
  label,
  role,
  scene,
  submit,
  text,
  type,
  within,
} from 'foldkit/scene'

import { describe, it } from '@effect/vitest'
import { DragAndDrop } from '@foldkit/ui'

import {
  ApplicationLive,
  GenerateCardId,
  Message,
  SaveBoard,
} from './application'
import type { Card } from './domain/card'
import type { Column } from './domain/column'
import { FocusAddCardInput, NewCardForm, NewCardFormLive } from './newCardForm'
import { ApplicationLayer } from './services'

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

const application = ApplicationLive.pipe(
  Layer.provide(NewCardFormLive),
  Layer.provide(DragAndDrop.DragAndDropLive),
  Layer.provide(ApplicationLayer),
)

const startArgs = {
  flags: { maybeSavedBoard: Option.some({ columns: testColumns }) },
}

const toDoColumn = role('region', { name: 'To Do' })
const inProgressColumn = role('region', { name: 'In Progress' })
const doneColumn = role('region', { name: 'Done' })

const acknowledgeFocusInput = Command.resolve(
  FocusAddCardInput,
  NewCardForm.Message.CompletedFocusAddCardInput(),
)

describe('view', () => {
  it.effect('board renders columns with correct names', () =>
    scene(
      application,
      startArgs,
      expect(role('heading', { name: 'To Do' })).toExist(),
      expect(role('heading', { name: 'In Progress' })).toExist(),
      expect(role('heading', { name: 'Done' })).toExist(),
    ),
  )

  it.effect('columns show card counts from test data', () =>
    scene(
      application,
      startArgs,
      expect(toDoColumn).toContainText('2'),
      expect(inProgressColumn).toContainText('1'),
      expect(doneColumn).toContainText('0'),
    ),
  )

  it.effect('card titles are rendered within their columns', () =>
    scene(
      application,
      startArgs,
      expect(within(toDoColumn, text('Write tests'))).toExist(),
      expect(within(toDoColumn, text('Fix bug'))).toExist(),
      expect(within(inProgressColumn, text('Review PR'))).toExist(),
    ),
  )

  it.effect('clicking add card shows the form within the column', () =>
    scene(
      application,
      startArgs,
      inside(
        toDoColumn,
        click(role('button', { name: '+ Add card' })),
        acknowledgeFocusInput,
        expect(label('New card title')).toExist(),
      ),
    ),
  )

  it.effect('typing a card title updates the input', () =>
    scene(
      application,
      startArgs,
      click(within(toDoColumn, role('button', { name: '+ Add card' }))),
      acknowledgeFocusInput,
      type(label('New card title'), 'Buy groceries'),
      expect(label('New card title')).toHaveValue('Buy groceries'),
    ),
  )

  it.effect('submitting the form adds a card to the column', () =>
    scene(
      application,
      startArgs,
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

  it.effect('cancelling closes the form and restores the add card button', () =>
    scene(
      application,
      startArgs,
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
