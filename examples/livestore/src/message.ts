import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Filter } from './model'
import { Items } from './schema'

export const Message = defineMessageUnion({
  UpdatedNewItemText: { text: Schema.String },
  SubmittedNewItem: {},

  SelectedFilter: { filter: Filter },

  ToggledItem: { id: Schema.String },
  ClickedDeleteItem: { id: Schema.String },
  ClickedClearCompleted: {},

  SucceededAddItem: {},
  FailedAddItem: { error: Schema.String },

  CompletedToggleItem: {},
  CompletedDeleteItem: {},
  CompletedClearCompleted: {},

  UpdatedItems: { items: Items },
})
export type Message = typeof Message.Type
