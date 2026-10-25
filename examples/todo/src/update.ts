import { Array, Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { GenerateTodo, SaveTodos } from './command'
import { ApplicationComposition } from './composition'
import { ApplicationDefinition } from './definition'
import { EditingState, type Todo } from './model'

export const update = ApplicationComposition.makeUpdate({
  UpdatedNewTodo: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ text }) => ({
      newTodoText: () => text,
    }),
  ),

  UpdatedEditingTodo: ApplicationDefinition.makeFieldsStep(
    (model, { text }) => ({
      editing: () =>
        EditingState.match(model.editing, {
          NotEditing: () => model.editing,
          Editing: ({ id }) => EditingState.Editing({ id, text }),
        }),
    }),
  ),

  AddedTodo: model => {
    if (String.isEmpty(String.trim(model.newTodoText))) {
      return { model }
    }

    return {
      model,
      commands: [GenerateTodo({ text: String.trim(model.newTodoText) })],
    }
  },

  CompletedGenerateTodo: (model, { id, timestamp, text }) => {
    const newTodo: typeof Todo.Type = {
      id,
      text,
      completed: false,
      createdAt: timestamp,
    }

    const updatedTodos = [...model.todos, newTodo]

    return {
      model: modifyFields(model, {
        todos: () => updatedTodos,
        newTodoText: () => '',
      }),
      commands: [SaveTodos({ todos: updatedTodos })],
    }
  },

  DeletedTodo: (model, { id }) => {
    const updatedTodos = Array.filter(model.todos, todo => todo.id !== id)

    return {
      model: modifyFields(model, {
        todos: () => updatedTodos,
      }),
      commands: [SaveTodos({ todos: updatedTodos })],
    }
  },

  ToggledTodo: (model, { id }) => {
    const updatedTodos = Array.map(model.todos, todo =>
      todo.id === id
        ? modifyFields(todo, { completed: completed => !completed })
        : todo,
    )

    return {
      model: modifyFields(model, {
        todos: () => updatedTodos,
      }),
      commands: [SaveTodos({ todos: updatedTodos })],
    }
  },

  StartedEditing: ApplicationDefinition.makeFieldsStep((model, { id }) => {
    const maybeTodo = Array.findFirst(model.todos, todo => todo.id === id)
    return {
      editing: () =>
        EditingState.Editing({
          id,
          text: Option.match(maybeTodo, {
            onNone: () => '',
            onSome: todo => todo.text,
          }),
        }),
    }
  }),

  SavedEdit: model =>
    EditingState.match(model.editing, {
      NotEditing: () => ({ model }),

      Editing: ({ id, text }) => {
        if (String.isEmpty(String.trim(text))) {
          return {
            model: modifyFields(model, {
              editing: () => EditingState.NotEditing(),
            }),
          }
        }

        const updatedTodos = Array.map(model.todos, todo =>
          todo.id === id
            ? modifyFields(todo, { text: () => String.trim(text) })
            : todo,
        )

        return {
          model: modifyFields(model, {
            todos: () => updatedTodos,
            editing: () => EditingState.NotEditing(),
          }),
          commands: [SaveTodos({ todos: updatedTodos })],
        }
      },
    }),

  CancelledEdit: ApplicationDefinition.makeFieldsStep(() => ({
    editing: () => EditingState.NotEditing(),
  })),

  ToggledAll: model => {
    const allCompleted = Array.every(model.todos, todo => todo.completed)
    const updatedTodos = Array.map(model.todos, todo =>
      modifyFields(todo, {
        completed: () => !allCompleted,
      }),
    )

    return {
      model: modifyFields(model, {
        todos: () => updatedTodos,
      }),
      commands: [SaveTodos({ todos: updatedTodos })],
    }
  },

  ClearedCompleted: model => {
    const updatedTodos = Array.filter(model.todos, todo => !todo.completed)

    return {
      model: modifyFields(model, {
        todos: () => updatedTodos,
      }),
      commands: [SaveTodos({ todos: updatedTodos })],
    }
  },

  SelectedFilter: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ filter }) => ({
      filter: () => filter,
    }),
  ),

  SucceededSaveTodos: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ todos }) => ({
      todos: () => todos,
    }),
  ),

  FailedSaveTodos: ApplicationDefinition.makeNoopStep(),
})
