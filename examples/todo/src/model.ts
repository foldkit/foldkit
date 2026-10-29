import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const TODOS_STORAGE_KEY = 'todos'

export const Todo = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  completed: Schema.Boolean,
  createdAt: Schema.Number,
})
export type Todo = typeof Todo.Type

export const Todos = Schema.Array(Todo)
export type Todos = typeof Todos.Type

export const TodosJsonString = Schema.fromJsonString(Schema.toCodecJson(Todos))
export type TodosJsonString = typeof TodosJsonString.Type

export const Filter = Schema.Literals(['All', 'Active', 'Completed'])
export type Filter = typeof Filter.Type

export const EditingState = defineTaggedUnion({
  NotEditing: {},
  Editing: { id: Schema.String, text: Schema.String },
})
export type EditingState = typeof EditingState.Type

export const Model = Schema.Struct({
  todos: Todos,
  newTodoText: Schema.String,
  filter: Filter,
  editing: EditingState,
})
export type Model = typeof Model.Type
