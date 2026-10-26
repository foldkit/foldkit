import { Array, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Filter = Schema.Literals(['All', 'Active', 'Done'])

export const Model = Schema.Struct({
  todos: Schema.Array(Todo),
  filter: Filter,
})

const Message = defineMessageUnion({
  AddedTodo: {},
  ClearedDoneTodos: {},
  SelectedFilter: { filter: Filter },
})

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
