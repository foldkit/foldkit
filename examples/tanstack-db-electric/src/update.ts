import { Option, String } from 'effect'
import { type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { AddItem, ClearCompleted, DeleteItem, ToggleItem } from './command'
import { Message } from './message'
import { type Model, WriteError } from './model'
import type { ItemsStoreRequirements } from './store'

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message, ItemsStoreRequirements>>(
    message,
    {
      UpdatedNewItemText: ({ text }) => ({
        model: modifyFields(model, {
          newItemText: () => text,
        }),
      }),

      SubmittedNewItem: () => {
        const trimmed = String.trim(model.newItemText)

        if (String.isEmpty(trimmed)) {
          return { model }
        }

        return {
          model: modifyFields(model, {
            maybeWriteError: () => Option.none(),
            newItemText: () => '',
          }),
          commands: [AddItem({ text: trimmed })],
        }
      },

      SelectedFilter: ({ filter }) => ({
        model: modifyFields(model, {
          filter: () => filter,
        }),
      }),

      ToggledItem: ({ id }) => ({
        model: modifyFields(model, {
          maybeWriteError: () => Option.none(),
        }),
        commands: [ToggleItem({ id })],
      }),

      ClickedDeleteItem: ({ id }) => ({
        model: modifyFields(model, {
          maybeWriteError: () => Option.none(),
        }),
        commands: [DeleteItem({ id })],
      }),

      ClickedClearCompleted: () => ({
        model: modifyFields(model, {
          maybeWriteError: () => Option.none(),
        }),
        commands: [ClearCompleted()],
      }),

      SucceededAddItem: () => ({ model }),
      FailedAddItem: ({ error }) => ({
        model: modifyFields(model, {
          maybeWriteError: () => Option.some(WriteError.AddItem({ error })),
        }),
      }),

      CompletedToggleItem: () => ({ model }),
      CompletedDeleteItem: () => ({ model }),
      CompletedClearCompleted: () => ({ model }),
      FailedPersistItems: ({ error }) => ({
        model: modifyFields(model, {
          maybeWriteError: () =>
            Option.some(WriteError.PersistItems({ error })),
        }),
      }),

      UpdatedItems: ({ items }) => ({
        model: modifyFields(model, {
          items: () => items,
        }),
      }),
    },
  )
