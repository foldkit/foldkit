import clsx from 'clsx'
import { Array, Match, Option } from 'effect'
import { Html } from 'foldkit/html'

import { Button, Checkbox, Input } from '@foldkit/ui'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
} from './composition'
import { Message } from './message'
import {
  EditingState,
  type Filter,
  type Model,
  type Todo,
  type Todos,
} from './model'

const editingTextFor = (
  editing: EditingState,
  todoId: string,
): Option.Option<string> =>
  EditingState.match(editing, {
    NotEditing: () => Option.none(),
    Editing: ({ id, text }) => Option.liftPredicate(text, () => id === todoId),
  })

const todoItemView = (
  todo: Todo,
  maybeEditingText: Option.Option<string>,
  h: ApplicationViewBuilder,
): Html =>
  Option.match(maybeEditingText, {
    onNone: () => nonEditingTodoView(todo, h),
    onSome: text => editingTodoView(todo, text, h),
  })

const editingTodoView = (
  todo: Todo,
  text: string,
  h: ApplicationViewBuilder,
): Html =>
  h.keyed('li')(
    todo.id,
    [h.Class('flex items-center gap-3 p-3 bg-gray-50 rounded-lg')],
    [
      Input.view(
        {
          id: `edit-${todo.id}`,
          value: text,
          onInput: text => Message.UpdatedEditingTodo({ text }),
          toView: attributes =>
            h.input([
              ...attributes.input,
              h.AriaLabel('Edit todo'),
              h.Class(
                'flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
              ),
            ]),
        },
        h,
      ),
      Button.view(
        {
          onClick: Message.SavedEdit(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600',
                ),
              ],
              ['Save'],
            ),
        },
        h,
      ),
      Button.view(
        {
          onClick: Message.CancelledEdit(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600',
                ),
              ],
              ['Cancel'],
            ),
        },
        h,
      ),
    ],
  )

const checkboxBoxClassName = (isChecked: boolean): string =>
  clsx(
    'flex h-4 w-4 items-center justify-center rounded border transition cursor-pointer',
    isChecked ? 'border-blue-600 bg-blue-600' : 'border-gray-300',
  )

const nonEditingTodoView = (todo: Todo, h: ApplicationViewBuilder): Html =>
  h.keyed('li')(
    todo.id,
    [h.Class('flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group')],
    [
      Checkbox.view(
        {
          id: `todo-${todo.id}`,
          isChecked: todo.completed,
          onToggle: () => Message.ToggledTodo({ id: todo.id }),
          toView: attributes =>
            h.div(
              [h.Class('flex items-center')],
              [
                h.div(
                  [
                    ...attributes.checkbox,
                    h.Class(checkboxBoxClassName(todo.completed)),
                  ],
                  todo.completed
                    ? [h.span([h.Class('text-white text-xs')], ['✓'])]
                    : [],
                ),
                h.span([...attributes.label, h.AriaLabel(todo.text)]),
              ],
            ),
        },
        h,
      ),
      h.span(
        [
          h.Class(
            `flex-1 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`,
          ),
          h.OnClick(Message.StartedEditing({ id: todo.id })),
        ],
        [todo.text],
      ),
      Button.view(
        {
          onClick: Message.DeletedTodo({ id: todo.id }),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.AriaLabel(`Delete ${todo.text}`),
                h.Class(
                  'px-2 py-1 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-opacity',
                ),
              ],
              ['×'],
            ),
        },
        h,
      ),
    ],
  )

const filterButtonView =
  (model: Model) =>
  (filter: Filter, label: string, h: ApplicationViewBuilder): Html =>
    Button.view(
      {
        onClick: Message.SelectedFilter({ filter }),
        toView: attributes =>
          h.button(
            [
              ...attributes.button,
              h.Class(
                `px-3 py-1 rounded ${
                  model.filter === filter
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`,
              ),
            ],
            [label],
          ),
      },
      h,
    )

const footerView = (
  model: Model,
  activeCount: number,
  completedCount: number,
  h: ApplicationViewBuilder,
): Html =>
  Array.match(model.todos, {
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
              filterButtonView(model)('All', 'All', h),
              filterButtonView(model)('Active', 'Active', h),
              filterButtonView(model)('Completed', 'Completed', h),
            ],
          ),

          h.div(
            [h.Class('flex justify-center gap-2')],
            [
              Array.match(model.todos, {
                onEmpty: () => h.empty,
                onNonEmpty: todos =>
                  Button.view(
                    {
                      onClick: Message.ToggledAll(),
                      toView: attributes =>
                        h.button(
                          [
                            ...attributes.button,
                            h.Class(
                              'px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300',
                            ),
                          ],
                          [
                            Array.every(todos, todo => todo.completed)
                              ? 'Mark all active'
                              : 'Mark all complete',
                          ],
                        ),
                    },
                    h,
                  ),
              }),

              completedCount > 0
                ? Button.view(
                    {
                      onClick: Message.ClearedCompleted(),
                      toView: attributes =>
                        h.button(
                          [
                            ...attributes.button,
                            h.Class(
                              'px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200',
                            ),
                          ],
                          [`Clear ${completedCount} completed`],
                        ),
                    },
                    h,
                  )
                : h.empty,
            ],
          ),
        ],
      ),
  })

const filterTodos = (todos: Todos, filter: Filter): Todos =>
  Match.value(filter).pipe(
    Match.when('All', () => todos),
    Match.when('Active', () => Array.filter(todos, todo => !todo.completed)),
    Match.when('Completed', () => Array.filter(todos, todo => todo.completed)),
    Match.exhaustive,
  )

export const view = ApplicationComposition.makeView((model, h) => {
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
            [h.Class('mb-6'), h.OnSubmit(Message.AddedTodo())],
            [
              h.div(
                [h.Class('flex gap-3')],
                [
                  Input.view(
                    {
                      id: 'new-todo',
                      value: model.newTodoText,
                      placeholder: 'What needs to be done?',
                      onInput: text => Message.UpdatedNewTodo({ text }),
                      toView: attributes =>
                        h.input([
                          ...attributes.input,
                          h.AriaLabel('New todo'),
                          h.Class(
                            'flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                          ),
                        ]),
                    },
                    h,
                  ),
                  Button.view(
                    {
                      type: 'submit',
                      toView: attributes =>
                        h.button(
                          [
                            ...attributes.button,
                            h.Class(
                              'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500',
                            ),
                          ],
                          ['Add'],
                        ),
                    },
                    h,
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
                  Match.value(model.filter).pipe(
                    Match.when('All', () => 'No todos yet. Add one above!'),
                    Match.when('Active', () => 'No active todos'),
                    Match.when('Completed', () => 'No completed todos'),
                    Match.exhaustive,
                  ),
                ],
              ),
            onNonEmpty: todos =>
              h.ul(
                [h.Class('space-y-2 mb-6')],
                Array.map(todos, todo =>
                  todoItemView(todo, editingTextFor(model.editing, todo.id), h),
                ),
              ),
          }),

          footerView(model, activeCount, completedCount, h),
        ],
      ),
    ],
  )

  return { title: `Todos (${activeCount})`, body }
})
