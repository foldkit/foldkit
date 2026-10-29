import { Array, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Filter = Schema.Literals(['All', 'Active', 'Done'])
type Filter = typeof Filter.Type

export const Model = Schema.Struct({
  todos: Schema.Array(Todo),
  filter: Filter,
})
export type Model = typeof Model.Type

const Message = defineMessageUnion({
  AddedTodo: {},
  ClearedDoneTodos: {},
  SelectedFilter: { filter: Filter },
})
type Message = typeof Message.Type

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep } = ApplicationDefinition

const ApplicationComposition = ApplicationDefinition.makeComposition()

export const update = ApplicationComposition.makeUpdate({
  AddedTodo: makeFieldsStep(() => ({
    todos: Array.append(emptyTodo()),
  })),
  ClearedDoneTodos: makeFieldsStep(() => ({
    todos: Array.filter(todo => !todo.done),
  })),
  SelectedFilter: makeFieldsStep.fromMessage(({ filter }) => ({
    filter: () => filter,
  })),
})
