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

describe('task state', () => {
  describe('adding a task', () => {
    test('editing the new task updates its draft text', () => {
      story(
        update,
        given(successModel([])),
        message(Message.UpdatedNewItemText({ text: 'Buy milk' })),
        model(model => {
          expect(model.newItemText).toBe('Buy milk')
        }),
      )
    })

    test('submitting a task clears its draft and starts adding it', () => {
      story(
        update,
        given(
          modifyFields(successModel([]), { newItemText: () => 'Buy milk' }),
        ),
        message(Message.SubmittedNewItem()),
        Command.expectExact(AddItem({ text: 'Buy milk' })),
        Command.resolve(AddItem, Message.SucceededAddItem()),
        model(model => {
          expect(model.newItemText).toBe('')
        }),
      )
    })

    test('submitting whitespace without a task is ignored', () => {
      story(
        update,
        given(modifyFields(successModel([]), { newItemText: () => '   ' })),
        message(Message.SubmittedNewItem()),
        Command.expectNone(),
      )
    })
  })

  describe('changing tasks', () => {
    test('toggling a task targets the selected task', () => {
      story(
        update,
        given(successModel([buyMilk])),
        message(Message.ClickedToggleItem({ id: 'a' })),
        Command.expectExact(ToggleItem({ id: 'a' })),
        Command.resolve(ToggleItem, Message.SucceededToggleItem()),
      )
    })

    test('deleting a task targets the selected task', () => {
      story(
        update,
        given(successModel([buyMilk])),
        message(Message.ClickedDeleteItem({ id: 'a' })),
        Command.expectExact(DeleteItem({ id: 'a' })),
        Command.resolve(DeleteItem, Message.SucceededDeleteItem()),
      )
    })

    test('clearing completed tasks starts their removal', () => {
      story(
        update,
        given(successModel([buyMilk, doneTask])),
        message(Message.ClickedClearCompleted()),
        Command.expectExact(ClearCompleted()),
        Command.resolve(ClearCompleted, Message.SucceededClearCompleted()),
      )
    })
  })

  describe('task snapshots', () => {
    test('an incoming task snapshot replaces the loading state', () => {
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

    test('an add confirmation preserves the current task snapshot', () => {
      story(
        update,
        given(successModel([buyMilk])),
        message(Message.SucceededAddItem()),
        Command.expectNone(),
        model(model => {
          expect(model.itemsAsyncData._tag).toBe('Success')
        }),
      )
    })
  })

  describe('errors', () => {
    test('an add failure preserves loaded tasks and reports the error', () => {
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

    test('an update failure keeps the task list loading and reports separately', () => {
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

    test('an incoming task snapshot preserves an update error', () => {
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

    test('a successful task update preserves a previous update error', () => {
      story(
        update,
        given(
          modifyFields(successModel([buyMilk]), {
            maybeMutationError: () => Option.some('write blocked'),
          }),
        ),
        message(Message.SucceededAddItem()),
        model(model => {
          expect(model.itemsAsyncData._tag).toBe('Success')
          expect(model.maybeMutationError).toStrictEqual(
            Option.some('write blocked'),
          )
        }),
      )
    })

    test('starting a task update clears the previous update error', () => {
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
        Command.resolve(ToggleItem, Message.SucceededToggleItem()),
      )
    })
  })

  describe('filtering', () => {
    test('choosing a filter makes it active', () => {
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
