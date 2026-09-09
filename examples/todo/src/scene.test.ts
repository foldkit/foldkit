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
import { evo } from 'foldkit/struct'
import { describe, test } from 'vitest'

import {
  EditingState,
  GenerateTodo,
  Message,
  type Model,
  SaveTodos,
  update,
  view,
} from './main'

const emptyModel: Model = {
  todos: [],
  newTodoText: '',
  filter: 'All',
  editing: EditingState.NotEditing(),
}

const modelWithTodos: Model = evo(emptyModel, {
  todos: () => [
    { id: 'abc', text: 'Buy milk', completed: false, createdAt: 1000 },
    { id: 'def', text: 'Walk the dog', completed: false, createdAt: 2000 },
    { id: 'ghi', text: 'Done task', completed: true, createdAt: 3000 },
  ],
})

describe('view', () => {
  test('empty state shows heading and placeholder message', () => {
    scene(
      { update, view },
      given(emptyModel),
      expect(role('heading', { name: 'Todo App' })).toExist(),
      expect(text('No todos yet. Add one above!')).toExist(),
    )
  })

  test('renders existing todos', () => {
    scene(
      { update, view },
      given(modelWithTodos),
      expect(text('Buy milk')).toExist(),
      expect(text('Walk the dog')).toExist(),
      expect(text('Done task')).toExist(),
      expect(role('status')).toContainText('2 active, 1 completed'),
    )
  })

  test('add a todo through the form', () => {
    const addedTodo = {
      id: 'new-1',
      text: 'Write tests',
      completed: false,
      createdAt: 5000,
    }

    scene(
      { update, view },
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

  test('toggle a todo by clicking its checkbox', () => {
    const toggledTodos = modelWithTodos.todos.map(todo =>
      todo.id === 'abc' ? evo(todo, { completed: () => true }) : todo,
    )

    scene(
      { update, view },
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

  test('delete a todo', () => {
    const remainingTodos = modelWithTodos.todos.filter(({ id }) => id !== 'abc')

    scene(
      { update, view },
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

  test('clear completed removes done todos', () => {
    const activeTodos = modelWithTodos.todos.filter(
      ({ completed }) => !completed,
    )

    scene(
      { update, view },
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

  test('mark all complete toggles all todos', () => {
    const allCompletedTodos = modelWithTodos.todos.map(todo =>
      evo(todo, { completed: () => true }),
    )

    scene(
      { update, view },
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

  test('keeps in-memory changes when saving fails', () => {
    scene(
      { update, view },
      given(modelWithTodos),
      click(label('Buy milk')),
      Command.expectExact(SaveTodos),
      Command.resolve(SaveTodos, Message.FailedSaveTodos()),
      expect(role('status')).toContainText('1 active, 2 completed'),
    )
  })
})
