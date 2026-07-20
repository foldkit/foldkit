import { Array, Match as M, Option, Schema as S, String } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

// MODEL

const Todo = S.Struct({
  id: S.String,
  text: S.String,
  completed: S.Boolean,
})
export type Todo = typeof Todo.Type

const Todos = S.Array(Todo)
export type Todos = typeof Todos.Type

const Filter = S.Literals(['All', 'Active', 'Completed'])
export type Filter = typeof Filter.Type

export const NotEditing = ts('NotEditing')
type NotEditing = typeof NotEditing.Type

export const Editing = ts('Editing', {
  id: S.String,
  text: S.String,
})
type Editing = typeof Editing.Type

const EditingState = S.Union([NotEditing, Editing])
export type EditingState = typeof EditingState.Type

export const Model = S.Struct({
  todos: Todos,
  newTodoText: S.String,
  filter: Filter,
  editing: EditingState,
  nextTodoId: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedNewTodo = m('UpdatedNewTodo', { text: S.String })
export const UpdatedEditingTodo = m('UpdatedEditingTodo', { text: S.String })
export const AddedTodo = m('AddedTodo')
export const DeletedTodo = m('DeletedTodo', { id: S.String })
export const ToggledTodo = m('ToggledTodo', { id: S.String })
export const StartedEditing = m('StartedEditing', { id: S.String })
export const SavedEdit = m('SavedEdit')
export const CancelledEdit = m('CancelledEdit')
export const ToggledAll = m('ToggledAll')
export const ClearedCompleted = m('ClearedCompleted')
export const SelectedFilter = m('SelectedFilter', { filter: Filter })

export const Message = S.Union([
  UpdatedNewTodo,
  UpdatedEditingTodo,
  AddedTodo,
  DeletedTodo,
  ToggledTodo,
  StartedEditing,
  SavedEdit,
  CancelledEdit,
  ToggledAll,
  ClearedCompleted,
  SelectedFilter,
])
export type Message = typeof Message.Type

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  {
    todos: [],
    newTodoText: '',
    filter: 'All',
    editing: NotEditing(),
    nextTodoId: 0,
  },
  [],
]

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  updateHandlers[message._tag](model, message as never)

// NOTE: hot-path dispatch. A `M.value(...).pipe(M.tagsExhaustive(...))`
// matcher is constructed per call; done per Message it is measurable on the
// benchmark, so update dispatches through a handler record built once. The
// mapped type keeps the record exhaustive over the Message union.
type UpdateResult = readonly [Model, ReadonlyArray<Command.Command<Message>>]

type UpdateHandlers = {
  readonly [Tag in Message['_tag']]: (
    model: Model,
    message: Extract<Message, Readonly<{ _tag: Tag }>>,
  ) => UpdateResult
}

const updateHandlers: UpdateHandlers = {
  UpdatedNewTodo: (model, { text }) => [
    evo(model, {
      newTodoText: () => text,
    }),
    [],
  ],

  UpdatedEditingTodo: (model, { text }) => {
    if (model.editing._tag === 'NotEditing') {
      return [model, []]
    }
    const editingId = model.editing.id
    return [
      evo(model, {
        editing: () => Editing({ id: editingId, text }),
      }),
      [],
    ]
  },

  AddedTodo: model => {
    const text = String.trim(model.newTodoText)
    if (String.isEmpty(text)) {
      return [model, []]
    }

    const newTodo: Todo = {
      id: `todo-${model.nextTodoId}`,
      text,
      completed: false,
    }

    return [
      evo(model, {
        todos: () => [...model.todos, newTodo],
        newTodoText: () => '',
        nextTodoId: nextTodoId => nextTodoId + 1,
      }),
      [],
    ]
  },

  DeletedTodo: (model, { id }) => [
    evo(model, {
      todos: () => Array.filter(model.todos, todo => todo.id !== id),
    }),
    [],
  ],

  ToggledTodo: (model, { id }) => [
    evo(model, {
      todos: () =>
        Array.map(model.todos, todo =>
          todo.id === id
            ? evo(todo, { completed: completed => !completed })
            : todo,
        ),
    }),
    [],
  ],

  StartedEditing: (model, { id }) => {
    const maybeTodo = Array.findFirst(model.todos, todo => todo.id === id)
    return [
      evo(model, {
        editing: () =>
          Editing({
            id,
            text: Option.match(maybeTodo, {
              onNone: () => '',
              onSome: todo => todo.text,
            }),
          }),
      }),
      [],
    ]
  },

  SavedEdit: model => {
    if (model.editing._tag === 'NotEditing') {
      return [model, []]
    }

    const editingId = model.editing.id
    const text = String.trim(model.editing.text)
    if (String.isEmpty(text)) {
      return [
        evo(model, {
          editing: () => NotEditing(),
        }),
        [],
      ]
    }

    return [
      evo(model, {
        todos: () =>
          Array.map(model.todos, todo =>
            todo.id === editingId ? evo(todo, { text: () => text }) : todo,
          ),
        editing: () => NotEditing(),
      }),
      [],
    ]
  },

  CancelledEdit: model => [
    evo(model, {
      editing: () => NotEditing(),
    }),
    [],
  ],

  ToggledAll: model => {
    const allCompleted = Array.every(model.todos, todo => todo.completed)
    return [
      evo(model, {
        todos: () =>
          Array.map(model.todos, todo =>
            evo(todo, {
              completed: () => !allCompleted,
            }),
          ),
      }),
      [],
    ]
  },

  ClearedCompleted: model => [
    evo(model, {
      todos: () => Array.filter(model.todos, todo => !todo.completed),
    }),
    [],
  ],

  SelectedFilter: (model, { filter }) => [
    evo(model, {
      filter: () => filter,
    }),
    [],
  ],
}

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
        h.OnKeyDownPreventDefault(key =>
          M.value(key).pipe(
            M.when('Enter', () => Option.some(SavedEdit())),
            M.when('Escape', () => Option.some(CancelledEdit())),
            M.orElse(() => Option.none()),
          ),
        ),
      ]),
    ],
  )
}

