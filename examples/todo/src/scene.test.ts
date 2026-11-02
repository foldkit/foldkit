import { Layer, Option } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import {
  Command,
  click,
  expect,
  given,
  label,
  role,
  scene,
  submit,
  text,
  type,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

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

const modelWithTodos: Model = modifyFields(emptyModel, {
  todos: () => [
    { id: 'abc', text: 'Buy milk', completed: false, createdAt: 1000 },
    { id: 'def', text: 'Walk the dog', completed: false, createdAt: 2000 },
    { id: 'ghi', text: 'Done task', completed: true, createdAt: 3000 },
  ],
})

describe('view', () => {
  it.effect('empty state shows heading and placeholder message', () =>
    scene(
      ApplicationTest,
      startingArgs,
      given(emptyModel),
      expect(role('heading', { name: 'Todo App' })).toExist(),
      expect(text('No todos yet. Add one above!')).toExist(),
    ),
  )

  it.effect('renders existing todos', () =>
    scene(
      ApplicationTest,
      startingArgs,
      given(modelWithTodos),
      expect(text('Buy milk')).toExist(),
      expect(text('Walk the dog')).toExist(),
      expect(text('Done task')).toExist(),
      expect(role('status')).toContainText('2 active, 1 completed'),
    ),
  )

  it.effect('add a todo through the form', () => {
    const addedTodo = {
      id: 'new-1',
      text: 'Write tests',
      completed: false,
      createdAt: 5000,
    }

    return scene(
      ApplicationTest,
      startingArgs,
      given(emptyModel),
      type(label('New todo'), 'Write tests'),
      submit(role('form')),
      Command.expectExact(GenerateTodo),
      Command.resolve(
        GenerateTodo,
        Message.CompletedGenerateTodo({
          id: 'new-1',
          timestamp: 5000,
          text: 'Write tests',
        }),
      ),
      Command.expectExact(SaveTodos),
      Command.resolve(
        SaveTodos,
        Message.SucceededSaveTodos({ todos: [addedTodo] }),
      ),
      expect(text('Write tests')).toExist(),
      expect(label('New todo')).toHaveValue(''),
    )
  })

  it.effect('toggle a todo by clicking its checkbox', () => {
    const toggledTodos = modelWithTodos.todos.map(todo =>
      todo.id === 'abc' ? modifyFields(todo, { completed: () => true }) : todo,
    )

    return scene(
      ApplicationTest,
      startingArgs,
      given(modelWithTodos),
      click(label('Buy milk')),
      Command.expectExact(SaveTodos),
      Command.resolve(
        SaveTodos,
        Message.SucceededSaveTodos({ todos: toggledTodos }),
      ),
      expect(role('status')).toContainText('1 active, 2 completed'),
    )
  })

  it.effect('delete a todo', () => {
    const remainingTodos = modelWithTodos.todos.filter(({ id }) => id !== 'abc')

    return scene(
      ApplicationTest,
      startingArgs,
      given(modelWithTodos),
      click(role('button', { name: 'Delete Buy milk' })),
      Command.expectExact(SaveTodos),
      Command.resolve(
        SaveTodos,
        Message.SucceededSaveTodos({ todos: remainingTodos }),
      ),
      expect(text('Buy milk')).toBeAbsent(),
      expect(text('Walk the dog')).toExist(),
    )
  })

  it.effect('clear completed removes done todos', () => {
    const activeTodos = modelWithTodos.todos.filter(
      ({ completed }) => !completed,
    )

    return scene(
      ApplicationTest,
      startingArgs,
      given(modelWithTodos),
      click(role('button', { name: 'Clear 1 completed' })),
      Command.expectExact(SaveTodos),
      Command.resolve(
        SaveTodos,
        Message.SucceededSaveTodos({ todos: activeTodos }),
      ),
      expect(text('Done task')).toBeAbsent(),
      expect(role('status')).toContainText('2 active, 0 completed'),
    )
  })

  it.effect('mark all complete toggles all todos', () => {
    const allCompletedTodos = modelWithTodos.todos.map(todo =>
      modifyFields(todo, { completed: () => true }),
    )

    return scene(
      ApplicationTest,
      startingArgs,
      given(modelWithTodos),
      click(role('button', { name: 'Mark all complete' })),
      Command.expectExact(SaveTodos),
      Command.resolve(
        SaveTodos,
        Message.SucceededSaveTodos({ todos: allCompletedTodos }),
      ),
      expect(role('status')).toContainText('0 active, 3 completed'),
    )
  })

  it.effect('keeps in-memory changes when saving fails', () =>
    scene(
      ApplicationTest,
      startingArgs,
      given(modelWithTodos),
      click(label('Buy milk')),
      Command.expectExact(SaveTodos),
      Command.resolve(SaveTodos, Message.FailedSaveTodos()),
      expect(role('status')).toContainText('1 active, 2 completed'),
    ),
  )
})
