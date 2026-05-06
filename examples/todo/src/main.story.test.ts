import { Array, Option } from 'effect'
import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  AddedTodo,
  CancelledEdit,
  ClearedCompleted,
  DeletedTodo,
  Editing,
  GenerateTodo,
  GeneratedTodo,
  type Model,
  NotEditing,
  SaveTodos,
  SavedEdit,
  SavedTodos,
  SelectedFilter,
  StartedEditing,
  ToggledAll,
  ToggledTodo,
  UpdatedEditingTodo,
  UpdatedNewTodo,
  update,
} from './main'

const emptyModel: Model = {
  todos: [],
  newTodoText: '',
  filter: 'All',
  editing: NotEditing(),
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

const modelWithTodos: Model = {
  ...emptyModel,
  todos: [buyMilk, walkDog, doneTask],
}

describe('todo update', () => {
  describe('add todo', () => {
    test('AddedTodo with text produces a GenerateTodo Command', () => {
      Story.story(
        update,
        Story.with({ ...emptyModel, newTodoText: 'Buy milk' }),
        Story.message(AddedTodo()),
        Story.Command.expectHas(GenerateTodo),
        Story.Command.resolve(
          GenerateTodo,
          GeneratedTodo({ id: 'abc', timestamp: 1000, text: 'Buy milk' }),
        ),
        Story.Command.resolve(
          SaveTodos,
          SavedTodos({
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
        Story.model(model => {
          expect(model.todos).toHaveLength(1)
          expect(model.todos[0]?.text).toBe('Buy milk')
          expect(model.todos[0]?.completed).toBe(false)
          expect(model.newTodoText).toBe('')
        }),
      )
    })

    test('AddedTodo with empty text is ignored', () => {
      Story.story(
        update,
        Story.with({ ...emptyModel, newTodoText: '' }),
        Story.message(AddedTodo()),
        Story.Command.expectNone(),
      )
    })

    test('AddedTodo with whitespace-only text is ignored', () => {
      Story.story(
        update,
        Story.with({ ...emptyModel, newTodoText: '   ' }),
        Story.message(AddedTodo()),
        Story.Command.expectNone(),
      )
    })

    test('UpdatedNewTodo updates the input text', () => {
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(UpdatedNewTodo({ text: 'Walk' })),
        Story.model(model => {
          expect(model.newTodoText).toBe('Walk')
        }),
      )
    })
  })

  describe('toggle and delete', () => {
    test('ToggledTodo flips the completed state', () => {
      const toggledTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'abc' ? { ...todo, completed: true } : todo,
      )

      Story.story(
        update,
        Story.with(modelWithTodos),
        Story.message(ToggledTodo({ id: 'abc' })),
        Story.Command.resolve(SaveTodos, SavedTodos({ todos: toggledTodos })),
        Story.model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
          expect(Option.map(todo, ({ completed }) => completed)).toStrictEqual(
            Option.some(true),
          )
        }),
      )
    })

    test('ToggledTodo on completed todo marks it active', () => {
      const toggledTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'ghi' ? { ...todo, completed: false } : todo,
      )

      Story.story(
        update,
        Story.with(modelWithTodos),
        Story.message(ToggledTodo({ id: 'ghi' })),
        Story.Command.resolve(SaveTodos, SavedTodos({ todos: toggledTodos })),
        Story.model(model => {
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

      Story.story(
        update,
        Story.with(modelWithTodos),
        Story.message(DeletedTodo({ id: 'abc' })),
        Story.Command.resolve(SaveTodos, SavedTodos({ todos: remainingTodos })),
        Story.model(model => {
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
      Story.story(
        update,
        Story.with(modelWithTodos),
        Story.message(StartedEditing({ id: 'abc' })),
        Story.model(model => {
          expect(model.editing).toStrictEqual(
            Editing({ id: 'abc', text: 'Buy milk' }),
          )
        }),
      )
    })

    test('UpdatedEditingTodo updates the editing text', () => {
      const editingModel: Model = {
        ...modelWithTodos,
        editing: Editing({ id: 'abc', text: 'Buy milk' }),
      }

      Story.story(
        update,
        Story.with(editingModel),
        Story.message(UpdatedEditingTodo({ text: 'Buy oat milk' })),
        Story.model(model => {
          expect(model.editing).toStrictEqual(
            Editing({ id: 'abc', text: 'Buy oat milk' }),
          )
        }),
      )
    })

    test('SavedEdit updates the todo text and exits editing', () => {
      const editingModel: Model = {
        ...modelWithTodos,
        editing: Editing({ id: 'abc', text: 'Buy oat milk' }),
      }

      const editedTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'abc' ? { ...todo, text: 'Buy oat milk' } : todo,
      )

      Story.story(
        update,
        Story.with(editingModel),
        Story.message(SavedEdit()),
        Story.Command.resolve(SaveTodos, SavedTodos({ todos: editedTodos })),
        Story.model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
          expect(Option.map(todo, ({ text }) => text)).toStrictEqual(
            Option.some('Buy oat milk'),
          )
          expect(model.editing).toStrictEqual(NotEditing())
        }),
      )
    })

    test('SavedEdit with empty text exits editing without saving', () => {
      const editingModel: Model = {
        ...modelWithTodos,
        editing: Editing({ id: 'abc', text: '   ' }),
      }

      Story.story(
        update,
        Story.with(editingModel),
        Story.message(SavedEdit()),
        Story.model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
          expect(Option.map(todo, ({ text }) => text)).toStrictEqual(
            Option.some('Buy milk'),
          )
          expect(model.editing).toStrictEqual(NotEditing())
        }),
        Story.Command.expectNone(),
      )
    })

    test('CancelledEdit exits editing without changes', () => {
      const editingModel: Model = {
        ...modelWithTodos,
        editing: Editing({ id: 'abc', text: 'Changed text' }),
      }

      Story.story(
        update,
        Story.with(editingModel),
        Story.message(CancelledEdit()),
        Story.model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
          expect(Option.map(todo, ({ text }) => text)).toStrictEqual(
            Option.some('Buy milk'),
          )
          expect(model.editing).toStrictEqual(NotEditing())
        }),
      )
    })
  })

  describe('bulk operations', () => {
    test('ToggledAll marks all todos completed when some are active', () => {
      const allCompletedTodos = modelWithTodos.todos.map(todo => ({
        ...todo,
        completed: true,
      }))

      Story.story(
        update,
        Story.with(modelWithTodos),
        Story.message(ToggledAll()),
        Story.Command.resolve(
          SaveTodos,
          SavedTodos({ todos: allCompletedTodos }),
        ),
        Story.model(model => {
          expect(Array.every(model.todos, ({ completed }) => completed)).toBe(
            true,
          )
        }),
      )
    })

    test('ToggledAll marks all todos active when all are completed', () => {
      const allCompletedModel: Model = {
        ...emptyModel,
        todos: modelWithTodos.todos.map(todo => ({
          ...todo,
          completed: true,
        })),
      }

      const allActiveTodos = allCompletedModel.todos.map(todo => ({
        ...todo,
        completed: false,
      }))

      Story.story(
        update,
        Story.with(allCompletedModel),
        Story.message(ToggledAll()),
        Story.Command.resolve(SaveTodos, SavedTodos({ todos: allActiveTodos })),
        Story.model(model => {
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

      Story.story(
        update,
        Story.with(modelWithTodos),
        Story.message(ClearedCompleted()),
        Story.Command.resolve(SaveTodos, SavedTodos({ todos: activeTodos })),
        Story.model(model => {
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
      Story.story(
        update,
        Story.with(modelWithTodos),
        Story.message(SelectedFilter({ filter: 'Active' })),
        Story.model(model => {
          expect(model.filter).toBe('Active')
        }),
      )
    })
  })
})
