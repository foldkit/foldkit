import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  AddItem,
  ClearCompleted,
  CommittedToStore,
  DeleteItem,
  LoadItems,
  ReceivedItems,
  ToggleItem,
  update,
  view,
} from './main'
import {
  buyMilk,
  doneTask,
  failedModel,
  loadingModel,
  readyModel,
  staleModel,
  walkDog,
} from './main.fixtures'

describe('view', () => {
  test('loading state shows a status message', () => {
    Scene.scene(
      { update, view },
      Scene.with(loadingModel),
      Scene.expect(Scene.text('Loading...')).toExist(),
    )
  })

  test('renders loaded tasks with active and completed counts', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel([buyMilk, walkDog, doneTask])),
      Scene.expect(Scene.text('Buy milk')).toExist(),
      Scene.expect(Scene.text('Walk the dog')).toExist(),
      Scene.expect(Scene.text('Done task')).toExist(),
      Scene.expect(Scene.role('status')).toContainText('2 active, 1 completed'),
    )
  })

  test('empty loaded state shows a placeholder', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel([])),
      Scene.expect(Scene.text('No tasks yet. Add one above!')).toExist(),
    )
  })

  test('error state shows the message and a retry button', () => {
    Scene.scene(
      { update, view },
      Scene.with(failedModel),
      Scene.expect(Scene.text('Could not read the store')).toExist(),
      Scene.expect(Scene.text('IndexedDB is unavailable')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Try again' })).toExist(),
    )
  })

  test('retry reloads the store and renders the returned tasks', () => {
    Scene.scene(
      { update, view },
      Scene.with(failedModel),
      Scene.click(Scene.role('button', { name: 'Try again' })),
      Scene.Command.expectExact(LoadItems()),
      Scene.Command.resolve(LoadItems, ReceivedItems({ items: [buyMilk] })),
      Scene.expect(Scene.text('Buy milk')).toExist(),
      Scene.expect(Scene.text('Could not read the store')).toBeAbsent(),
    )
  })

  test('stale state keeps cached tasks visible under a banner', () => {
    Scene.scene(
      { update, view },
      Scene.with(staleModel([buyMilk], 'Write blocked')),
      Scene.expect(Scene.text('Buy milk')).toExist(),
      Scene.expect(
        Scene.text('Showing the last known tasks', { exact: false }),
      ).toExist(),
    )
  })
})

describe('interactions', () => {
  test('submitting the form requests AddItem and clears the input', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel([])),
      Scene.type(Scene.label('New task'), 'Write docs'),
      Scene.submit(Scene.role('form')),
      Scene.Command.expectExact(AddItem({ text: 'Write docs' })),
      Scene.Command.resolve(AddItem, CommittedToStore()),
      Scene.expect(Scene.label('New task')).toHaveValue(''),
    )
  })

  test('clicking a checkbox requests ToggleItem', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel([buyMilk])),
      Scene.click(Scene.label('Buy milk')),
      Scene.Command.expectExact(ToggleItem({ id: 'a' })),
      Scene.Command.resolve(ToggleItem, CommittedToStore()),
    )
  })

  test('clicking delete requests DeleteItem', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel([buyMilk])),
      Scene.click(Scene.role('button', { name: 'Delete Buy milk' })),
      Scene.Command.expectExact(DeleteItem({ id: 'a' })),
      Scene.Command.resolve(DeleteItem, CommittedToStore()),
    )
  })

  test('clear completed requests ClearCompleted', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel([buyMilk, doneTask])),
      Scene.click(Scene.role('button', { name: 'Clear 1 completed' })),
      Scene.Command.expectExact(ClearCompleted()),
      Scene.Command.resolve(ClearCompleted, CommittedToStore()),
    )
  })

  test('selecting the Completed filter shows only completed tasks', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel([buyMilk, doneTask])),
      Scene.click(Scene.role('button', { name: 'Completed' })),
      Scene.Command.expectNone(),
      Scene.expect(Scene.text('Done task')).toExist(),
      Scene.expect(Scene.text('Buy milk')).toBeAbsent(),
    )
  })
})
