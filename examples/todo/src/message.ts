import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Filter, Todos } from './model'

export const Message = defineMessageUnion({
  UpdatedNewTodo: { text: Schema.String },
  UpdatedEditingTodo: { text: Schema.String },
  AddedTodo: {},
  CompletedGenerateTodo: {
    id: Schema.String,
    timestamp: Schema.Number,
    text: Schema.String,
  },
  DeletedTodo: { id: Schema.String },
  ToggledTodo: { id: Schema.String },
  StartedEditing: { id: Schema.String },
  SavedEdit: {},
  CancelledEdit: {},
  ToggledAll: {},
  ClearedCompleted: {},
  SelectedFilter: { filter: Filter },
  SucceededSaveTodos: { todos: Todos },
  FailedSaveTodos: {},
})
export type Message = typeof Message.Type
