import { DataCommand, Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  GenerateTodo,
  GeneratedTodo,
  type Message,
  type Model,
  NotEditing,
  SaveTodos,
  SavedTodos,
  execute,
  update,
  view,
} from './main'

const interpret = DataCommand.toCommand(execute)
const interpretAll = DataCommand.toCommands(execute)

const interpretedUpdate = (model: Model, message: Message) => {
  const [nextModel, commands] = update(model, message)
  return [nextModel, interpretAll(commands)] as const
}

const emptyModel: Model = {
  todos: [],
  newTodoText: '',
  filter: 'All',
  editing: NotEditing(),
}

const modelWithTodos: Model = {
  ...emptyModel,
  todos: [
    { id: 'abc', text: 'Buy milk', completed: false, createdAt: 1000 },
    { id: 'def', text: 'Walk the dog', completed: false, createdAt: 2000 },
    { id: 'ghi', text: 'Done task', completed: true, createdAt: 3000 },
  ],
}

describe('scene', () => {
  test('empty state shows heading and placeholder message', () => {
    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(emptyModel),
      Scene.expect(Scene.role('heading', { name: 'Todo App' })).toExist(),
      Scene.expect(Scene.text('No todos yet. Add one above!')).toExist(),
    )
  })

  test('renders existing todos', () => {
    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(modelWithTodos),
      Scene.expect(Scene.text('Buy milk')).toExist(),
      Scene.expect(Scene.text('Walk the dog')).toExist(),
      Scene.expect(Scene.text('Done task')).toExist(),
      Scene.expect(Scene.role('status')).toContainText('2 active, 1 completed'),
    )
  })

  test('add a todo through the form', () => {
    const addedTodo = {
      id: 'new-1',
      text: 'Write tests',
      completed: false,
      createdAt: 5000,
    }

    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(emptyModel),
      Scene.type(Scene.label('New todo'), 'Write tests'),
      Scene.submit(Scene.role('form')),
      Scene.Command.expectExact({ name: 'GenerateTodo' }),
      Scene.Command.resolve(
        interpret(GenerateTodo({ text: 'Write tests' })),
        GeneratedTodo({ id: 'new-1', timestamp: 5000, text: 'Write tests' }),
      ),
      Scene.Command.expectExact({ name: 'SaveTodos' }),
      Scene.Command.resolve(
        interpret(SaveTodos({ todos: [addedTodo] })),
        SavedTodos({ todos: [addedTodo] }),
      ),
      Scene.expect(Scene.text('Write tests')).toExist(),
      Scene.expect(Scene.label('New todo')).toHaveValue(''),
    )
  })

  test('toggle a todo by clicking its checkbox', () => {
    const toggledTodos = modelWithTodos.todos.map(todo =>
      todo.id === 'abc' ? { ...todo, completed: true } : todo,
    )

    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(modelWithTodos),
      Scene.click(Scene.label('Buy milk')),
      Scene.Command.expectExact({ name: 'SaveTodos' }),
      Scene.Command.resolve(
        interpret(SaveTodos({ todos: toggledTodos })),
        SavedTodos({ todos: toggledTodos }),
      ),
      Scene.expect(Scene.role('status')).toContainText('1 active, 2 completed'),
    )
  })

  test('delete a todo', () => {
    const remainingTodos = modelWithTodos.todos.filter(({ id }) => id !== 'abc')

    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(modelWithTodos),
      Scene.click(Scene.role('button', { name: 'Delete Buy milk' })),
      Scene.Command.expectExact({ name: 'SaveTodos' }),
      Scene.Command.resolve(
        interpret(SaveTodos({ todos: remainingTodos })),
        SavedTodos({ todos: remainingTodos }),
      ),
      Scene.expect(Scene.text('Buy milk')).toBeAbsent(),
      Scene.expect(Scene.text('Walk the dog')).toExist(),
    )
  })

  test('clear completed removes done todos', () => {
    const activeTodos = modelWithTodos.todos.filter(
      ({ completed }) => !completed,
    )

    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(modelWithTodos),
      Scene.click(Scene.role('button', { name: 'Clear 1 completed' })),
      Scene.Command.expectExact({ name: 'SaveTodos' }),
      Scene.Command.resolve(
        interpret(SaveTodos({ todos: activeTodos })),
        SavedTodos({ todos: activeTodos }),
      ),
      Scene.expect(Scene.text('Done task')).toBeAbsent(),
      Scene.expect(Scene.role('status')).toContainText('2 active, 0 completed'),
    )
  })

  test('mark all complete toggles all todos', () => {
    const allCompletedTodos = modelWithTodos.todos.map(todo => ({
      ...todo,
      completed: true,
    }))

    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(modelWithTodos),
      Scene.click(Scene.role('button', { name: 'Mark all complete' })),
      Scene.Command.expectExact({ name: 'SaveTodos' }),
      Scene.Command.resolve(
        interpret(SaveTodos({ todos: allCompletedTodos })),
        SavedTodos({ todos: allCompletedTodos }),
      ),
      Scene.expect(Scene.role('status')).toContainText('0 active, 3 completed'),
    )
  })
})
