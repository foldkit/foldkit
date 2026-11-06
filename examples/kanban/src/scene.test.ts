import { Option } from 'effect'
import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { DragAndDrop } from '@foldkit/ui'

import { FocusAddCardInput, GenerateCardId, SaveBoard } from './command'
import type { Card } from './domain/card'
import type { Column } from './domain/column'
import { ApplicationBlock, layer } from './index'
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

const toDoColumn = Scene.role('region', { name: 'To Do' })
const inProgressColumn = Scene.role('region', { name: 'In Progress' })
const doneColumn = Scene.role('region', { name: 'Done' })

const acknowledgeFocusInput = Scene.Command.resolve(
  FocusAddCardInput,
  Message.CompletedFocusAddCardInput(),
)

describe('view', () => {
  it.effect('board renders columns with correct names', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(testModel),
      Scene.expect(Scene.role('heading', { name: 'To Do' })).toExist(),
      Scene.expect(Scene.role('heading', { name: 'In Progress' })).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Done' })).toExist(),
    ),
  )

  it.effect('columns show card counts from test data', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(testModel),
      Scene.expect(toDoColumn).toContainText('2'),
      Scene.expect(inProgressColumn).toContainText('1'),
      Scene.expect(doneColumn).toContainText('0'),
    ),
  )

  it.effect('card titles are rendered within their columns', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(testModel),
      Scene.expect(
        Scene.within(toDoColumn, Scene.text('Write tests')),
      ).toExist(),
      Scene.expect(Scene.within(toDoColumn, Scene.text('Fix bug'))).toExist(),
      Scene.expect(
        Scene.within(inProgressColumn, Scene.text('Review PR')),
      ).toExist(),
    ),
  )

  it.effect('clicking add card shows the form within the column', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(testModel),
      Scene.inside(
        toDoColumn,
        Scene.click(Scene.role('button', { name: '+ Add card' })),
        acknowledgeFocusInput,
        Scene.expect(Scene.label('New card title')).toExist(),
      ),
    ),
  )

  it.effect('typing a card title updates the input', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(testModel),
      Scene.click(
        Scene.within(toDoColumn, Scene.role('button', { name: '+ Add card' })),
      ),
      acknowledgeFocusInput,
      Scene.type(Scene.label('New card title'), 'Buy groceries'),
      Scene.expect(Scene.label('New card title')).toHaveValue('Buy groceries'),
    ),
  )

  it.effect('submitting the form adds a card to the column', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(testModel),
      Scene.inside(
        toDoColumn,
        Scene.click(Scene.role('button', { name: '+ Add card' })),
        acknowledgeFocusInput,
        Scene.type(Scene.label('New card title'), 'Buy groceries'),
        Scene.submit(Scene.role('form')),
        Scene.Command.expectExact(GenerateCardId),
        Scene.Command.resolve(
          GenerateCardId,
          Message.CompletedGenerateCardId({
            cardId: 'test-uuid',
            columnId: 'todo',
            title: 'Buy groceries',
          }),
        ),
        Scene.Command.expectExact(SaveBoard),
        Scene.Command.resolve(SaveBoard, Message.CompletedSaveBoard()),
        Scene.expect(Scene.text('Buy groceries')).toExist(),
      ),
    ),
  )

  it.effect('cancelling closes the form and restores the add card button', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(testModel),
      Scene.click(
        Scene.within(toDoColumn, Scene.role('button', { name: '+ Add card' })),
      ),
      acknowledgeFocusInput,
      Scene.expect(Scene.label('New card title')).toExist(),
      Scene.click(Scene.role('button', { name: 'Cancel' })),
      Scene.expect(Scene.label('New card title')).toBeAbsent(),
      Scene.expect(
        Scene.within(toDoColumn, Scene.role('button', { name: '+ Add card' })),
      ).toExist(),
    ),
  )
})
