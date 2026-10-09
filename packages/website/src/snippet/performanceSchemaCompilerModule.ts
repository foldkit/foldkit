import { Schema } from 'effect'

export const Todo = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  isCompleted: Schema.Boolean,
})

export const TodosResponse = Schema.Array(Todo)
