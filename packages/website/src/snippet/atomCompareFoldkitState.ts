import { Array, Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'

// MODEL

const Filter = S.Literals(['All', 'Active', 'Done'])

export const Model = S.Struct({
  todos: S.Array(Todo),
  filter: Filter,
})
type Model = typeof Model.Type

// MESSAGE

const AddedTodo = m('AddedTodo')
const ClearedDoneTodos = m('ClearedDoneTodos')
const SelectedFilter = m('SelectedFilter', { filter: Filter })

const Message = S.Union([AddedTodo, ClearedDoneTodos, SelectedFilter])
type Message = typeof Message.Type

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      AddedTodo: () => [evo(model, { todos: Array.append(emptyTodo()) }), []],
      ClearedDoneTodos: () => [
        evo(model, { todos: Array.filter(todo => !todo.done) }),
        [],
      ],
      SelectedFilter: ({ filter }) => [
        evo(model, { filter: () => filter }),
        [],
      ],
    }),
  )
