import { KeyValueStore } from 'effect/unstable/http'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import {
  Array,
  Clock,
  Effect,
  Match as M,
  Option,
  Schema as S,
  String,
} from 'effect'
import { Command, Runtime, Task } from 'foldkit'
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

const Flags = S.Struct({
  todos: S.Option(Todos),
})
type Flags = typeof Flags.Type

// INIT

const init: Runtime.ProgramInit<Model, Message, Flags> = flags => [
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

        return [model, [generateTodo(String.trim(model.newTodoText))]]
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
          [saveTodos(updatedTodos)],
        ]
      },

      DeletedTodo: ({ id }) => {
        const updatedTodos = Array.filter(model.todos, todo => todo.id !== id)

        return [
          evo(model, {
            todos: () => updatedTodos,
          }),
          [saveTodos(updatedTodos)],
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
          [saveTodos(updatedTodos)],
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
            readonly [Model, Command.Command<typeof SavedTodos>[]]
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
                [saveTodos(updatedTodos)],
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
          [saveTodos(updatedTodos)],
        ]
      },

      ClearedCompleted: () => {
        const updatedTodos = Array.filter(model.todos, todo => !todo.completed)

        return [
          evo(model, {
            todos: () => updatedTodos,
          }),
          [saveTodos(updatedTodos)],
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

export const GenerateTodo = Command.define('GenerateTodo', GeneratedTodo)
export const SaveTodos = Command.define('SaveTodos', SavedTodos)

const generateTodo = (text: string) =>
  GenerateTodo(
    Effect.gen(function* () {
      const id = yield* Task.randomInt(0, Number.MAX_SAFE_INTEGER).pipe(
        Effect.map(value => value.toString(36)),
      )
      const timestamp = yield* Clock.currentTimeMillis
      return GeneratedTodo({ id, timestamp, text })
    }),
  )

const saveTodos = (todos: Todos) =>
  SaveTodos(
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

const {
  button,
  div,
  empty,
  form,
  h1,
  input,
  label,
  li,
  span,
  ul,
  AriaLabel,
  Class,
  For,
  Id,
  OnClick,
  OnInput,
  OnSubmit,
  Placeholder,
  Role,
  Type,
  Value,
} = html<Message>()

const todoItemView =
  (model: Model) =>
  (todo: Todo): Html =>
    M.value(model.editing).pipe(
      M.tagsExhaustive({
        NotEditing: () => nonEditingTodoView(todo),
        Editing: ({ id, text }) =>
          id === todo.id
            ? editingTodoView(todo, text)
            : nonEditingTodoView(todo),
      }),
    )

const editingTodoView = (todo: Todo, text: string): Html =>
  li(
    [Class('flex items-center gap-3 p-3 bg-gray-50 rounded-lg')],
    [
      input([
        Type('text'),
        Id(`edit-${todo.id}`),
        AriaLabel('Edit todo'),
        Value(text),
        Class(
          'flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
        ),
        OnInput(text => UpdatedEditingTodo({ text })),
      ]),
      button(
        [
          OnClick(SavedEdit()),
          Class('px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600'),
        ],
        ['Save'],
      ),
      button(
        [
          OnClick(CancelledEdit()),
          Class('px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600'),
        ],
        ['Cancel'],
      ),
    ],
  )

const nonEditingTodoView = (todo: Todo): Html =>
  li(
    [Class('flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group')],
    [
      input([
        Type('checkbox'),
        Id(`todo-${todo.id}`),
        AriaLabel(todo.text),
        Value(todo.completed ? 'on' : ''),
        Class('w-4 h-4 text-blue-600 rounded focus:ring-blue-500'),
        OnClick(ToggledTodo({ id: todo.id })),
      ]),
      span(
        [
          Class(
            `flex-1 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`,
          ),
          OnClick(StartedEditing({ id: todo.id })),
        ],
        [todo.text],
      ),
      button(
        [
          OnClick(DeletedTodo({ id: todo.id })),
          AriaLabel(`Delete ${todo.text}`),
          Class(
            'px-2 py-1 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-opacity',
          ),
        ],
        ['\u00d7'],
      ),
    ],
  )

const filterButtonView =
  (model: Model) =>
  (filter: Filter, label: string): Html =>
    button(
      [
        OnClick(SelectedFilter({ filter })),
        Class(
          `px-3 py-1 rounded ${
            model.filter === filter
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`,
        ),
      ],
      [label],
    )

const footerView = (
  model: Model,
  activeCount: number,
  completedCount: number,
): Html =>
  Array.match(model.todos, {
    onEmpty: () => empty,
    onNonEmpty: () =>
      div(
        [Class('flex flex-col gap-4')],
        [
          div(
            [Class('text-sm text-gray-600 text-center'), Role('status')],
            [`${activeCount} active, ${completedCount} completed`],
          ),

          div(
            [Class('flex justify-center gap-2')],
            [
              filterButtonView(model)('All', 'All'),
              filterButtonView(model)('Active', 'Active'),
              filterButtonView(model)('Completed', 'Completed'),
            ],
          ),

          div(
            [Class('flex justify-center gap-2')],
            [
              Array.match(model.todos, {
                onEmpty: () => empty,
                onNonEmpty: todos =>
                  button(
                    [
                      OnClick(ToggledAll()),
                      Class(
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
                ? button(
                    [
                      OnClick(ClearedCompleted()),
                      Class(
                        'px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200',
                      ),
                    ],
                    [`Clear ${completedCount} completed`],
                  )
                : empty,
            ],
          ),
        ],
      ),
  })

const filterTodos = (todos: Todos, filter: Filter): Todos =>
  M.value(filter).pipe(
    M.when('All', () => todos),
    M.when('Active', () => Array.filter(todos, todo => !todo.completed)),
    M.when('Completed', () => Array.filter(todos, todo => todo.completed)),
    M.exhaustive,
  )

export const view = (model: Model): Document => {
  const filteredTodos = filterTodos(model.todos, model.filter)
  const activeCount = Array.length(
    Array.filter(model.todos, todo => !todo.completed),
  )
  const completedCount = Array.length(model.todos) - activeCount

  const body = div(
    [Class('min-h-screen bg-gray-100 py-8')],
    [
      div(
        [Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          h1(
            [Class('text-3xl font-bold text-gray-800 text-center mb-8')],
            ['Todo App'],
          ),

          form(
            [Class('mb-6'), OnSubmit(AddedTodo())],
            [
              label([For('new-todo'), Class('sr-only')], ['New todo']),
              div(
                [Class('flex gap-3')],
                [
                  input([
                    Id('new-todo'),
                    Value(model.newTodoText),
                    Placeholder('What needs to be done?'),
                    Class(
                      'flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                    ),
                    OnInput(text => UpdatedNewTodo({ text })),
                  ]),
                  button(
                    [
                      Type('submit'),
                      Class(
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
              div(
                [Class('text-center text-gray-500 py-8')],
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
              ul(
                [Class('space-y-2 mb-6')],
                Array.map(todos, todoItemView(model)),
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

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const maybeTodosJson = yield* store.get(TODOS_STORAGE_KEY)
  const todosJson = yield* maybeTodosJson

  const decodeTodos = S.decodeEffect(S.fromJsonString(Todos))
  const todos = yield* decodeTodos(todosJson)

  return { todos: Option.some(todos) }
}).pipe(
  Effect.catch(() => Effect.succeed({ todos: Option.none() })),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// RUN

const program = Runtime.makeProgram({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  devTools: {
    Message,
  },
})

Runtime.run(program)
