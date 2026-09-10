import { Array, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import {
  EditingState,
  GenerateTodo,
  Message,
  type Model,
  SaveTodos,
  update,
} from './main'

const emptyModel: Model = {
  todos: [],
  newTodoText: '',
  filter: 'All',
  editing: EditingState.NotEditing(),
}

const buyMilk = {
  id: 'abc',
  text: 'Buy milk',
  completed: false,
  createdAt: 1000,
}

const walkDog = {
  id: 'def',
  text: 'Walk the dog',
  completed: false,
  createdAt: 2000,
}

const doneTask = {
  id: 'ghi',
  text: 'Done task',
  completed: true,
  createdAt: 3000,
}

const modelWithTodos: Model = evo(emptyModel, {
  todos: () => [buyMilk, walkDog, doneTask],
})

describe('update', () => {
  describe('add todo', () => {
    test('AddedTodo with text produces a GenerateTodo Command', () => {
      story(
        update,
        given(evo(emptyModel, { newTodoText: () => 'Buy milk' })),
        message(Message.AddedTodo()),
        Command.expectHas(GenerateTodo),
        Command.resolve(
          GenerateTodo,
          Message.CompletedGenerateTodo({
            id: 'abc',
            timestamp: 1000,
            text: 'Buy milk',
          }),
        ),
        Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({
            todos: [
              {
                id: 'abc',
                text: 'Buy milk',
                completed: false,
                createdAt: 1000,
              },
            ],
          }),
        ),
        model(model => {
          expect(model.todos).toHaveLength(1)
          expect(model.todos[0]?.text).toBe('Buy milk')
          expect(model.todos[0]?.completed).toBe(false)
          expect(model.newTodoText).toBe('')
        }),
      )
    })

    test('AddedTodo with empty text is ignored', () => {
      story(
        update,
        given(evo(emptyModel, { newTodoText: () => '' })),
        message(Message.AddedTodo()),
        Command.expectNone(),
      )
    })

    test('AddedTodo with whitespace-only text is ignored', () => {
      story(
        update,
        given(evo(emptyModel, { newTodoText: () => '   ' })),
        message(Message.AddedTodo()),
        Command.expectNone(),
      )
    })

    test('UpdatedNewTodo updates the input text', () => {
      story(
        update,
        given(emptyModel),
        message(Message.UpdatedNewTodo({ text: 'Walk' })),
        model(model => {
          expect(model.newTodoText).toBe('Walk')
        }),
      )
    })
  })

  describe('toggle and delete', () => {
    test('ToggledTodo flips the completed state', () => {
      const toggledTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'abc' ? evo(todo, { completed: () => true }) : todo,
      )

      story(
        update,
        given(modelWithTodos),
        message(Message.ToggledTodo({ id: 'abc' })),
        Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: toggledTodos }),
        ),
        model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
          expect(Option.map(todo, ({ completed }) => completed)).toStrictEqual(
            Option.some(true),
          )
        }),
      )
    })

    test('ToggledTodo on completed todo marks it active', () => {
      const toggledTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'ghi' ? evo(todo, { completed: () => false }) : todo,
      )

      story(
        update,
        given(modelWithTodos),
        message(Message.ToggledTodo({ id: 'ghi' })),
        Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: toggledTodos }),
        ),
        model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'ghi')
          expect(Option.map(todo, ({ completed }) => completed)).toStrictEqual(
            Option.some(false),
          )
        }),
      )
    })

    test('DeletedTodo removes the todo and saves', () => {
      const remainingTodos = modelWithTodos.todos.filter(
        ({ id }) => id !== 'abc',
      )

      story(
        update,
        given(modelWithTodos),
        message(Message.DeletedTodo({ id: 'abc' })),
        Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: remainingTodos }),
        ),
        model(model => {
          expect(model.todos).toHaveLength(2)
          expect(
            Array.findFirst(model.todos, ({ id }) => id === 'abc'),
          ).toStrictEqual(Option.none())
        }),
      )
    })
  })

  describe('editing', () => {
    test('StartedEditing enters editing state with the todo text', () => {
      story(
        update,
        given(modelWithTodos),
        message(Message.StartedEditing({ id: 'abc' })),
        model(model => {
          expect(model.editing).toStrictEqual(
            EditingState.Editing({ id: 'abc', text: 'Buy milk' }),
          )
        }),
      )
    })

    test('UpdatedEditingTodo updates the editing text', () => {
      const editingModel: Model = evo(modelWithTodos, {
        editing: () => EditingState.Editing({ id: 'abc', text: 'Buy milk' }),
      })

      story(
        update,
        given(editingModel),
        message(Message.UpdatedEditingTodo({ text: 'Buy oat milk' })),
        model(model => {
          expect(model.editing).toStrictEqual(
            EditingState.Editing({ id: 'abc', text: 'Buy oat milk' }),
          )
        }),
      )
    })

    test('SavedEdit updates the todo text and exits editing', () => {
      const editingModel: Model = evo(modelWithTodos, {
        editing: () =>
          EditingState.Editing({ id: 'abc', text: 'Buy oat milk' }),
      })

      const editedTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'abc' ? evo(todo, { text: () => 'Buy oat milk' }) : todo,
      )

      story(
        update,
        given(editingModel),
        message(Message.SavedEdit()),
        Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: editedTodos }),
        ),
        model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
          expect(Option.map(todo, ({ text }) => text)).toStrictEqual(
            Option.some('Buy oat milk'),
          )
          expect(model.editing).toStrictEqual(EditingState.NotEditing())
        }),
      )
    })

    test('SavedEdit with empty text exits editing without saving', () => {
      const editingModel: Model = evo(modelWithTodos, {
        editing: () => EditingState.Editing({ id: 'abc', text: '   ' }),
      })

      story(
        update,
        given(editingModel),
        message(Message.SavedEdit()),
        model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
          expect(Option.map(todo, ({ text }) => text)).toStrictEqual(
            Option.some('Buy milk'),
          )
          expect(model.editing).toStrictEqual(EditingState.NotEditing())
        }),
        Command.expectNone(),
      )
    })

    test('CancelledEdit exits editing without changes', () => {
      const editingModel: Model = evo(modelWithTodos, {
        editing: () =>
          EditingState.Editing({ id: 'abc', text: 'Changed text' }),
      })

      story(
        update,
        given(editingModel),
        message(Message.CancelledEdit()),
        model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
          expect(Option.map(todo, ({ text }) => text)).toStrictEqual(
            Option.some('Buy milk'),
          )
          expect(model.editing).toStrictEqual(EditingState.NotEditing())
        }),
      )
    })
  })

  describe('bulk operations', () => {
    test('ToggledAll marks all todos completed when some are active', () => {
      const allCompletedTodos = modelWithTodos.todos.map(todo =>
        evo(todo, { completed: () => true }),
      )

      story(
        update,
        given(modelWithTodos),
        message(Message.ToggledAll()),
        Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: allCompletedTodos }),
        ),
        model(model => {
          expect(Array.every(model.todos, ({ completed }) => completed)).toBe(
            true,
          )
        }),
      )
    })

    test('ToggledAll marks all todos active when all are completed', () => {
      const allCompletedModel: Model = evo(emptyModel, {
        todos: () =>
          modelWithTodos.todos.map(todo =>
            evo(todo, { completed: () => true }),
          ),
      })

      const allActiveTodos = allCompletedModel.todos.map(todo =>
        evo(todo, { completed: () => false }),
      )

      story(
        update,
        given(allCompletedModel),
        message(Message.ToggledAll()),
        Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: allActiveTodos }),
        ),
        model(model => {
          expect(Array.every(model.todos, ({ completed }) => !completed)).toBe(
            true,
          )
        }),
      )
    })

    test('ClearedCompleted removes only completed todos', () => {
      const activeTodos = modelWithTodos.todos.filter(
        ({ completed }) => !completed,
      )

      story(
        update,
        given(modelWithTodos),
        message(Message.ClearedCompleted()),
        Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: activeTodos }),
        ),
        model(model => {
          expect(model.todos).toHaveLength(2)
          expect(Array.every(model.todos, ({ completed }) => !completed)).toBe(
            true,
          )
        }),
      )
    })
  })

  describe('filter', () => {
    test('SelectedFilter changes the active filter', () => {
      story(
        update,
        given(modelWithTodos),
        message(Message.SelectedFilter({ filter: 'Active' })),
        model(model => {
          expect(model.filter).toBe('Active')
        }),
      )
    })
  })
})
