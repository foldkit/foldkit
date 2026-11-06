import { Array, Option } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { GenerateTodo, SaveTodos } from './command'
import { ApplicationBlock, layer } from './index'
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
    it.effect('AddedTodo with text produces a GenerateTodo Command', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(emptyModel, { newTodoText: () => 'Buy milk' }),
        ),
        Story.message(Message.AddedTodo()),
        Story.Command.expectHas(GenerateTodo),
        Story.Command.resolve(
          GenerateTodo,
          Message.CompletedGenerateTodo({
            id: 'abc',
            timestamp: 1000,
            text: 'Buy milk',
          }),
        ),
        Story.Command.resolve(
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
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.todos).toHaveLength(1)
          expect(model.todos[0]?.text).toBe('Buy milk')
          expect(model.todos[0]?.completed).toBe(false)
          expect(model.newTodoText).toBe('')
        }),
      ),
    )

    it.effect('AddedTodo with empty text is ignored', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modifyFields(emptyModel, { newTodoText: () => '' })),
        Story.message(Message.AddedTodo()),
        Story.Command.expectNone(),
      ),
    )

    it.effect('AddedTodo with whitespace-only text is ignored', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modifyFields(emptyModel, { newTodoText: () => '   ' })),
        Story.message(Message.AddedTodo()),
        Story.Command.expectNone(),
      ),
    )

    it.effect('UpdatedNewTodo updates the input text', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.message(Message.UpdatedNewTodo({ text: 'Walk' })),
        Story.model(model => {
          expect(model.newTodoText).toBe('Walk')
        }),
      ),
    )
  })

  describe('toggle and delete', () => {
    it.effect('ToggledTodo flips the completed state', () => {
      const toggledTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'abc'
          ? modifyFields(todo, { completed: () => true })
          : todo,
      )

      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modelWithTodos),
        Story.message(Message.ToggledTodo({ id: 'abc' })),
        Story.Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: toggledTodos }),
        ),
        Story.model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
          expect(Option.map(todo, ({ completed }) => completed)).toStrictEqual(
            Option.some(true),
          )
        }),
      )
    })

    it.effect('ToggledTodo on completed todo marks it active', () => {
      const toggledTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'ghi'
          ? modifyFields(todo, { completed: () => false })
          : todo,
      )

      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modelWithTodos),
        Story.message(Message.ToggledTodo({ id: 'ghi' })),
        Story.Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: toggledTodos }),
        ),
        Story.model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'ghi')
          expect(Option.map(todo, ({ completed }) => completed)).toStrictEqual(
            Option.some(false),
          )
        }),
      )
    })

    it.effect('DeletedTodo removes the todo and saves', () => {
      const remainingTodos = modelWithTodos.todos.filter(
        ({ id }) => id !== 'abc',
      )

      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modelWithTodos),
        Story.message(Message.DeletedTodo({ id: 'abc' })),
        Story.Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: remainingTodos }),
        ),
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
    it.effect('StartedEditing enters editing state with the todo text', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modelWithTodos),
        Story.message(Message.StartedEditing({ id: 'abc' })),
        Story.model(model => {
          expect(model.editing).toStrictEqual(
            EditingState.Editing({ id: 'abc', text: 'Buy milk' }),
          )
        }),
      ),
    )

    it.effect('UpdatedEditingTodo updates the editing text', () => {
      const editingModel: Model = modifyFields(modelWithTodos, {
        editing: () => EditingState.Editing({ id: 'abc', text: 'Buy milk' }),
      })

      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(editingModel),
        Story.message(Message.UpdatedEditingTodo({ text: 'Buy oat milk' })),
        Story.model(model => {
          expect(model.editing).toStrictEqual(
            EditingState.Editing({ id: 'abc', text: 'Buy oat milk' }),
          )
        }),
      )
    })

    it.effect('SavedEdit updates the todo text and exits editing', () => {
      const editingModel: Model = modifyFields(modelWithTodos, {
        editing: () =>
          EditingState.Editing({ id: 'abc', text: 'Buy oat milk' }),
      })

      const editedTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'abc'
          ? modifyFields(todo, { text: () => 'Buy oat milk' })
          : todo,
      )

      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(editingModel),
        Story.message(Message.SavedEdit()),
        Story.Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: editedTodos }),
        ),
        Story.model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
          expect(Option.map(todo, ({ text }) => text)).toStrictEqual(
            Option.some('Buy oat milk'),
          )
          expect(model.editing).toStrictEqual(EditingState.NotEditing())
        }),
      )
    })

    it.effect('SavedEdit with empty text exits editing without saving', () => {
      const editingModel: Model = modifyFields(modelWithTodos, {
        editing: () => EditingState.Editing({ id: 'abc', text: '   ' }),
      })

      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(editingModel),
        Story.message(Message.SavedEdit()),
        Story.model(model => {
          const todo = Array.findFirst(model.todos, ({ id }) => id === 'abc')
          expect(Option.map(todo, ({ text }) => text)).toStrictEqual(
            Option.some('Buy milk'),
          )
          expect(model.editing).toStrictEqual(EditingState.NotEditing())
        }),
        Story.Command.expectNone(),
      )
    })

    it.effect('CancelledEdit exits editing without changes', () => {
      const editingModel: Model = modifyFields(modelWithTodos, {
        editing: () =>
          EditingState.Editing({ id: 'abc', text: 'Changed text' }),
      })

      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(editingModel),
        Story.message(Message.CancelledEdit()),
        Story.model(model => {
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
    it.effect(
      'ToggledAll marks all todos completed when some are active',
      () => {
        const allCompletedTodos = modelWithTodos.todos.map(todo =>
          modifyFields(todo, { completed: () => true }),
        )

        return Story.story(
          { block: ApplicationBlock, layer },
          Story.given(modelWithTodos),
          Story.message(Message.ToggledAll()),
          Story.Command.resolve(
            SaveTodos,
            Message.SucceededSaveTodos({ todos: allCompletedTodos }),
          ),
          Story.model(model => {
            expect(Array.every(model.todos, ({ completed }) => completed)).toBe(
              true,
            )
          }),
        )
      },
    )

    it.effect(
      'ToggledAll marks all todos active when all are completed',
      () => {
        const allCompletedModel: Model = modifyFields(emptyModel, {
          todos: () =>
            modelWithTodos.todos.map(todo =>
              modifyFields(todo, { completed: () => true }),
            ),
        })

        const allActiveTodos = allCompletedModel.todos.map(todo =>
          modifyFields(todo, { completed: () => false }),
        )

        return Story.story(
          { block: ApplicationBlock, layer },
          Story.given(allCompletedModel),
          Story.message(Message.ToggledAll()),
          Story.Command.resolve(
            SaveTodos,
            Message.SucceededSaveTodos({ todos: allActiveTodos }),
          ),
          Story.model(model => {
            expect(
              Array.every(model.todos, ({ completed }) => !completed),
            ).toBe(true)
          }),
        )
      },
    )

    it.effect('ClearedCompleted removes only completed todos', () => {
      const activeTodos = modelWithTodos.todos.filter(
        ({ completed }) => !completed,
      )

      return Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modelWithTodos),
        Story.message(Message.ClearedCompleted()),
        Story.Command.resolve(
          SaveTodos,
          Message.SucceededSaveTodos({ todos: activeTodos }),
        ),
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
    it.effect('SelectedFilter changes the active filter', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modelWithTodos),
        Story.message(Message.SelectedFilter({ filter: 'Active' })),
        Story.model(model => {
          expect(model.filter).toBe('Active')
        }),
      ),
    )
  })
})
