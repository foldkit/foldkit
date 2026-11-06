import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

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

const modelWithTodos: Model = modifyFields(emptyModel, {
  todos: () => [
    { id: 'abc', text: 'Buy milk', completed: false, createdAt: 1000 },
    { id: 'def', text: 'Walk the dog', completed: false, createdAt: 2000 },
    { id: 'ghi', text: 'Done task', completed: true, createdAt: 3000 },
  ],
})

describe('view', () => {
  it.effect('empty state shows heading and placeholder message', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(emptyModel),
      Scene.expect(Scene.role('heading', { name: 'Todo App' })).toExist(),
      Scene.expect(Scene.text('No todos yet. Add one above!')).toExist(),
    ),
  )

  it.effect('renders existing todos', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modelWithTodos),
      Scene.expect(Scene.text('Buy milk')).toExist(),
      Scene.expect(Scene.text('Walk the dog')).toExist(),
      Scene.expect(Scene.text('Done task')).toExist(),
      Scene.expect(Scene.role('status')).toContainText('2 active, 1 completed'),
    ),
  )

  it.effect('add a todo through the form', () => {
    const addedTodo = {
      id: 'new-1',
      text: 'Write tests',
      completed: false,
      createdAt: 5000,
    }

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(emptyModel),
      Scene.type(Scene.label('New todo'), 'Write tests'),
      Scene.submit(Scene.role('form')),
      Scene.Command.expectExact(GenerateTodo),
      Scene.Command.resolve(
        GenerateTodo,
        Message.CompletedGenerateTodo({
          id: 'new-1',
          timestamp: 5000,
          text: 'Write tests',
        }),
      ),
      Scene.Command.expectExact(SaveTodos),
      Scene.Command.resolve(
        SaveTodos,
        Message.SucceededSaveTodos({ todos: [addedTodo] }),
      ),
      Scene.expect(Scene.text('Write tests')).toExist(),
      Scene.expect(Scene.label('New todo')).toHaveValue(''),
    )
  })

  it.effect('toggle a todo by clicking its checkbox', () => {
    const toggledTodos = modelWithTodos.todos.map(todo =>
      todo.id === 'abc' ? modifyFields(todo, { completed: () => true }) : todo,
    )

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modelWithTodos),
      Scene.click(Scene.label('Buy milk')),
      Scene.Command.expectExact(SaveTodos),
      Scene.Command.resolve(
        SaveTodos,
        Message.SucceededSaveTodos({ todos: toggledTodos }),
      ),
      Scene.expect(Scene.role('status')).toContainText('1 active, 2 completed'),
    )
  })

  it.effect('delete a todo', () => {
    const remainingTodos = modelWithTodos.todos.filter(({ id }) => id !== 'abc')

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modelWithTodos),
      Scene.click(Scene.role('button', { name: 'Delete Buy milk' })),
      Scene.Command.expectExact(SaveTodos),
      Scene.Command.resolve(
        SaveTodos,
        Message.SucceededSaveTodos({ todos: remainingTodos }),
      ),
      Scene.expect(Scene.text('Buy milk')).toBeAbsent(),
      Scene.expect(Scene.text('Walk the dog')).toExist(),
    )
  })

  it.effect('clear completed removes done todos', () => {
    const activeTodos = modelWithTodos.todos.filter(
      ({ completed }) => !completed,
    )

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modelWithTodos),
      Scene.click(Scene.role('button', { name: 'Clear 1 completed' })),
      Scene.Command.expectExact(SaveTodos),
      Scene.Command.resolve(
        SaveTodos,
        Message.SucceededSaveTodos({ todos: activeTodos }),
      ),
      Scene.expect(Scene.text('Done task')).toBeAbsent(),
      Scene.expect(Scene.role('status')).toContainText('2 active, 0 completed'),
    )
  })

  it.effect('mark all complete toggles all todos', () => {
    const allCompletedTodos = modelWithTodos.todos.map(todo =>
      modifyFields(todo, { completed: () => true }),
    )

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modelWithTodos),
      Scene.click(Scene.role('button', { name: 'Mark all complete' })),
      Scene.Command.expectExact(SaveTodos),
      Scene.Command.resolve(
        SaveTodos,
        Message.SucceededSaveTodos({ todos: allCompletedTodos }),
      ),
      Scene.expect(Scene.role('status')).toContainText('0 active, 3 completed'),
    )
  })

  it.effect('keeps in-memory changes when saving fails', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modelWithTodos),
      Scene.click(Scene.label('Buy milk')),
      Scene.Command.expectExact(SaveTodos),
      Scene.Command.resolve(SaveTodos, Message.FailedSaveTodos()),
      Scene.expect(Scene.role('status')).toContainText('1 active, 2 completed'),
    ),
  )
})
