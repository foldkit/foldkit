import { Array, Layer, Option } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import {
  ApplicationLive,
  EditingState,
  GenerateTodo,
  Message,
  type Model,
  SaveTodos,
} from './application'

const ApplicationTest = ApplicationLive.pipe(
  Layer.provide(KeyValueStore.layerMemory),
)

const startingArgs = { flags: { todos: Option.none() } }

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
      story(
        ApplicationTest,
        startingArgs,
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
        model(model => {
          expect(model.todos).toHaveLength(1)
          expect(model.todos[0]?.text).toBe('Buy milk')
          expect(model.todos[0]?.completed).toBe(false)
          expect(model.newTodoText).toBe('')
        }),
      ),
    )

    it.effect('AddedTodo with empty text is ignored', () =>
      story(
        ApplicationTest,
        startingArgs,
        given(modifyFields(emptyModel, { newTodoText: () => '' })),
        message(Message.AddedTodo()),
        Command.expectNone(),
      ),
    )

    it.effect('AddedTodo with whitespace-only text is ignored', () =>
      story(
        ApplicationTest,
        startingArgs,
        given(modifyFields(emptyModel, { newTodoText: () => '   ' })),
        message(Message.AddedTodo()),
        Command.expectNone(),
      ),
    )

    it.effect('UpdatedNewTodo updates the input text', () =>
      story(
        ApplicationTest,
        startingArgs,
        given(emptyModel),
        message(Message.UpdatedNewTodo({ text: 'Walk' })),
        model(model => {
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

      return story(
        ApplicationTest,
        startingArgs,
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

    it.effect('ToggledTodo on completed todo marks it active', () => {
      const toggledTodos = modelWithTodos.todos.map(todo =>
        todo.id === 'ghi'
          ? modifyFields(todo, { completed: () => false })
          : todo,
      )

      return story(
        ApplicationTest,
        startingArgs,
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

    it.effect('DeletedTodo removes the todo and saves', () => {
      const remainingTodos = modelWithTodos.todos.filter(
        ({ id }) => id !== 'abc',
      )

      return story(
        ApplicationTest,
        startingArgs,
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
    it.effect('StartedEditing enters editing state with the todo text', () =>
      story(
        ApplicationTest,
        startingArgs,
        given(modelWithTodos),
        message(Message.StartedEditing({ id: 'abc' })),
        model(model => {
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

      return story(
        ApplicationTest,
        startingArgs,
        given(editingModel),
        message(Message.UpdatedEditingTodo({ text: 'Buy oat milk' })),
        model(model => {
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

      return story(
        ApplicationTest,
        startingArgs,
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

    it.effect('SavedEdit with empty text exits editing without saving', () => {
      const editingModel: Model = modifyFields(modelWithTodos, {
        editing: () => EditingState.Editing({ id: 'abc', text: '   ' }),
      })

      return story(
        ApplicationTest,
        startingArgs,
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

    it.effect('CancelledEdit exits editing without changes', () => {
      const editingModel: Model = modifyFields(modelWithTodos, {
        editing: () =>
          EditingState.Editing({ id: 'abc', text: 'Changed text' }),
      })

      return story(
        ApplicationTest,
        startingArgs,
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
    it.effect(
      'ToggledAll marks all todos completed when some are active',
      () => {
        const allCompletedTodos = modelWithTodos.todos.map(todo =>
          modifyFields(todo, { completed: () => true }),
        )

        return story(
          ApplicationTest,
          startingArgs,
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

        return story(
          ApplicationTest,
          startingArgs,
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
        )
      },
    )

    it.effect('ClearedCompleted removes only completed todos', () => {
      const activeTodos = modelWithTodos.todos.filter(
        ({ completed }) => !completed,
      )

      return story(
        ApplicationTest,
        startingArgs,
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
    it.effect('SelectedFilter changes the active filter', () =>
      story(
        ApplicationTest,
        startingArgs,
        given(modelWithTodos),
        message(Message.SelectedFilter({ filter: 'Active' })),
        model(model => {
          expect(model.filter).toBe('Active')
        }),
      ),
    )
  })
})
