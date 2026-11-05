import { Array, Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { makeFieldsStep, makeNoopStep } from './block'
import { GenerateTodo, SaveTodos } from './command'
import { ApplicationComposition } from './composition'
import { EditingState, type Todo } from './model'

const { makeUpdate } = ApplicationComposition

const editTodos = makeUpdate({
  UpdatedNewTodo: makeFieldsStep.fromMessage(({ text }) => ({
    newTodoText: () => text,
  })),

  UpdatedEditingTodo: makeFieldsStep((model, { text }) => ({
    editing: () =>
      EditingState.match(model.editing, {
        NotEditing: () => model.editing,
        Editing: ({ id }) => EditingState.Editing({ id, text }),
      }),
  })),

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
    }
  },

  DeletedTodo: (model, { id }) => {
    const updatedTodos = Array.filter(model.todos, todo => todo.id !== id)

    return {
      model: modifyFields(model, {
        todos: () => updatedTodos,
      }),
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
    }
  },

  StartedEditing: makeFieldsStep((model, { id }) => {
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
        }
      },
    }),

  CancelledEdit: makeFieldsStep(() => ({
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
    }
  },

  ClearedCompleted: model => {
    const updatedTodos = Array.filter(model.todos, todo => !todo.completed)

    return {
      model: modifyFields(model, {
        todos: () => updatedTodos,
      }),
    }
  },

  SelectedFilter: makeFieldsStep.fromMessage(({ filter }) => ({
    filter: () => filter,
  })),

  SucceededSaveTodos: makeFieldsStep.fromMessage(({ todos }) => ({
    todos: () => todos,
  })),

  FailedSaveTodos: makeNoopStep(),
})

const persistTodos = makeUpdate.except(['SucceededSaveTodos'])(
  (model, _message, { before }) => ({
    model,
    commands: Array.filter(
      [SaveTodos({ todos: model.todos })],
      () => model.todos !== before.todos,
    ),
  }),
)

export const update = makeUpdate.compose(editTodos, persistTodos)
