import { Option } from 'effect'
import { AsyncData, Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  AddItem,
  ClearCompleted,
  ClickedClearCompleted,
  ClickedDeleteItem,
  ClickedRetry,
  ClickedToggleItem,
  CommittedToStore,
  DeleteItem,
  FailedStoreOperation,
  LoadItems,
  NotifiedStoreChanged,
  ReceivedItems,
  SelectedFilter,
  SubmittedNewItem,
  ToggleItem,
  UpdatedNewItemText,
  update,
} from './main'
import { buyMilk, doneTask, loadingModel, readyModel } from './main.fixtures'

describe('update', () => {
  describe('adding tasks', () => {
    test('UpdatedNewItemText stores the input value', () => {
      Story.story(
        update,
        Story.with(readyModel([])),
        Story.message(UpdatedNewItemText({ text: 'Buy milk' })),
        Story.model(model => {
          expect(model.newItemText).toBe('Buy milk')
        }),
      )
    })

    test('SubmittedNewItem with text requests AddItem and clears the input', () => {
      Story.story(
        update,
        Story.with({ ...readyModel([]), newItemText: 'Buy milk' }),
        Story.message(SubmittedNewItem()),
        Story.Command.expectExact(AddItem({ text: 'Buy milk' })),
        Story.Command.resolve(AddItem, CommittedToStore()),
        Story.model(model => {
          expect(model.newItemText).toBe('')
        }),
      )
    })

    test('SubmittedNewItem with whitespace-only text is ignored', () => {
      Story.story(
        update,
        Story.with({ ...readyModel([]), newItemText: '   ' }),
        Story.message(SubmittedNewItem()),
        Story.Command.expectNone(),
      )
    })
  })

  describe('mutating tasks', () => {
    test('ClickedToggleItem requests ToggleItem for that id', () => {
      Story.story(
        update,
        Story.with(readyModel([buyMilk])),
        Story.message(ClickedToggleItem({ id: 'a' })),
        Story.Command.expectExact(ToggleItem({ id: 'a' })),
        Story.Command.resolve(ToggleItem, CommittedToStore()),
      )
    })

    test('ClickedDeleteItem requests DeleteItem for that id', () => {
      Story.story(
        update,
        Story.with(readyModel([buyMilk])),
        Story.message(ClickedDeleteItem({ id: 'a' })),
        Story.Command.expectExact(DeleteItem({ id: 'a' })),
        Story.Command.resolve(DeleteItem, CommittedToStore()),
      )
    })

    test('ClickedClearCompleted requests ClearCompleted', () => {
      Story.story(
        update,
        Story.with(readyModel([buyMilk, doneTask])),
        Story.message(ClickedClearCompleted()),
        Story.Command.expectExact(ClearCompleted()),
        Story.Command.resolve(ClearCompleted, CommittedToStore()),
      )
    })
  })

  describe('reactive reload', () => {
    test('NotifiedStoreChanged requests a reload', () => {
      Story.story(
        update,
        Story.with(readyModel([buyMilk])),
        Story.message(NotifiedStoreChanged()),
        Story.Command.expectExact(LoadItems()),
        Story.Command.resolve(LoadItems, ReceivedItems({ items: [buyMilk] })),
      )
    })

    test('ReceivedItems projects the store rows into the model', () => {
      Story.story(
        update,
        Story.with(loadingModel),
        Story.message(ReceivedItems({ items: [buyMilk, doneTask] })),
        Story.model(model => {
          expect(model.items._tag).toBe('Success')
          expect(
            Option.map(AsyncData.getData(model.items), items => items.length),
          ).toStrictEqual(Option.some(2))
        }),
      )
    })

    test('CommittedToStore leaves the model untouched', () => {
      Story.story(
        update,
        Story.with(readyModel([buyMilk])),
        Story.message(CommittedToStore()),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.items._tag).toBe('Success')
        }),
      )
    })

    test('ClickedRetry shows loading and requests a reload', () => {
      Story.story(
        update,
        Story.with({
          ...loadingModel,
          items: AsyncData.Failure({ error: 'boom' }),
        }),
        Story.message(ClickedRetry()),
        Story.model(model => {
          expect(model.items._tag).toBe('Loading')
        }),
        Story.Command.expectExact(LoadItems()),
        Story.Command.resolve(LoadItems, ReceivedItems({ items: [] })),
      )
    })
  })

  describe('errors', () => {
    test('FailedStoreOperation keeps known data and marks it stale', () => {
      Story.story(
        update,
        Story.with(readyModel([buyMilk])),
        Story.message(FailedStoreOperation({ error: 'write blocked' })),
        Story.model(model => {
          expect(model.items._tag).toBe('Stale')
          expect(AsyncData.getError(model.items)).toStrictEqual(
            Option.some('write blocked'),
          )
        }),
      )
    })

    test('FailedStoreOperation without known data becomes a failure', () => {
      Story.story(
        update,
        Story.with(loadingModel),
        Story.message(FailedStoreOperation({ error: 'open failed' })),
        Story.model(model => {
          expect(model.items._tag).toBe('Failure')
          expect(AsyncData.getError(model.items)).toStrictEqual(
            Option.some('open failed'),
          )
        }),
      )
    })
  })

  describe('filtering', () => {
    test('SelectedFilter updates the filter without a Command', () => {
      Story.story(
        update,
        Story.with(readyModel([buyMilk, doneTask])),
        Story.message(SelectedFilter({ filter: 'Completed' })),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.filter).toBe('Completed')
        }),
      )
    })
  })
})
