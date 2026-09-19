import clsx from 'clsx'
import {
  Array,
  Clock,
  Crypto,
  Effect,
  Match,
  Option,
  Schema,
  Stream,
  String,
  pipe,
} from 'effect'
import { Command, Runtime, Subscription, type Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { BrowserCrypto } from '@effect/platform-browser'
import { Button, Checkbox, Input } from '@foldkit/ui'

import { Item, Items, events } from './schema'
import {
  ItemsStore,
  type ItemsStoreRequirements,
  orderedItemsQuery,
} from './store'

// MODEL

const Filter = Schema.Literals(['All', 'Active', 'Completed'])
type Filter = typeof Filter.Type

export const Model = Schema.Struct({
  items: Items,
  maybeAddItemError: Schema.Option(Schema.String),
  newItemText: Schema.String,
  filter: Filter,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedNewItemText: { text: Schema.String },
  SubmittedNewItem: {},

  SelectedFilter: { filter: Filter },

  ClickedToggleItem: { id: Schema.String },
  ClickedDeleteItem: { id: Schema.String },
  ClickedClearCompleted: {},

  SucceededAddItem: {},
  FailedAddItem: { error: Schema.String },

  CompletedToggleItem: {},
  CompletedDeleteItem: {},
  CompletedClearCompleted: {},

  ReceivedItems: { items: Items },
})
export type Message = typeof Message.Type

// FLAGS

export const Flags = Schema.Struct({
  items: Items,
})
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags, never, ItemsStoreRequirements> =
  Effect.gen(function* () {
    const items = yield* ItemsStore.query(orderedItemsQuery)

    return Flags.make({ items })
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message, Flags> = flags => ({
  model: {
    items: flags.items,
    maybeAddItemError: Option.none(),
    newItemText: '',
    filter: 'All',
  },
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message, ItemsStoreRequirements>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedNewItemText: ({ text }) => ({
      model: modifyFields(model, {
        newItemText: () => text,
      }),
    }),

    SubmittedNewItem: () => {
      const trimmed = String.trim(model.newItemText)

      if (String.isEmpty(trimmed)) {
        return { model }
      }

      return {
        model: modifyFields(model, {
          maybeAddItemError: () => Option.none(),
          newItemText: () => '',
        }),
        commands: [AddItem({ text: trimmed })],
      }
    },

    SelectedFilter: ({ filter }) => ({
      model: modifyFields(model, {
        filter: () => filter,
      }),
    }),

    ClickedToggleItem: ({ id }) => ({
      model,
      commands: [ToggleItem({ id })],
    }),

    ClickedDeleteItem: ({ id }) => ({
      model,
      commands: [DeleteItem({ id })],
    }),

    ClickedClearCompleted: () => ({
      model,
      commands: [ClearCompleted()],
    }),

    SucceededAddItem: () => ({ model }),
    FailedAddItem: ({ error }) => ({
      model: modifyFields(model, {
        maybeAddItemError: () => Option.some(error),
      }),
    }),

    CompletedToggleItem: () => ({ model }),
    CompletedDeleteItem: () => ({ model }),
    CompletedClearCompleted: () => ({ model }),

    ReceivedItems: ({ items }) => ({
      model: modifyFields(model, {
        items: () => items,
      }),
    }),
  })

// COMMAND

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong'

export const AddItem = Command.define('AddItem', {
  args: { text: Schema.String },
  messages: [Message.SucceededAddItem, Message.FailedAddItem],
  execute: ({ text }) =>
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto
      const id = yield* crypto.randomUUIDv4
      const createdAt = yield* Clock.currentTimeMillis
      yield* ItemsStore.commit(
        events.itemAdded({ id, text, completed: false, createdAt }),
      )

      return Message.SucceededAddItem()
    }).pipe(
      Effect.provide(BrowserCrypto.layer),
      Effect.catch(error =>
        Effect.succeed(Message.FailedAddItem({ error: describeError(error) })),
      ),
    ),
})

export const ToggleItem = Command.define('ToggleItem', {
  args: { id: Schema.String },
  messages: [Message.CompletedToggleItem],
  execute: ({ id }) =>
    Effect.gen(function* () {
      yield* ItemsStore.commit(events.itemToggled({ id }))

      return Message.CompletedToggleItem()
    }),
})

export const DeleteItem = Command.define('DeleteItem', {
  args: { id: Schema.String },
  messages: [Message.CompletedDeleteItem],
  execute: ({ id }) =>
    Effect.gen(function* () {
      yield* ItemsStore.commit(events.itemDeleted({ id }))

      return Message.CompletedDeleteItem()
    }),
})

export const ClearCompleted = Command.define('ClearCompleted', {
  messages: [Message.CompletedClearCompleted],
  execute: Effect.gen(function* () {
    yield* ItemsStore.commit(events.completedItemsCleared({}))

    return Message.CompletedClearCompleted()
  }),
})

// SUBSCRIPTION

const receivedItemsMessageStream: Stream.Stream<
  typeof Message.ReceivedItems.Type,
  never,
  ItemsStoreRequirements
> = Stream.unwrap(
  Effect.gen(function* () {
    const { store } = yield* ItemsStore

    return store
      .subscribeStream(orderedItemsQuery)
      .pipe(Stream.map(items => Message.ReceivedItems({ items })))
  }),
)

export const subscriptions = Subscription.make<
  Model,
  Message,
  ItemsStoreRequirements
>()(() => ({
  items: Subscription.persistent(receivedItemsMessageStream),
}))

// VIEW

const filterItems = (items: Items, filter: Filter): Items =>
  Match.value(filter).pipe(
    Match.when('All', () => items),
    Match.when('Active', () => Array.filter(items, item => !item.completed)),
    Match.when('Completed', () => Array.filter(items, item => item.completed)),
    Match.exhaustive,
  )

const headerView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('mb-6 text-center')],
    [
      h.h1([h.Class('text-3xl font-bold text-gray-800')], ['LiveStore']),
      h.p(
        [h.Class('mt-2 text-sm text-gray-500')],
        [
          'Persisted locally with LiveStore. Open this page in a second tab and watch changes appear in both.',
        ],
      ),
    ],
  )

