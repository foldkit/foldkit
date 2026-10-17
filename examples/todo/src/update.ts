import { Array, Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { GenerateTodo, SaveTodos } from './command'
import { ApplicationComposition } from './composition'
import { Message } from './message'
import { EditingState, type Todo } from './model'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    UpdatedNewTodo: ({ text }) => ({
      model: modifyFields(model, {
        newTodoText: () => text,
      }),
    }),

    UpdatedEditingTodo: ({ text }) => ({
      model: modifyFields(model, {
        editing: () =>
          EditingState.match(model.editing, {
            NotEditing: () => model.editing,
            Editing: ({ id }) => EditingState.Editing({ id, text }),
          }),
      }),
    }),

    AddedTodo: () => {
      if (String.isEmpty(String.trim(model.newTodoText))) {
        return { model }
      }

      return {
        model,
        commands: [GenerateTodo({ text: String.trim(model.newTodoText) })],
      }
    },

    CompletedGenerateTodo: ({ id, timestamp, text }) => {
      const newTodo: Todo = {
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

    DeletedTodo: ({ id }) => {
      const updatedTodos = Array.filter(model.todos, todo => todo.id !== id)

      return {
        model: modifyFields(model, {
          todos: () => updatedTodos,
        }),
        commands: [SaveTodos({ todos: updatedTodos })],
      }
    },

    ToggledTodo: ({ id }) => {
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

    StartedEditing: ({ id }) => {
      const maybeTodo = Array.findFirst(model.todos, todo => todo.id === id)
      return {
        model: modifyFields(model, {
          editing: () =>
            EditingState.Editing({
              id,
              text: Option.match(maybeTodo, {
                onNone: () => '',
                onSome: todo => todo.text,
              }),
            }),
        }),
      }
    },

    SavedEdit: () =>
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

    CancelledEdit: () => ({
      model: modifyFields(model, {
        editing: () => EditingState.NotEditing(),
      }),
    }),

    ToggledAll: () => {
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

    ClearedCompleted: () => {
      const updatedTodos = Array.filter(model.todos, todo => !todo.completed)

      return {
        model: modifyFields(model, {
          todos: () => updatedTodos,
        }),
        commands: [SaveTodos({ todos: updatedTodos })],
      }
    },

    SelectedFilter: ({ filter }) => ({
      model: modifyFields(model, {
        filter: () => filter,
      }),
    }),

    SucceededSaveTodos: ({ todos }) => ({
      model: modifyFields(model, {
        todos: () => todos,
      }),
    }),

    FailedSaveTodos: () => ({ model }),
  }),
)
