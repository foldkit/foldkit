import { Array, Effect, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { ApplicationBlock } from './block'
import { GenerateTodo, SaveTodos } from './command'
import { Message } from './message'
import { EditingState, type Model } from './model'

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

const modelWithTodos: Model = modifyFields(emptyModel, {
  todos: () => [buyMilk, walkDog, doneTask],
})

describe('update', () => {
  describe('add todo', () => {
    test('AddedTodo with text produces a GenerateTodo Command', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(modifyFields(emptyModel, { newTodoText: () => 'Buy milk' })),
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
          Command.expectNone(),
          model(model => {
            expect(model.todos).toHaveLength(1)
            expect(model.todos[0]?.text).toBe('Buy milk')
            expect(model.todos[0]?.completed).toBe(false)
            expect(model.newTodoText).toBe('')
          }),
        ),
      )
    })

    test('AddedTodo with empty text is ignored', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(modifyFields(emptyModel, { newTodoText: () => '' })),
          message(Message.AddedTodo()),
          Command.expectNone(),
        ),
      )
    })

    test('AddedTodo with whitespace-only text is ignored', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(modifyFields(emptyModel, { newTodoText: () => '   ' })),
          message(Message.AddedTodo()),
          Command.expectNone(),
        ),
      )
    })

    test('UpdatedNewTodo updates the input text', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(emptyModel),
          message(Message.UpdatedNewTodo({ text: 'Walk' })),
          model(model => {
            expect(model.newTodoText).toBe('Walk')
          }),
        ),
      )
    })
  })

  describe('toggle and delete', () => {
    test('ToggledTodo flips the completed state', async () => {
      const toggledTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'abc'
          ? modifyFields(todo, { completed: () => true })
          : todo,
      )

      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(modelWithTodos),
          message(Message.ToggledTodo({ id: 'abc' })),
          Command.resolve(
            SaveTodos,
            Message.SucceededSaveTodos({ todos: toggledTodos }),
          ),
          model(model => {
            const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
            expect(
              Option.map(todo, ({ completed }) => completed),
            ).toStrictEqual(Option.some(true))
          }),
        ),
      )
    })

    test('ToggledTodo on completed todo marks it active', async () => {
      const toggledTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'ghi'
          ? modifyFields(todo, { completed: () => false })
          : todo,
      )

      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(modelWithTodos),
          message(Message.ToggledTodo({ id: 'ghi' })),
          Command.resolve(
            SaveTodos,
            Message.SucceededSaveTodos({ todos: toggledTodos }),
          ),
          model(model => {
            const todo = Array.findFirst(model.todos, ({ id }) => id === 'ghi')
            expect(
              Option.map(todo, ({ completed }) => completed),
            ).toStrictEqual(Option.some(false))
          }),
        ),
      )
    })

    test('DeletedTodo removes the todo and saves', async () => {
      const remainingTodos = modelWithTodos.todos.filter(
        ({ id }) => id !== 'abc',
      )

      await Effect.runPromise(
        story(
          ApplicationBlock,
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
        ),
      )
    })
  })

  describe('editing', () => {
    test('StartedEditing enters editing state with the todo text', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(modelWithTodos),
          message(Message.StartedEditing({ id: 'abc' })),
          model(model => {
            expect(model.editing).toStrictEqual(
              EditingState.Editing({ id: 'abc', text: 'Buy milk' }),
            )
          }),
        ),
      )
    })

    test('UpdatedEditingTodo updates the editing text', async () => {
      const editingModel: Model = modifyFields(modelWithTodos, {
        editing: () => EditingState.Editing({ id: 'abc', text: 'Buy milk' }),
      })

      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(editingModel),
          message(Message.UpdatedEditingTodo({ text: 'Buy oat milk' })),
          model(model => {
            expect(model.editing).toStrictEqual(
              EditingState.Editing({ id: 'abc', text: 'Buy oat milk' }),
            )
          }),
        ),
      )
    })

    test('SavedEdit updates the todo text and exits editing', async () => {
      const editingModel: Model = modifyFields(modelWithTodos, {
        editing: () =>
          EditingState.Editing({ id: 'abc', text: 'Buy oat milk' }),
      })

      const editedTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'abc'
          ? modifyFields(todo, { text: () => 'Buy oat milk' })
          : todo,
      )

      await Effect.runPromise(
        story(
          ApplicationBlock,
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
        ),
      )
    })

    test('SavedEdit with empty text exits editing without saving', async () => {
      const editingModel: Model = modifyFields(modelWithTodos, {
        editing: () => EditingState.Editing({ id: 'abc', text: '   ' }),
      })

      await Effect.runPromise(
        story(
          ApplicationBlock,
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
        ),
      )
    })

    test('CancelledEdit exits editing without changes', async () => {
      const editingModel: Model = modifyFields(modelWithTodos, {
        editing: () =>
          EditingState.Editing({ id: 'abc', text: 'Changed text' }),
      })

      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(editingModel),
          message(Message.CancelledEdit()),
          model(model => {
            const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
            expect(Option.map(todo, ({ text }) => text)).toStrictEqual(
              Option.some('Buy milk'),
            )
            expect(model.editing).toStrictEqual(EditingState.NotEditing())
          }),
        ),
      )
    })
  })

  describe('bulk operations', () => {
    test('ToggledAll marks all todos completed when some are active', async () => {
      const allCompletedTodos = modelWithTodos.todos.map(todo =>
        modifyFields(todo, { completed: () => true }),
      )

      await Effect.runPromise(
        story(
          ApplicationBlock,
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
        ),
      )
    })

    test('ToggledAll marks all todos active when all are completed', async () => {
      const allCompletedModel: Model = modifyFields(emptyModel, {
        todos: () =>
          modelWithTodos.todos.map(todo =>
            modifyFields(todo, { completed: () => true }),
          ),
      })

      const allActiveTodos = allCompletedModel.todos.map(todo =>
        modifyFields(todo, { completed: () => false }),
      )

      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(allCompletedModel),
          message(Message.ToggledAll()),
          Command.resolve(
            SaveTodos,
            Message.SucceededSaveTodos({ todos: allActiveTodos }),
          ),
          model(model => {
            expect(
              Array.every(model.todos, ({ completed }) => !completed),
            ).toBe(true)
          }),
        ),
      )
    })

    test('ClearedCompleted removes only completed todos', async () => {
      const activeTodos = modelWithTodos.todos.filter(
        ({ completed }) => !completed,
      )

      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(modelWithTodos),
          message(Message.ClearedCompleted()),
          Command.resolve(
            SaveTodos,
            Message.SucceededSaveTodos({ todos: activeTodos }),
          ),
          model(model => {
            expect(model.todos).toHaveLength(2)
            expect(
              Array.every(model.todos, ({ completed }) => !completed),
            ).toBe(true)
          }),
        ),
      )
    })
  })

  describe('filter', () => {
    test('SelectedFilter changes the active filter', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(modelWithTodos),
          message(Message.SelectedFilter({ filter: 'Active' })),
          model(model => {
            expect(model.filter).toBe('Active')
          }),
        ),
      )
    })
  })
})
