import { Array, Schema } from 'effect'
import { type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

// MODEL

const Filter = Schema.Literals(['All', 'Active', 'Done'])

export const Model = Schema.Struct({
  todos: Schema.Array(Todo),
  filter: Filter,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  AddedTodo: {},
  ClearedDoneTodos: {},
  SelectedFilter: { filter: Filter },
})
type Message = typeof Message.Type

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    AddedTodo: () => ({
      model: evo(model, { todos: Array.append(emptyTodo()) }),
    }),
    ClearedDoneTodos: () => ({
      model: evo(model, { todos: Array.filter(todo => !todo.done) }),
    }),
    SelectedFilter: ({ filter }) => ({
      model: evo(model, { filter: () => filter }),
    }),
  })
