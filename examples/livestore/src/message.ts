import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Items } from './domain'

export const Message = defineMessageUnion({
  UpdatedNewItemText: { text: Schema.String },
  SubmittedNewItem: {},

  SelectedFilter: { filter: Items.Filter },

  ToggledItem: { id: Schema.String },
  ClickedDeleteItem: { id: Schema.String },
  ClickedClearCompleted: {},

  SucceededAddItem: {},
  FailedAddItem: { error: Schema.String },

  CompletedToggleItem: {},
  CompletedDeleteItem: {},
  CompletedClearCompleted: {},

  UpdatedItems: { items: Items.Items },
})
export type Message = typeof Message.Type
