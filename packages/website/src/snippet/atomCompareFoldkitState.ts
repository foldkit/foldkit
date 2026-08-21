import { Array, Schema as S } from 'effect'
import { type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

// MODEL

const Filter = S.Literals(['All', 'Active', 'Done'])

export const Model = S.Struct({
  todos: S.Array(Todo),
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

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
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
