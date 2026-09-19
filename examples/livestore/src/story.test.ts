import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import {
  AddItem,
  ClearCompleted,
  DeleteItem,
  Message,
  ToggleItem,
  update,
} from './main'
import { buyMilk, doneTask, loadingModel, successModel } from './main.fixture'

describe('update', () => {
  describe('adding tasks', () => {
    test('UpdatedNewItemText stores the input value', () => {
      story(
        update,
        given(successModel([])),
        message(Message.UpdatedNewItemText({ text: 'Buy milk' })),
        model(model => {
          expect(model.newItemText).toBe('Buy milk')
        }),
      )
    })

    test('SubmittedNewItem requests AddItem and clears the input', () => {
      story(
        update,
        given(
          modifyFields(successModel([]), { newItemText: () => 'Buy milk' }),
        ),
        message(Message.SubmittedNewItem()),
        Command.expectExact(AddItem({ text: 'Buy milk' })),
        Command.resolve(AddItem, Message.CompletedAddItem()),
        model(model => {
          expect(model.newItemText).toBe('')
        }),
      )
    })

    test('SubmittedNewItem with whitespace-only text is ignored', () => {
      story(
        update,
        given(modifyFields(successModel([]), { newItemText: () => '   ' })),
        message(Message.SubmittedNewItem()),
        Command.expectNone(),
      )
    })
  })

  describe('mutating tasks', () => {
    test('ClickedToggleItem requests ToggleItem for that id', () => {
      story(
        update,
        given(successModel([buyMilk])),
        message(Message.ClickedToggleItem({ id: 'a' })),
        Command.expectExact(ToggleItem({ id: 'a' })),
        Command.resolve(ToggleItem, Message.CompletedToggleItem()),
      )
    })

    test('ClickedDeleteItem requests DeleteItem for that id', () => {
      story(
        update,
        given(successModel([buyMilk])),
        message(Message.ClickedDeleteItem({ id: 'a' })),
        Command.expectExact(DeleteItem({ id: 'a' })),
        Command.resolve(DeleteItem, Message.CompletedDeleteItem()),
      )
    })

    test('ClickedClearCompleted requests ClearCompleted', () => {
      story(
        update,
        given(successModel([buyMilk, doneTask])),
        message(Message.ClickedClearCompleted()),
        Command.expectExact(ClearCompleted()),
        Command.resolve(ClearCompleted, Message.CompletedClearCompleted()),
      )
    })
  })

  describe('reactive projection', () => {
    test('ReceivedItems projects LiveStore rows into the Model', () => {
      story(
        update,
        given(loadingModel),
        message(Message.ReceivedItems({ items: [buyMilk, doneTask] })),
        model(model => {
          expect(model.itemsAsyncData._tag).toBe('Success')
          expect(
            Option.map(
              AsyncData.getData(model.itemsAsyncData),
              items => items.length,
            ),
          ).toStrictEqual(Option.some(2))
        }),
      )
    })

    test('CompletedAddItem leaves the projection to the Subscription', () => {
      story(
        update,
        given(successModel([buyMilk])),
        message(Message.CompletedAddItem()),
        Command.expectNone(),
        model(model => {
          expect(model.itemsAsyncData._tag).toBe('Success')
        }),
      )
    })
  })

  describe('errors', () => {
    test('FailedAddItem records a mutation error without changing loaded items', () => {
      story(
        update,
        given(successModel([buyMilk])),
        message(Message.FailedAddItem({ error: 'write blocked' })),
        model(model => {
          expect(model.itemsAsyncData._tag).toBe('Success')
          expect(model.maybeMutationError).toStrictEqual(
            Option.some('write blocked'),
          )
        }),
      )
    })

    test('a mutation failure during loading does not claim the query failed', () => {
      story(
        update,
        given(loadingModel),
        message(Message.FailedToggleItem({ error: 'write blocked' })),
        model(model => {
          expect(model.itemsAsyncData._tag).toBe('Loading')
          expect(model.maybeMutationError).toStrictEqual(
            Option.some('write blocked'),
          )
        }),
      )
    })

    test('ReceivedItems does not erase a mutation error', () => {
      story(
        update,
        given(
          modifyFields(successModel([buyMilk]), {
            maybeMutationError: () => Option.some('write blocked'),
          }),
        ),
        message(Message.ReceivedItems({ items: [buyMilk] })),
        model(model => {
          expect(model.itemsAsyncData._tag).toBe('Success')
          expect(model.maybeMutationError).toStrictEqual(
            Option.some('write blocked'),
          )
        }),
      )
    })

    test('a completed mutation does not erase a previous mutation error', () => {
      story(
        update,
        given(
          modifyFields(successModel([buyMilk]), {
            maybeMutationError: () => Option.some('write blocked'),
          }),
        ),
        message(Message.CompletedAddItem()),
        model(model => {
          expect(model.itemsAsyncData._tag).toBe('Success')
          expect(model.maybeMutationError).toStrictEqual(
            Option.some('write blocked'),
          )
        }),
      )
    })

    test('starting a new mutation clears the previous mutation error', () => {
      story(
        update,
        given(
          modifyFields(successModel([buyMilk]), {
            maybeMutationError: () => Option.some('write blocked'),
          }),
        ),
        message(Message.ClickedToggleItem({ id: buyMilk.id })),
        Command.expectExact(ToggleItem({ id: buyMilk.id })),
        model(model => {
          expect(model.maybeMutationError).toStrictEqual(Option.none())
        }),
        Command.resolve(ToggleItem, Message.CompletedToggleItem()),
      )
    })
  })

  describe('filtering', () => {
    test('SelectedFilter updates the filter without a Command', () => {
      story(
        update,
        given(successModel([buyMilk, doneTask])),
        message(Message.SelectedFilter({ filter: 'Completed' })),
        Command.expectNone(),
        model(model => {
          expect(model.filter).toBe('Completed')
        }),
      )
    })
  })
})
