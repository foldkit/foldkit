import { BrowserKeyValueStore } from '@effect/platform-browser'
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
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

// CONSTANT

const TODOS_STORAGE_KEY = 'todos'

// MODEL

const Todo = S.Struct({
  id: S.String,
  text: S.String,
  completed: S.Boolean,
  createdAt: S.Number,
})
type Todo = typeof Todo.Type

const Todos = S.Array(Todo)
type Todos = typeof Todos.Type

const Filter = S.Literals(['All', 'Active', 'Completed'])
type Filter = typeof Filter.Type

export const NotEditing = ts('NotEditing')
type NotEditing = typeof NotEditing.Type

export const Editing = ts('Editing', {
  id: S.String,
  text: S.String,
})
type Editing = typeof Editing.Type

const EditingState = S.Union([NotEditing, Editing])
type EditingState = typeof EditingState.Type

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
export const SavedTodos = m('SavedTodos', { todos: Todos })

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
  SavedTodos,
])
export type Message = typeof Message.Type

// FLAGS

export const Flags = S.Struct({
  todos: S.Option(Todos),
})
export type Flags = typeof Flags.Type

// INIT

export const init: Runtime.ProgramInit<Model, Message, Flags> = flags => [
  {
    todos: Option.getOrElse(flags.todos, () => []),
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

        const updatedTodos = [...model.todos, newTodo]

        return [
          evo(model, {
            todos: () => updatedTodos,
            newTodoText: () => '',
          }),
          [SaveTodos({ todos: updatedTodos })],
        ]
      },

      DeletedTodo: ({ id }) => {
        const updatedTodos = Array.filter(model.todos, todo => todo.id !== id)

        return [
          evo(model, {
            todos: () => updatedTodos,
          }),
          [SaveTodos({ todos: updatedTodos })],
        ]
      },

      ToggledTodo: ({ id }) => {
        const updatedTodos = Array.map(model.todos, todo =>
          todo.id === id
            ? evo(todo, { completed: completed => !completed })
            : todo,
        )

        return [
          evo(model, {
            todos: () => updatedTodos,
          }),
          [SaveTodos({ todos: updatedTodos })],
        ]
      },

      StartedEditing: ({ id }) => {
        const todo = Array.findFirst(model.todos, t => t.id === id)
        return [
          evo(model, {
            editing: () =>
              Editing({
                id,
                text: Option.match(todo, {
                  onNone: () => '',
                  onSome: t => t.text,
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

              const updatedTodos = Array.map(model.todos, todo =>
                todo.id === id
                  ? evo(todo, { text: () => String.trim(text) })
                  : todo,
              )

              return [
                evo(model, {
                  todos: () => updatedTodos,
                  editing: () => NotEditing(),
                }),
                [SaveTodos({ todos: updatedTodos })],
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
        const updatedTodos = Array.map(model.todos, todo =>
          evo(todo, {
            completed: () => !allCompleted,
          }),
        )

        return [
          evo(model, {
            todos: () => updatedTodos,
          }),
          [SaveTodos({ todos: updatedTodos })],
        ]
      },

      ClearedCompleted: () => {
        const updatedTodos = Array.filter(model.todos, todo => !todo.completed)

        return [
          evo(model, {
            todos: () => updatedTodos,
          }),
          [SaveTodos({ todos: updatedTodos })],
        ]
      },

      SelectedFilter: ({ filter }) => [
        evo(model, {
          filter: () => filter,
        }),
        [],
      ],

      SavedTodos: ({ todos }) => [
        evo(model, {
          todos: () => todos,
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
    const id = yield* Random.nextIntBetween(0, Number.MAX_SAFE_INTEGER).pipe(
      Effect.map(value => value.toString(36)),
    )
    const timestamp = yield* Clock.currentTimeMillis
    return GeneratedTodo({ id, timestamp, text })
  }),
)

export const SaveTodos = Command.define(
  'SaveTodos',
  { todos: Todos },
  SavedTodos,
)(({ todos }) =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(
      TODOS_STORAGE_KEY,
      S.encodeSync(S.fromJsonString(Todos))(todos),
    )
    return SavedTodos({ todos })
  }).pipe(
    Effect.catch(() => Effect.succeed(SavedTodos({ todos }))),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)

// VIEW

const editingTextFor = (
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

const todoItemView = (
  todo: Todo,
  maybeEditingText: Option.Option<string>,
): Html =>
  Option.match(maybeEditingText, {
    onNone: () => nonEditingTodoView(todo),
    onSome: text => editingTodoView(todo, text),
  })

const editingTodoView = (todo: Todo, text: string): Html => {
  const h = html<Message>()

  return h.keyed('li')(
    `${todo.id}:editing`,
    [h.Class('flex items-center gap-3 p-3 bg-gray-50 rounded-lg')],
    [
      h.input([
        h.Type('text'),
        h.Id(`edit-${todo.id}`),
        h.AriaLabel('Edit todo'),
        h.Value(text),
        h.Class(
          'flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
        ),
        h.OnInput(text => UpdatedEditingTodo({ text })),
      ]),
      h.button(
        [
          h.OnClick(SavedEdit()),
          h.Class(
            'px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600',
          ),
        ],
        ['Save'],
      ),
      h.button(
        [
          h.OnClick(CancelledEdit()),
          h.Class('px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600'),
        ],
        ['Cancel'],
      ),
    ],
  )
}

const nonEditingTodoView = (todo: Todo): Html => {
  const h = html<Message>()

  return h.keyed('li')(
    `${todo.id}:viewing`,
    [h.Class('flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group')],
    [
      h.input([
        h.Type('checkbox'),
        h.Id(`todo-${todo.id}`),
        h.AriaLabel(todo.text),
        h.Value(todo.completed ? 'on' : ''),
        h.Class('w-4 h-4 text-blue-600 rounded focus:ring-blue-500'),
        h.OnClick(ToggledTodo({ id: todo.id })),
      ]),
      h.span(
        [
          h.Class(
            `flex-1 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`,
          ),
          h.OnClick(StartedEditing({ id: todo.id })),
        ],
        [todo.text],
      ),
      h.button(
        [
          h.OnClick(DeletedTodo({ id: todo.id })),
          h.AriaLabel(`Delete ${todo.text}`),
          h.Class(
            'px-2 py-1 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-opacity',
          ),
        ],
        ['×'],
      ),
    ],
  )
}

const filterButtonView =
  (model: Model) =>
  (filter: Filter, label: string): Html => {
    const h = html<Message>()

    return h.button(
      [
        h.OnClick(SelectedFilter({ filter })),
        h.Class(
          `px-3 py-1 rounded ${
            model.filter === filter
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`,
        ),
      ],
      [label],
    )
  }

const footerView = (
  model: Model,
  activeCount: number,
  completedCount: number,
): Html => {
  const h = html<Message>()

  return Array.match(model.todos, {
    onEmpty: () => h.empty,
    onNonEmpty: () =>
      h.div(
        [h.Class('flex flex-col gap-4')],
        [
          h.div(
            [h.Class('text-sm text-gray-600 text-center'), h.Role('status')],
            [`${activeCount} active, ${completedCount} completed`],
          ),

          h.div(
            [h.Class('flex justify-center gap-2')],
            [
              filterButtonView(model)('All', 'All'),
              filterButtonView(model)('Active', 'Active'),
              filterButtonView(model)('Completed', 'Completed'),
            ],
          ),

          h.div(
            [h.Class('flex justify-center gap-2')],
            [
              Array.match(model.todos, {
                onEmpty: () => h.empty,
                onNonEmpty: todos =>
                  h.button(
                    [
                      h.OnClick(ToggledAll()),
                      h.Class(
                        'px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300',
                      ),
                    ],
                    [
                      Array.every(todos, t => t.completed)
                        ? 'Mark all active'
                        : 'Mark all complete',
                    ],
                  ),
              }),

              completedCount > 0
                ? h.button(
                    [
                      h.OnClick(ClearedCompleted()),
                      h.Class(
                        'px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200',
                      ),
                    ],
                    [`Clear ${completedCount} completed`],
                  )
                : h.empty,
            ],
          ),
        ],
      ),
  })
}

const filterTodos = (todos: Todos, filter: Filter): Todos =>
  M.value(filter).pipe(
    M.when('All', () => todos),
    M.when('Active', () => Array.filter(todos, todo => !todo.completed)),
    M.when('Completed', () => Array.filter(todos, todo => todo.completed)),
    M.exhaustive,
  )

export const view = (model: Model): Document => {
  const h = html<Message>()

  const filteredTodos = filterTodos(model.todos, model.filter)
  const activeCount = Array.length(
    Array.filter(model.todos, todo => !todo.completed),
  )
  const completedCount = Array.length(model.todos) - activeCount

  const body = h.div(
    [h.Class('min-h-screen bg-gray-100 py-8')],
    [
      h.div(
        [h.Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          h.h1(
            [h.Class('text-3xl font-bold text-gray-800 text-center mb-8')],
            ['Todo App'],
          ),

          h.form(
            [h.Class('mb-6'), h.OnSubmit(AddedTodo())],
            [
              h.label([h.For('new-todo'), h.Class('sr-only')], ['New todo']),
              h.div(
                [h.Class('flex gap-3')],
                [
                  h.input([
                    h.Id('new-todo'),
                    h.Value(model.newTodoText),
                    h.Placeholder('What needs to be done?'),
                    h.Class(
                      'flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                    ),
                    h.OnInput(text => UpdatedNewTodo({ text })),
                  ]),
                  h.button(
                    [
                      h.Type('submit'),
                      h.Class(
                        'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500',
                      ),
                    ],
                    ['Add'],
                  ),
                ],
              ),
            ],
          ),

          Array.match(filteredTodos, {
            onEmpty: () =>
              h.div(
                [h.Class('text-center text-gray-500 py-8')],
                [
                  M.value(model.filter).pipe(
                    M.when('All', () => 'No todos yet. Add one above!'),
                    M.when('Active', () => 'No active todos'),
                    M.when('Completed', () => 'No completed todos'),
                    M.exhaustive,
                  ),
                ],
              ),
            onNonEmpty: todos =>
              h.ul(
                [h.Class('space-y-2 mb-6')],
                Array.map(todos, todo =>
                  todoItemView(todo, editingTextFor(model.editing, todo.id)),
                ),
              ),
          }),

          footerView(model, activeCount, completedCount),
        ],
      ),
    ],
  )

  return { title: `Todos (${activeCount})`, body }
}

// FLAG

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const todosJson = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(TODOS_STORAGE_KEY)),
  )

  const decodeTodos = S.decodeEffect(S.fromJsonString(Todos))
  const todos = yield* decodeTodos(todosJson)

  return { todos: Option.some(todos) }
}).pipe(
  Effect.catch(() => Effect.succeed({ todos: Option.none() })),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)
