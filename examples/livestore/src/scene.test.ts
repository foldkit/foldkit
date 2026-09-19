import {
  Command,
  click,
  expect,
  given,
  label,
  role,
  scene,
  submit,
  text,
  type,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import {
  AddItem,
  ClearCompleted,
  DeleteItem,
  Message,
  ToggleItem,
  update,
  view,
} from './main'
import {
  buyMilk,
  doneTask,
  failureModel,
  loadingModel,
  mutationFailureModel,
  staleModel,
  successModel,
  walkDog,
} from './main.fixture'

describe('rendered task states', () => {
  test('loading tasks shows a status message', () => {
    scene(
      { update, view },
      given(loadingModel),
      expect(text('Loading LiveStore...')).toExist(),
    )
  })

  test('loaded tasks show their active and completed counts', () => {
    scene(
      { update, view },
      given(successModel([buyMilk, walkDog, doneTask])),
      expect(text('Buy milk')).toExist(),
      expect(text('Walk the dog')).toExist(),
      expect(text('Done task')).toExist(),
      expect(role('status')).toContainText('2 active, 1 completed'),
    )
  })

  test('an empty task list shows a placeholder', () => {
    scene(
      { update, view },
      given(successModel([])),
      expect(text('No tasks yet. Add one above!')).toExist(),
    )
  })

  test('a task-loading failure shows its error', () => {
    scene(
      { update, view },
      given(failureModel),
      expect(text('Could not load tasks')).toExist(),
      expect(text('LiveStore is unavailable')).toExist(),
    )
  })

  test('refreshing tasks remain visible beneath a status banner', () => {
    scene(
      { update, view },
      given(staleModel([buyMilk], 'Write blocked')),
      expect(text('Buy milk')).toExist(),
      expect(text('Showing the last known tasks', { exact: false })).toExist(),
    )
  })

  test('an update failure shows an error without hiding loaded tasks', () => {
    scene(
      { update, view },
      given(mutationFailureModel([buyMilk], 'Write blocked')),
      expect(text('Buy milk')).toExist(),
      expect(role('alert')).toContainText('Could not update LiveStore'),
      expect(role('alert')).toContainText('Write blocked'),
    )
  })
})

describe('task interactions', () => {
  test('submitting a task clears the input and starts adding it', () => {
    scene(
      { update, view },
      given(successModel([])),
      type(label('New task'), 'Write docs'),
      submit(role('form')),
      Command.expectExact(AddItem({ text: 'Write docs' })),
      Command.resolve(AddItem, Message.SucceededAddItem()),
      expect(label('New task')).toHaveValue(''),
    )
  })

  test('clicking a task checkbox starts toggling that task', () => {
    scene(
      { update, view },
      given(successModel([buyMilk])),
      click(label('Buy milk')),
      Command.expectExact(ToggleItem({ id: 'a' })),
      Command.resolve(ToggleItem, Message.SucceededToggleItem()),
    )
  })

  test('clicking a task delete button starts deleting that task', () => {
    scene(
      { update, view },
      given(successModel([buyMilk])),
      click(role('button', { name: 'Delete Buy milk' })),
      Command.expectExact(DeleteItem({ id: 'a' })),
      Command.resolve(DeleteItem, Message.SucceededDeleteItem()),
    )
  })

  test('clearing completed tasks starts their removal', () => {
    scene(
      { update, view },
      given(successModel([buyMilk, doneTask])),
      click(role('button', { name: 'Clear 1 completed' })),
      Command.expectExact(ClearCompleted()),
      Command.resolve(ClearCompleted, Message.SucceededClearCompleted()),
    )
  })

  test('selecting the Completed filter shows only completed tasks', () => {
    scene(
      { update, view },
      given(successModel([buyMilk, doneTask])),
      click(role('button', { name: 'Completed' })),
      Command.expectNone(),
      expect(text('Done task')).toExist(),
      expect(text('Buy milk')).toBeAbsent(),
    )
  })
})
