import { Array, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Todo = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  done: Schema.Boolean,
})
type Todo = typeof Todo.Type

const Filter = Schema.Literals(['All', 'Active', 'Done'])
type Filter = typeof Filter.Type

const Model = Schema.Struct({
  todos: Schema.Array(Todo),
  draft: Schema.String,
  filter: Filter,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  AddedTodo: { id: Schema.String },
  ClearedDoneTodos: {},
  SelectedFilter: { filter: Filter },
})
type Message = typeof Message.Type

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { todos: [], draft: '', filter: 'All' },

      // Every way the Model can change, one handler per Message
      update: {
        AddedTodo: (model, { id }) => ({
          model: modifyFields(model, {
            todos: Array.append({ id, text: model.draft, done: false }),
            draft: () => '',
          }),
        }),
        ClearedDoneTodos: model => ({
          model: modifyFields(model, {
            todos: Array.filter(todo => !todo.done),
          }),
        }),
        SelectedFilter: (model, { filter }) => ({
          model: modifyFields(model, { filter: () => filter }),
        }),
      },
    }
  }),
)
