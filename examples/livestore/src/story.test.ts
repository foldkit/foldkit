import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { AddItem, ClearCompleted, DeleteItem, ToggleItem } from './command'
import { Flags, init } from './main'
import {
  addItemFailureModel,
  buyMilk,
  doneTask,
  modelWithItems,
} from './main.fixture'
import { Message } from './message'
import { update } from './update'

describe('task state', () => {
  test('initializes with the provided task snapshot', () => {
    const init_ = init(Flags.make({ items: [buyMilk, doneTask] }))

    expect(init_.model.items).toStrictEqual([buyMilk, doneTask])
  })

  describe('adding a task', () => {
    test('editing the new task updates its draft text', () => {
      story(
        update,
        given(modelWithItems([])),
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
          modifyFields(modelWithItems([]), { newItemText: () => 'Buy milk' }),
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
        given(modifyFields(modelWithItems([]), { newItemText: () => '   ' })),
        message(Message.SubmittedNewItem()),
        Command.expectNone(),
      )
    })

    test('an add failure reports the error', () => {
      story(
        update,
        given(modelWithItems([buyMilk])),
        message(Message.FailedAddItem({ error: 'crypto unavailable' })),
        model(model => {
          expect(model.items).toStrictEqual([buyMilk])
          expect(model.maybeAddItemError).toStrictEqual(
            Option.some('crypto unavailable'),
          )
        }),
      )
    })

    test('submitting another task clears the previous add error', () => {
      story(
        update,
        given(
          modifyFields(addItemFailureModel([], 'crypto unavailable'), {
            newItemText: () => 'Try again',
          }),
        ),
        message(Message.SubmittedNewItem()),
        Command.expectExact(AddItem({ text: 'Try again' })),
        model(model => {
          expect(model.maybeAddItemError).toStrictEqual(Option.none())
        }),
        Command.resolve(AddItem, Message.SucceededAddItem()),
      )
    })
  })

  describe('changing tasks', () => {
    test('toggling a task targets the selected task', () => {
      story(
        update,
        given(modelWithItems([buyMilk])),
        message(Message.ToggledItem({ id: 'a' })),
        Command.expectExact(ToggleItem({ id: 'a' })),
        Command.resolve(ToggleItem, Message.CompletedToggleItem()),
      )
    })

    test('deleting a task targets the selected task', () => {
      story(
        update,
        given(modelWithItems([buyMilk])),
        message(Message.ClickedDeleteItem({ id: 'a' })),
        Command.expectExact(DeleteItem({ id: 'a' })),
        Command.resolve(DeleteItem, Message.CompletedDeleteItem()),
      )
    })

    test('clearing completed tasks starts their removal', () => {
      story(
        update,
        given(modelWithItems([buyMilk, doneTask])),
        message(Message.ClickedClearCompleted()),
        Command.expectExact(ClearCompleted()),
        Command.resolve(ClearCompleted, Message.CompletedClearCompleted()),
      )
    })
  })

  describe('task snapshots', () => {
    test('an incoming task snapshot replaces the current tasks', () => {
      story(
        update,
        given(modelWithItems([buyMilk])),
        message(Message.UpdatedItems({ items: [buyMilk, doneTask] })),
        model(model => {
          expect(model.items).toStrictEqual([buyMilk, doneTask])
        }),
      )
    })

    test('an add confirmation preserves the current task snapshot', () => {
      story(
        update,
        given(modelWithItems([buyMilk])),
        message(Message.SucceededAddItem()),
        Command.expectNone(),
        model(model => {
          expect(model.items).toStrictEqual([buyMilk])
        }),
      )
    })
  })

  describe('filtering', () => {
    test('choosing a filter makes it active', () => {
      story(
        update,
        given(modelWithItems([buyMilk, doneTask])),
        message(Message.SelectedFilter({ filter: 'Completed' })),
        Command.expectNone(),
        model(model => {
          expect(model.filter).toBe('Completed')
        }),
      )
    })
  })
})
