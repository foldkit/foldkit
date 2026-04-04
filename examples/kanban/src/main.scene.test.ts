import { Option } from 'effect'
import { Scene, Ui } from 'foldkit'
import { describe, test } from 'vitest'

import { FocusAddCardInput, SaveBoard } from './command'
import type { Card } from './domain/card'
import type { Column } from './domain/column'
import { CompletedFocusAddCardInput, CompletedSaveBoard } from './message'
import type { Model } from './model'
import { update } from './update'
import { view } from './view/index'

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
  dragAndDrop: Ui.DragAndDrop.init({ id: 'kanban' }),
  maybeNewCardColumnId: Option.none(),
  newCardTitle: '',
  nextCardId: 100,
  announcement: '',
}

const toDoColumn = Scene.role('region', { name: 'To Do' })
const inProgressColumn = Scene.role('region', { name: 'In Progress' })
const doneColumn = Scene.role('region', { name: 'Done' })

describe('scene', () => {
  test('board renders columns with correct names', () => {
    Scene.scene(
      { update, view },
      Scene.with(testModel),
      Scene.expect(Scene.role('heading', { name: 'To Do' })).toExist(),
      Scene.expect(Scene.role('heading', { name: 'In Progress' })).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Done' })).toExist(),
    )
  })

  test('columns show card counts from test data', () => {
    Scene.scene(
      { update, view },
      Scene.with(testModel),
      Scene.expect(toDoColumn).toContainText('2'),
      Scene.expect(inProgressColumn).toContainText('1'),
      Scene.expect(doneColumn).toContainText('0'),
    )
  })

  test('card titles are rendered within their columns', () => {
    Scene.scene(
      { update, view },
      Scene.with(testModel),
      Scene.expect(
        Scene.within(toDoColumn, Scene.text('Write tests')),
      ).toExist(),
      Scene.expect(Scene.within(toDoColumn, Scene.text('Fix bug'))).toExist(),
      Scene.expect(
        Scene.within(inProgressColumn, Scene.text('Review PR')),
      ).toExist(),
    )
  })

  test('clicking add card shows the form within the column', () => {
    Scene.scene(
      { update, view },
      Scene.with(testModel),
      Scene.click(
        Scene.within(toDoColumn, Scene.role('button', { name: '+ Add card' })),
      ),
      Scene.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
      Scene.expect(
        Scene.within(toDoColumn, Scene.label('New card title')),
      ).toExist(),
    )
  })

  test('typing a card title updates the input', () => {
    Scene.scene(
      { update, view },
      Scene.with(testModel),
      Scene.click(
        Scene.within(toDoColumn, Scene.role('button', { name: '+ Add card' })),
      ),
      Scene.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
      Scene.type(Scene.label('New card title'), 'Buy groceries'),
      Scene.expect(Scene.label('New card title')).toHaveValue('Buy groceries'),
    )
  })

  test('submitting the form adds a card to the column', () => {
    Scene.scene(
      { update, view },
      Scene.with(testModel),
      Scene.click(
        Scene.within(toDoColumn, Scene.role('button', { name: '+ Add card' })),
      ),
      Scene.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
      Scene.type(Scene.label('New card title'), 'Buy groceries'),
      Scene.submit(Scene.role('form')),
      Scene.resolve(SaveBoard, CompletedSaveBoard()),
      Scene.expect(
        Scene.within(toDoColumn, Scene.text('Buy groceries')),
      ).toExist(),
    )
  })

  test('cancelling closes the form and restores the add card button', () => {
    Scene.scene(
      { update, view },
      Scene.with(testModel),
      Scene.click(
        Scene.within(toDoColumn, Scene.role('button', { name: '+ Add card' })),
      ),
      Scene.resolve(FocusAddCardInput, CompletedFocusAddCardInput()),
      Scene.expect(Scene.label('New card title')).toExist(),
      Scene.click(Scene.role('button', { name: 'Cancel' })),
      Scene.expect(Scene.label('New card title')).toBeAbsent(),
      Scene.expect(
        Scene.within(toDoColumn, Scene.role('button', { name: '+ Add card' })),
      ).toExist(),
    )
  })
})