const newItemFormView = (newItemText: string, h: HtmlBuilder<Message>): Html =>
  h.form(
    [h.Class('mb-6'), h.OnSubmit(Message.SubmittedNewItem())],
    [
      h.div(
        [h.Class('flex gap-3')],
        [
          Input.view(
            {
              id: 'new-item',
              value: newItemText,
              placeholder: 'Add a task...',
              onInput: text => Message.UpdatedNewItemText({ text }),
              toView: attributes =>
                h.input([
                  ...attributes.input,
                  h.AriaLabel('New task'),
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
  )

const addItemErrorView = (error: string, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Class('bg-red-50 border border-red-200 rounded-lg p-4 mb-4'),
      h.Role('alert'),
    ],
    [
      h.p([h.Class('text-red-800 font-semibold mb-1')], ['Could not add task']),
      h.p([h.Class('text-red-600 text-sm')], [error]),
    ],
  )

const checkboxBoxClassName = (isChecked: boolean): string =>
  clsx(
    'flex h-4 w-4 items-center justify-center rounded border transition cursor-pointer',
    isChecked ? 'border-blue-600 bg-blue-600' : 'border-gray-300',
  )

const itemView = (item: Item, h: HtmlBuilder<Message>): Html =>
  h.keyed('li')(
    item.id,
    [h.Class('flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group')],
    [
      Checkbox.view(
        {
          id: `item-${item.id}`,
          isChecked: item.completed,
          onToggle: () => Message.ClickedToggleItem({ id: item.id }),
          toView: attributes =>
            h.div(
              [h.Class('flex items-center')],
              [
                h.div(
                  [
                    ...attributes.checkbox,
                    h.Class(checkboxBoxClassName(item.completed)),
                  ],
                  item.completed
                    ? [h.span([h.Class('text-white text-xs')], ['✓'])]
                    : [],
                ),
                h.span([...attributes.label, h.AriaLabel(item.text)]),
              ],
            ),
        },
        h,
      ),
      h.span(
        [
          h.Class(
            clsx(
              'flex-1',
              item.completed ? 'line-through text-gray-500' : 'text-gray-900',
            ),
          ),
        ],
        [item.text],
      ),
      Button.view(
        {
          onClick: Message.ClickedDeleteItem({ id: item.id }),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.AriaLabel(`Delete ${item.text}`),
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

const emptyView = (filter: Filter, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('text-center text-gray-500 py-8')],
    [
      Match.value(filter).pipe(
        Match.when('All', () => 'No tasks yet. Add one above!'),
        Match.when('Active', () => 'No active tasks'),
        Match.when('Completed', () => 'No completed tasks'),
        Match.exhaustive,
      ),
    ],
  )

const filterButtonView = (
  selectedFilter: Filter,
  filter: Filter,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick: Message.SelectedFilter({ filter }),
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Class(
              clsx(
                'px-3 py-1 rounded',
                selectedFilter === filter
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
              ),
            ),
          ],
          [filter],
        ),
    },
    h,
  )

const footerView = (
  filter: Filter,
  activeCount: number,
  completedCount: number,
  h: HtmlBuilder<Message>,
): Html =>
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
          filterButtonView(filter, 'All', h),
          filterButtonView(filter, 'Active', h),
          filterButtonView(filter, 'Completed', h),
        ],
      ),
      completedCount > 0
        ? h.div(
            [h.Class('flex justify-center')],
            [
              Button.view(
                {
                  onClick: Message.ClickedClearCompleted(),
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
              ),
            ],
          )
        : h.empty,
    ],
  )

const itemsView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const visibleItems = filterItems(model.items, model.filter)
  const activeCount = pipe(
    model.items,
    Array.filter(item => !item.completed),
    Array.length,
  )
  const completedCount = Array.length(model.items) - activeCount

  return h.div(
    [],
    [
      Array.match(visibleItems, {
        onEmpty: () => emptyView(model.filter, h),
        onNonEmpty: visibleItems =>
          h.ul(
            [h.Class('space-y-2 mb-6')],
            Array.map(visibleItems, item => itemView(item, h)),
          ),
      }),
      footerView(model.filter, activeCount, completedCount, h),
    ],
  )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const body = h.div(
    [h.Class('min-h-screen bg-gray-100 py-8')],
    [
      h.div(
        [h.Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          headerView(h),
          newItemFormView(model.newItemText, h),
          Option.match(model.maybeAddItemError, {
            onNone: () => h.empty,
            onSome: error => addItemErrorView(error, h),
          }),
          itemsView(model, h),
        ],
      ),
    ],
  )

  return { title: 'LiveStore', body }
}
