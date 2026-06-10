import {
  Array,
  Clock,
  Effect,
  Match as M,
  Option,
  Random,
  Schema as S,
  String,
} from 'effect'
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
  createdAt: S.Number,
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
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedNewTodo = m('UpdatedNewTodo', { text: S.String })
export const UpdatedEditingTodo = m('UpdatedEditingTodo', { text: S.String })
export const AddedTodo = m('AddedTodo')
export const GeneratedTodo = m('GeneratedTodo', {
  id: S.String,
  timestamp: S.Number,
  text: S.String,
})
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
  GeneratedTodo,
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
  },
  [],
]

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      UpdatedNewTodo: ({ text }) => [
        evo(model, {
          newTodoText: () => text,
        }),
        [],
      ],

      UpdatedEditingTodo: ({ text }) => [
        evo(model, {
          editing: () =>
            M.value(model.editing).pipe(
              M.tagsExhaustive({
                NotEditing: () => model.editing,
                Editing: ({ id }) => Editing({ id, text }),
              }),
            ),
        }),
        [],
      ],

      AddedTodo: () => {
        if (String.isEmpty(String.trim(model.newTodoText))) {
          return [model, []]
        }

        return [model, [GenerateTodo({ text: String.trim(model.newTodoText) })]]
      },

      GeneratedTodo: ({ id, timestamp, text }) => {
        const newTodo: Todo = {
          id,
          text,
          completed: false,
          createdAt: timestamp,
        }

        return [
          evo(model, {
            todos: () => [...model.todos, newTodo],
            newTodoText: () => '',
          }),
          [],
        ]
      },

      DeletedTodo: ({ id }) => [
        evo(model, {
          todos: () => Array.filter(model.todos, todo => todo.id !== id),
        }),
        [],
      ],

      ToggledTodo: ({ id }) => [
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

      StartedEditing: ({ id }) => {
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

      SavedEdit: () =>
        M.value(model.editing).pipe(
          M.withReturnType<
            readonly [Model, ReadonlyArray<Command.Command<Message>>]
          >(),
          M.tagsExhaustive({
            NotEditing: () => [model, []],

            Editing: ({ id, text }) => {
              if (String.isEmpty(String.trim(text))) {
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
                      todo.id === id
                        ? evo(todo, { text: () => String.trim(text) })
                        : todo,
                    ),
                  editing: () => NotEditing(),
                }),
                [],
              ]
            },
          }),
        ),

      CancelledEdit: () => [
        evo(model, {
          editing: () => NotEditing(),
        }),
        [],
      ],

      ToggledAll: () => {
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

      ClearedCompleted: () => [
        evo(model, {
          todos: () => Array.filter(model.todos, todo => !todo.completed),
        }),
        [],
      ],

      SelectedFilter: ({ filter }) => [
        evo(model, {
          filter: () => filter,
        }),
        [],
      ],
    }),
  )

// COMMAND

export const GenerateTodo = Command.define(
  'GenerateTodo',
  { text: S.String },
  GeneratedTodo,
)(({ text }) =>
  Effect.gen(function* () {
    const idNumber = yield* Random.nextIntBetween(0, Number.MAX_SAFE_INTEGER)
    const id = idNumber.toString(36)
    const timestamp = yield* Clock.currentTimeMillis
    return GeneratedTodo({ id, timestamp, text })
  }),
)

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

const todoItemView =
  (editing: EditingState) =>
  (todo: Todo): Html =>
    M.value(editing).pipe(
      M.tagsExhaustive({
        NotEditing: () => nonEditingTodoView(todo),
        Editing: ({ id, text }) =>
          id === todo.id
            ? editingTodoView(todo, text)
            : nonEditingTodoView(todo),
      }),
    )

const filterTodos = (todos: Todos, filter: Filter): Todos =>
  M.value(filter).pipe(
    M.when('All', () => todos),
    M.when('Active', () => Array.filter(todos, todo => !todo.completed)),
    M.when('Completed', () => Array.filter(todos, todo => todo.completed)),
    M.exhaustive,
  )

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
  const activeCount = Array.length(
    Array.filter(model.todos, todo => !todo.completed),
  )
  const completedCount = Array.length(model.todos) - activeCount
  const allCompleted =
    Array.isReadonlyArrayNonEmpty(model.todos) &&
    Array.every(model.todos, todo => todo.completed)
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
            Array.map(filteredTodos, todoItemView(model.editing)),
          ),
        ],
      ),
  })

  const footerView = Array.match(model.todos, {
    onEmpty: () => h.empty,
    onNonEmpty: () =>
      h.keyed('footer')(
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
    title: `Todos (${activeCount})`,
    body: h.section([h.Class('todoapp')], [headerView, mainView, footerView]),
  }
}
