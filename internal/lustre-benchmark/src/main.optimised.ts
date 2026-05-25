import { Array, Match as M, Option } from 'effect'
import { Document, Html, createKeyedLazy, createLazy, html } from 'foldkit/html'

import {
  AddedTodo,
  CancelledEdit,
  ClearedCompleted,
  DeletedTodo,
  EditingState,
  Filter,
  Message,
  Model,
  SavedEdit,
  SelectedFilter,
  StartedEditing,
  Todo,
  Todos,
  ToggledAll,
  ToggledTodo,
  UpdatedEditingTodo,
  UpdatedNewTodo,
} from './main.js'

// VIEW

const todoItemClass = (todo: Todo, isEditing: boolean): string => {
  if (todo.completed && isEditing) {
    return 'completed editing'
  }

  if (todo.completed) {
    return 'completed'
  }

  if (isEditing) {
    return 'editing'
  }

  return ''
}

const nonEditingTodoView = (todo: Todo): Html => {
  const h = html<Message>()

  return h.keyed('li')(
    todo.id,
    [h.Class(todoItemClass(todo, false))],
    [
      h.div(
        [h.Class('view')],
        [
          h.input([
            h.Class('toggle'),
            h.Type('checkbox'),
            h.Checked(todo.completed),
            h.OnClick(ToggledTodo({ id: todo.id })),
          ]),
          h.label(
            [h.OnDoubleClick(StartedEditing({ id: todo.id }))],
            [todo.text],
          ),
          h.button(
            [h.Class('destroy'), h.OnClick(DeletedTodo({ id: todo.id }))],
            [],
          ),
        ],
      ),
    ],
  )
}

const editingTodoView = (todo: Todo, text: string): Html => {
  const h = html<Message>()

  return h.keyed('li')(
    todo.id,
    [h.Class(todoItemClass(todo, true))],
    [
      h.input([
        h.Class('edit'),
        h.Value(text),
        h.Name('title'),
        h.Id(`todo-${todo.id}`),
        h.Autofocus(true),
        h.OnInput(text => UpdatedEditingTodo({ text })),
        h.OnBlur(SavedEdit()),
        h.OnKeyDownPreventDefault(key => {
          if (key === 'Enter') {
            return Option.some(SavedEdit())
          }
          if (key === 'Escape') {
            return Option.some(CancelledEdit())
          }
          return Option.none()
        }),
      ]),
    ],
  )
}

const todoItemView = (
  todo: Todo,
  maybeEditingText: Option.Option<string>,
): Html =>
  Option.match(maybeEditingText, {
    onNone: () => nonEditingTodoView(todo),
    onSome: text => editingTodoView(todo, text),
  })

const filterTodos = (todos: Todos, filter: Filter): Todos =>
  M.value(filter).pipe(
    M.when('All', () => todos),
    M.when('Active', () => Array.filter(todos, todo => !todo.completed)),
    M.when('Completed', () => Array.filter(todos, todo => todo.completed)),
    M.exhaustive,
  )

const maybeEditingTextFor = (
  editing: EditingState,
  todoId: string,
): Option.Option<string> =>
  M.value(editing).pipe(
    M.tagsExhaustive({
      NotEditing: () => Option.none(),
      Editing: ({ id, text }) =>
        Option.liftPredicate(text, () => id === todoId),
    }),
  )

const headerView = (newTodoText: string): Html => {
  const h = html<Message>()

  return h.header(
    [h.Class('header')],
    [
      h.h1([], ['todos']),
      h.input([
        h.Class('new-todo'),
        h.Placeholder('What needs to be done?'),
        h.Autofocus(true),
        h.Value(newTodoText),
        h.Name('newTodo'),
        h.OnInput(text => UpdatedNewTodo({ text })),
        h.OnKeyDownPreventDefault(key =>
          Option.liftPredicate(AddedTodo(), () => key === 'Enter'),
        ),
      ]),
    ],
  )
}

const filterItemView = (
  filter: Filter,
  label: string,
  href: string,
  active: Filter,
): Html => {
  const h = html<Message>()

  return h.li(
    [h.OnClick(SelectedFilter({ filter }))],
    [
      h.a(
        [h.Href(href), h.Class(filter === active ? 'selected' : '')],
        [label],
      ),
    ],
  )
}

const footerView = (
  activeCount: number,
  completedCount: number,
  filter: Filter,
): Html => {
  const h = html<Message>()
  const word = activeCount === 1 ? 'item' : 'items'

  return h.keyed('footer')(
    'todo-footer',
    [h.Class('footer')],
    [
      h.span(
        [h.Class('todo-count')],
        [h.strong([], [activeCount.toString()]), ` ${word} left`],
      ),
      h.ul(
        [h.Class('filters')],
        [
          filterItemView('All', 'All', '#/', filter),
          filterItemView('Active', 'Active', '#/active', filter),
          filterItemView('Completed', 'Completed', '#/completed', filter),
        ],
      ),
      completedCount > 0
        ? h.button(
            [h.Class('clear-completed'), h.OnClick(ClearedCompleted())],
            [`Clear completed (${completedCount})`],
          )
        : h.empty,
    ],
  )
}

const lazyHeader = createLazy()
const lazyFooter = createLazy()
const lazyTodo = createKeyedLazy()

export const view = (model: Model): Document => {
  const h = html<Message>()

  const filteredTodos = filterTodos(model.todos, model.filter)
  const activeCount = Array.length(
    Array.filter(model.todos, todo => !todo.completed),
  )
  const completedCount = Array.length(model.todos) - activeCount
  const allCompleted =
    Array.isReadonlyArrayNonEmpty(model.todos) &&
    Array.every(model.todos, todo => todo.completed)

  const renderedHeader = lazyHeader(headerView, [model.newTodoText])

  const renderedMain = Array.match(model.todos, {
    onEmpty: () => h.empty,
    onNonEmpty: () =>
      h.keyed('section')(
        'todo-main',
        [h.Class('main')],
        [
          h.input([
            h.Class('toggle-all'),
            h.Type('checkbox'),
            h.Name('toggle'),
            h.Checked(allCompleted),
            h.OnClick(ToggledAll()),
          ]),
          h.label([h.For('toggle-all')], ['Mark all as complete']),
          h.ul(
            [h.Class('todo-list')],
            Array.map(filteredTodos, todo =>
              lazyTodo(todo.id, todoItemView, [
                todo,
                maybeEditingTextFor(model.editing, todo.id),
              ]),
            ),
          ),
        ],
      ),
  })

  const renderedFooter = Array.match(model.todos, {
    onEmpty: () => h.empty,
    onNonEmpty: () =>
      lazyFooter(footerView, [activeCount, completedCount, model.filter]),
  })

  return {
    title: `Todos (${activeCount})`,
    body: h.section(
      [h.Class('todoapp')],
      [renderedHeader, renderedMain, renderedFooter],
    ),
  }
}
