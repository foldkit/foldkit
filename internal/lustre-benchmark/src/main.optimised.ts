import { Array, Option } from 'effect'
import {
  Document,
  Html,
  type HtmlBuilder,
  createKeyedLazy,
  createLazy,
} from 'foldkit/html'

import {
  EditingState,
  Filter,
  Message,
  Model,
  Todo,
  countActiveTodos,
  filterTodos,
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

const nonEditingTodoView = (todo: Todo, h: HtmlBuilder<Message>): Html => {
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
            h.OnClick(Message.ToggledTodo({ id: todo.id })),
          ]),
          h.label(
            [h.OnDoubleClick(Message.StartedEditing({ id: todo.id }))],
            [todo.text],
          ),
          h.button([
            h.Class('destroy'),
            h.OnClick(Message.DeletedTodo({ id: todo.id })),
          ]),
        ],
      ),
    ],
  )
}

const editingTodoView = (
  todo: Todo,
  text: string,
  h: HtmlBuilder<Message>,
): Html => {
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
        h.OnInput(text => Message.UpdatedEditingTodo({ text })),
        h.OnBlur(Message.SavedEdit()),
        h.OnKeyDownPreventDefault(key => {
          if (key === 'Enter') {
            return Option.some(Message.SavedEdit())
          }
          if (key === 'Escape') {
            return Option.some(Message.CancelledEdit())
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
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(maybeEditingText, {
    onNone: () => nonEditingTodoView(todo, h),
    onSome: text => editingTodoView(todo, text, h),
  })

// NOTE: hot-path helper. `Match.value(...).pipe(Match.tagsExhaustive(...))`
// constructs a fresh matcher on every call; done per todo per frame it
// dominates view time, so this checks the tag directly.
const maybeEditingTextFor = (
  editing: EditingState,
  todoId: string,
): Option.Option<string> => {
  if (editing._tag === 'Editing' && editing.id === todoId) {
    return Option.some(editing.text)
  }
  return Option.none()
}

const headerView = (newTodoText: string, h: HtmlBuilder<Message>): Html => {
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
        h.OnInput(text => Message.UpdatedNewTodo({ text })),
        h.OnKeyDownPreventDefault(key =>
          Option.liftPredicate(Message.AddedTodo(), () => key === 'Enter'),
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
  h: HtmlBuilder<Message>,
): Html => {
  return h.li(
    [h.OnClick(Message.SelectedFilter({ filter }))],
    [
      h.a(
        [h.Href(href), h.Class(filter === active ? 'selected' : '')],
        [label],
      ),
    ],
  )
}

const filtersView = (filter: Filter, h: HtmlBuilder<Message>): Html => {
  return h.ul(
    [h.Class('filters')],
    [
      filterItemView('All', 'All', '#/', filter, h),
      filterItemView('Active', 'Active', '#/active', filter, h),
      filterItemView('Completed', 'Completed', '#/completed', filter, h),
    ],
  )
}

// NOTE: the footer rebuilds on every count change, which is every runbook
// step, but the filters list depends only on the active filter. The nested
// lazy slot keeps the per-step footer rebuild down to the count span and
// the clear button.
const lazyFilters = createLazy()

const footerView = (
  activeCount: number,
  completedCount: number,
  filter: Filter,
  h: HtmlBuilder<Message>,
): Html => {
  const word = activeCount === 1 ? 'item' : 'items'

  return h.footer(
    [h.Class('footer')],
    [
      h.span(
        [h.Class('todo-count')],
        [h.strong([], [activeCount.toString()]), ` ${word} left`],
      ),
      lazyFilters(filtersView, [filter, h]),
      completedCount > 0
        ? h.button(
            [h.Class('clear-completed'), h.OnClick(Message.ClearedCompleted())],
            [`Clear completed (${completedCount})`],
          )
        : h.empty,
    ],
  )
}

const toggleAllInputView = (
  allCompleted: boolean,
  h: HtmlBuilder<Message>,
): Html => {
  return h.input([
    h.Class('toggle-all'),
    h.Id('toggle-all'),
    h.Type('checkbox'),
    h.Name('toggle'),
    h.Checked(allCompleted),
    h.OnClick(Message.ToggledAll()),
  ])
}

const toggleAllLabelView = (h: HtmlBuilder<Message>): Html => {
  return h.label([h.For('toggle-all')], ['Mark all as complete'])
}

const lazyHeader = createLazy()
const lazyFooter = createLazy()
const lazyToggleAllInput = createLazy()
const lazyToggleAllLabel = createLazy()
const lazyTodo = createKeyedLazy()

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const filteredTodos = filterTodos(model.todos, model.filter)
  const activeCount = countActiveTodos(model.todos)
  const completedCount = Array.length(model.todos) - activeCount
  const allCompleted =
    Array.isReadonlyArrayNonEmpty(model.todos) && activeCount === 0

  const renderedHeader = lazyHeader(headerView, [model.newTodoText, h])

  const renderedMain = Array.match(model.todos, {
    onEmpty: () => h.empty,
    onNonEmpty: () =>
      h.section(
        [h.Class('main')],
        [
          lazyToggleAllInput(toggleAllInputView, [allCompleted, h]),
          lazyToggleAllLabel(toggleAllLabelView, [h]),
          h.ul(
            [h.Class('todo-list')],
            Array.map(filteredTodos, todo =>
              lazyTodo(todo.id, todoItemView, [
                todo,
                maybeEditingTextFor(model.editing, todo.id),
                h,
              ]),
            ),
          ),
        ],
      ),
  })

  const renderedFooter = Array.match(model.todos, {
    onEmpty: () => h.empty,
    onNonEmpty: () =>
      lazyFooter(footerView, [activeCount, completedCount, model.filter, h]),
  })

  return {
    title: 'Foldkit TodoMVC Benchmark',
    body: h.section(
      [h.Class('todoapp')],
      [renderedHeader, renderedMain, renderedFooter],
    ),
  }
}