// NOTE: hot-path helpers. `M.value(...).pipe(M.tagsExhaustive(...))`
// constructs a fresh matcher on every call; done per todo per frame it
// dominates view time, so these run on the tag directly.
const todoItemView =
  (editing: EditingState) =>
  (todo: Todo): Html => {
    if (editing._tag === 'Editing' && editing.id === todo.id) {
      return editingTodoView(todo, editing.text)
    }
    return nonEditingTodoView(todo)
  }

export const filterTodos = (todos: Todos, filter: Filter): Todos => {
  if (filter === 'All') {
    return todos
  }
  if (filter === 'Active') {
    return Array.filter(todos, todo => !todo.completed)
  }
  return Array.filter(todos, todo => todo.completed)
}

export const countActiveTodos = (todos: Todos): number => {
  let activeCount = 0
  for (const todo of todos) {
    if (!todo.completed) {
      activeCount += 1
    }
  }
  return activeCount
}

const filterItemView =
  (active: Filter) =>
  (filter: Filter, label: string, href: string): Html => {
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

export const view = (model: Model): Document => {
  const h = html<Message>()

  const filteredTodos = filterTodos(model.todos, model.filter)
  const activeCount = countActiveTodos(model.todos)
  const completedCount = Array.length(model.todos) - activeCount
  const allCompleted =
    Array.isReadonlyArrayNonEmpty(model.todos) && activeCount === 0
  const word = activeCount === 1 ? 'item' : 'items'
  const filterItem = filterItemView(model.filter)

  const headerView = h.header(
    [h.Class('header')],
    [
      h.h1([], ['todos']),
      h.input([
        h.Class('new-todo'),
        h.Placeholder('What needs to be done?'),
        h.Autofocus(true),
        h.Value(model.newTodoText),
        h.Name('newTodo'),
        h.OnInput(text => UpdatedNewTodo({ text })),
        h.OnKeyDownPreventDefault(key =>
          key === 'Enter' ? Option.some(AddedTodo()) : Option.none(),
        ),
      ]),
    ],
  )

  const mainView = Array.match(model.todos, {
    onEmpty: () => h.empty,
    onNonEmpty: () =>
      h.section(
        [h.Class('main')],
        [
          h.input([
            h.Class('toggle-all'),
            h.Id('toggle-all'),
            h.Type('checkbox'),
            h.Name('toggle'),
            h.Checked(allCompleted),
            h.OnClick(ToggledAll()),
          ]),
          h.label([h.For('toggle-all')], ['Mark all as complete']),
          h.ul(
            [h.Class('todo-list')],
            Array.map(filteredTodos, todoItemView(model.editing)),
          ),
        ],
      ),
  })

  const footerView = Array.match(model.todos, {
    onEmpty: () => h.empty,
    onNonEmpty: () =>
      h.footer(
        [h.Class('footer')],
        [
          h.span(
            [h.Class('todo-count')],
            [h.strong([], [activeCount.toString()]), ` ${word} left`],
          ),
          h.ul(
            [h.Class('filters')],
            [
              filterItem('All', 'All', '#/'),
              filterItem('Active', 'Active', '#/active'),
              filterItem('Completed', 'Completed', '#/completed'),
            ],
          ),
          completedCount > 0
            ? h.button(
                [h.Class('clear-completed'), h.OnClick(ClearedCompleted())],
                [`Clear completed (${completedCount})`],
              )
            : h.empty,
        ],
      ),
  })

  return {
    title: 'Foldkit TodoMVC Benchmark',
    body: h.section([h.Class('todoapp')], [headerView, mainView, footerView]),
  }
}
