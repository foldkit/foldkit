import clsx from 'clsx'
import {
  Array,
  Clock,
  Crypto,
  Effect,
  Layer,
  Match as M,
  Option,
  Queue,
  Schema as S,
  Stream,
  String,
} from 'effect'
import { AsyncData, Command, Runtime, Subscription } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import {
  BrowserCrypto,
  IndexedDb,
  IndexedDbDatabase,
  IndexedDbTable,
  IndexedDbVersion,
} from '@effect/platform-browser'
import { Button, Checkbox, Input } from '@foldkit/ui'

// CONSTANT

const DATABASE_NAME = 'foldkit-cross-tab-tasks'
const OBJECT_STORE = 'items'
const BROADCAST_CHANNEL_NAME = 'foldkit-cross-tab-tasks-changes'
const STORE_CHANGED = 'StoreChanged'

// MODEL

const Item = S.Struct({
  id: S.String,
  text: S.String,
  completed: S.Boolean,
  createdAt: S.Number,
})
type Item = typeof Item.Type

const Items = S.Array(Item)
type Items = typeof Items.Type

const ItemsData = AsyncData.Schema(Items, S.String)

const Filter = S.Literals(['All', 'Active', 'Completed'])
type Filter = typeof Filter.Type

export const Model = S.Struct({
  items: ItemsData.schema,
  newItemText: S.String,
  filter: Filter,
})
export type Model = typeof Model.Type

// STORE

class ItemsTable extends IndexedDbTable.make({
  name: OBJECT_STORE,
  schema: Item,
  keyPath: 'id',
}) {}

class StoreV1 extends IndexedDbVersion.make(ItemsTable) {}

class Store extends IndexedDbDatabase.make(
  StoreV1,
  Effect.fn(function* (query) {
    yield* query.createObjectStore(OBJECT_STORE)
  }),
) {}

type StoreService = IndexedDbDatabase.IndexedDbDatabase

/** The Layer that opens the IndexedDB database once and shares it with every
 *  Command and Subscription for the application's lifetime. Passed to
 *  `makeApplication` as `resources`. `Layer.orDie` turns a failure to open the
 *  database into a defect: if the store cannot be constructed, no Command that
 *  reads or writes it is safe to run. */
export const resources: Layer.Layer<StoreService> = Store.layer(
  DATABASE_NAME,
).pipe(Layer.provide(IndexedDb.layerWindow), Layer.orDie)

// MESSAGE

export const UpdatedNewItemText = m('UpdatedNewItemText', { text: S.String })
export const SubmittedNewItem = m('SubmittedNewItem')
export const SelectedFilter = m('SelectedFilter', { filter: Filter })
export const ClickedToggleItem = m('ClickedToggleItem', { id: S.String })
export const ClickedDeleteItem = m('ClickedDeleteItem', { id: S.String })
export const ClickedClearCompleted = m('ClickedClearCompleted')
export const ClickedRetry = m('ClickedRetry')
export const NotifiedStoreChanged = m('NotifiedStoreChanged')
export const CommittedToStore = m('CommittedToStore')
export const ReceivedItems = m('ReceivedItems', { items: Items })
export const FailedStoreOperation = m('FailedStoreOperation', {
  error: S.String,
})

export const Message = S.Union([
  UpdatedNewItemText,
  SubmittedNewItem,
  SelectedFilter,
  ClickedToggleItem,
  ClickedDeleteItem,
  ClickedClearCompleted,
  ClickedRetry,
  NotifiedStoreChanged,
  CommittedToStore,
  ReceivedItems,
  FailedStoreOperation,
])
export type Message = typeof Message.Type

type Commands = ReadonlyArray<Command.Command<Message, never, StoreService>>

// INIT

export const init: Runtime.ApplicationInit<
  Model,
  Message,
  void,
  StoreService
> = () => [
  {
    items: ItemsData.Loading(),
    newItemText: '',
    filter: 'All',
  },
  [LoadItems()],
]

// UPDATE

const toErrorState = (
  items: AsyncData.AsyncData<Items, string>,
  error: string,
): AsyncData.AsyncData<Items, string> =>
  Option.match(AsyncData.getData(items), {
    onNone: () => ItemsData.Failure({ error }),
    onSome: data => ItemsData.Stale({ data, error }),
  })

export const update = (
  model: Model,
  message: Message,
): readonly [Model, Commands] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, Commands]>(),
    M.tagsExhaustive({
      UpdatedNewItemText: ({ text }) => [
        evo(model, {
          newItemText: () => text,
        }),
        [],
      ],

      SubmittedNewItem: () => {
        const trimmed = String.trim(model.newItemText)

        if (String.isEmpty(trimmed)) {
          return [model, []]
        }

        return [
          evo(model, {
            newItemText: () => '',
          }),
          [AddItem({ text: trimmed })],
        ]
      },

      SelectedFilter: ({ filter }) => [
        evo(model, {
          filter: () => filter,
        }),
        [],
      ],

      ClickedToggleItem: ({ id }) => [model, [ToggleItem({ id })]],

      ClickedDeleteItem: ({ id }) => [model, [DeleteItem({ id })]],

      ClickedClearCompleted: () => [model, [ClearCompleted()]],

      ClickedRetry: () => [
        evo(model, {
          items: () => ItemsData.Loading(),
        }),
        [LoadItems()],
      ],

      NotifiedStoreChanged: () => [model, [LoadItems()]],

      CommittedToStore: () => [model, []],

      ReceivedItems: ({ items }) => [
        evo(model, {
          items: () => ItemsData.Success({ data: items }),
        }),
        [],
      ],

      FailedStoreOperation: ({ error }) => [
        evo(model, {
          items: () => toErrorState(model.items, error),
        }),
        [],
      ],
    }),
  )

// COMMAND

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong'

const announceChange: Effect.Effect<void> = Effect.sync(() => {
  const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
  channel.postMessage(STORE_CHANGED)
  channel.close()
})

export const LoadItems = Command.define(
  'LoadItems',
  ReceivedItems,
  FailedStoreOperation,
)(
  Effect.gen(function* () {
    const db = yield* Store
    const items = yield* db.from(OBJECT_STORE).select()
    return ReceivedItems({ items })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(FailedStoreOperation({ error: describeError(error) })),
    ),
  ),
)

export const AddItem = Command.define(
  'AddItem',
  { text: S.String },
  CommittedToStore,
  FailedStoreOperation,
)(({ text }) =>
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto
    const id = yield* Effect.orDie(crypto.randomUUIDv4)
    const createdAt = yield* Clock.currentTimeMillis
    const db = yield* Store
    yield* db
      .from(OBJECT_STORE)
      .insert({ id, text, completed: false, createdAt })
    yield* announceChange
    return CommittedToStore()
  }).pipe(
    Effect.provide(BrowserCrypto.layer),
    Effect.catch(error =>
      Effect.succeed(FailedStoreOperation({ error: describeError(error) })),
    ),
  ),
)

export const ToggleItem = Command.define(
  'ToggleItem',
  { id: S.String },
  CommittedToStore,
  FailedStoreOperation,
)(({ id }) =>
  Effect.gen(function* () {
    const db = yield* Store
    const matches = yield* db.from(OBJECT_STORE).select().equals(id)
    yield* Option.match(Array.head(matches), {
      onNone: () => Effect.void,
      onSome: item =>
        db.from(OBJECT_STORE).upsert({ ...item, completed: !item.completed }),
    })
    yield* announceChange
    return CommittedToStore()
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(FailedStoreOperation({ error: describeError(error) })),
    ),
  ),
)

export const DeleteItem = Command.define(
  'DeleteItem',
  { id: S.String },
  CommittedToStore,
  FailedStoreOperation,
)(({ id }) =>
  Effect.gen(function* () {
    const db = yield* Store
    yield* db.from(OBJECT_STORE).delete().equals(id)
    yield* announceChange
    return CommittedToStore()
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(FailedStoreOperation({ error: describeError(error) })),
    ),
  ),
)

export const ClearCompleted = Command.define(
  'ClearCompleted',
  CommittedToStore,
  FailedStoreOperation,
)(
  Effect.gen(function* () {
    const db = yield* Store
    const items = yield* db.from(OBJECT_STORE).select()
    yield* Effect.forEach(
      Array.filter(items, item => item.completed),
      item => db.from(OBJECT_STORE).delete().equals(item.id),
      { discard: true },
    )
    yield* announceChange
    return CommittedToStore()
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(FailedStoreOperation({ error: describeError(error) })),
    ),
  ),
)

// SUBSCRIPTION

// NOTE: A BroadcastChannel never receives a message it itself sent, but every
// other same-origin channel does, including sibling instances in the same tab.
// Writes post on a throwaway channel (announceChange), so this long-lived
// listener hears every commit, from this tab and every other tab alike. That
// makes it the single reactive feed: local and remote writes both arrive here
// and trigger the same reload.
const streamStoreChanges = Stream.callback<Message>(queue =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      const handleMessage = () => {
        Queue.offerUnsafe(queue, NotifiedStoreChanged())
      }
      channel.addEventListener('message', handleMessage)
      return { channel, handleMessage }
    }),
    ({ channel, handleMessage }) =>
      Effect.sync(() => {
        channel.removeEventListener('message', handleMessage)
        channel.close()
      }),
  ).pipe(Effect.flatMap(() => Effect.never)),
)

export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  storeChanges: Subscription.persistent(streamStoreChanges),
}))

// VIEW

const filterItems = (items: Items, filter: Filter): Items =>
  M.value(filter).pipe(
    M.when('All', () => items),
    M.when('Active', () => Array.filter(items, item => !item.completed)),
    M.when('Completed', () => Array.filter(items, item => item.completed)),
    M.exhaustive,
  )

export const view = (model: Model): Document => {
  const h = html<Message>()

  const body = h.div(
    [h.Class('min-h-screen bg-gray-100 py-8')],
    [
      h.div(
        [h.Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          headerView(),
          newItemFormView(model.newItemText),
          AsyncData.matchData(model.items, {
            onEmpty: () => loadingView(),
            onFailure: error => errorView(error),
            onData: items => loadedView(model, items),
          }),
        ],
      ),
    ],
  )

  return { title: 'Cross-Tab Tasks', body }
}

const headerView = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('mb-6 text-center')],
    [
      h.h1([h.Class('text-3xl font-bold text-gray-800')], ['Cross-Tab Tasks']),
      h.p(
        [h.Class('mt-2 text-sm text-gray-500')],
        [
          'Stored in IndexedDB. Open this page in a second tab and watch changes appear in both.',
        ],
      ),
    ],
  )
}

const newItemFormView = (newItemText: string): Html => {
  const h = html<Message>()

  return h.form(
    [h.Class('mb-6'), h.OnSubmit(SubmittedNewItem())],
    [
      h.div(
        [h.Class('flex gap-3')],
        [
          Input.view<Message>({
            id: 'new-item',
            value: newItemText,
            placeholder: 'Add a task...',
            onInput: text => UpdatedNewItemText({ text }),
            toView: attributes =>
              h.input([
                ...attributes.input,
                h.AriaLabel('New task'),
                h.Class(
                  'flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                ),
              ]),
          }),
          Button.view<Message>({
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
          }),
        ],
      ),
    ],
  )
}

const loadingView = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('py-8 text-center text-gray-400'), h.Role('status')],
    ['Loading...'],
  )
}

const errorView = (error: string): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('py-6')],
    [
      h.div(
        [
          h.Class('bg-red-50 border border-red-200 rounded-lg p-4 mb-4'),
          h.Role('alert'),
        ],
        [
          h.p(
            [h.Class('text-red-800 font-semibold mb-1')],
            ['Could not read the store'],
          ),
          h.p([h.Class('text-red-600 text-sm')], [error]),
        ],
      ),
      Button.view<Message>({
        onClick: ClickedRetry(),
        toView: attributes =>
          h.button(
            [
              ...attributes.button,
              h.Class(
                'w-full px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600',
              ),
            ],
            ['Try again'],
          ),
      }),
    ],
  )
}

const loadedView = (model: Model, items: Items): Html => {
  const h = html<Message>()

  const visibleItems = filterItems(items, model.filter)
  const activeCount = Array.length(Array.filter(items, item => !item.completed))
  const completedCount = Array.length(items) - activeCount

  return h.div(
    [],
    [
      Option.match(AsyncData.getError(model.items), {
        onNone: () => h.empty,
        onSome: error => staleBannerView(error),
      }),

      Array.match(visibleItems, {
        onEmpty: () => emptyView(model.filter),
        onNonEmpty: visibleItems =>
          h.ul([h.Class('space-y-2 mb-6')], Array.map(visibleItems, itemView)),
      }),

      footerView(model, activeCount, completedCount),
    ],
  )
}

const staleBannerView = (error: string): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800',
      ),
      h.Role('alert'),
    ],
    [`Showing the last known tasks. Latest change failed: ${error}`],
  )
}

const checkboxBoxClassName = (isChecked: boolean): string =>
  clsx(
    'flex h-4 w-4 items-center justify-center rounded border transition cursor-pointer',
    isChecked ? 'border-blue-600 bg-blue-600' : 'border-gray-300',
  )

const itemView = (item: Item): Html => {
  const h = html<Message>()

  return h.keyed('li')(
    item.id,
    [h.Class('flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group')],
    [
      Checkbox.view<Message>({
        id: `item-${item.id}`,
        isChecked: item.completed,
        onToggle: () => ClickedToggleItem({ id: item.id }),
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
              h.span([...attributes.label, h.AriaLabel(item.text)], []),
            ],
          ),
      }),
      h.span(
        [
          h.Class(
            `flex-1 ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`,
          ),
        ],
        [item.text],
      ),
      Button.view<Message>({
        onClick: ClickedDeleteItem({ id: item.id }),
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
      }),
    ],
  )
}

const emptyView = (filter: Filter): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('text-center text-gray-500 py-8')],
    [
      M.value(filter).pipe(
        M.when('All', () => 'No tasks yet. Add one above!'),
        M.when('Active', () => 'No active tasks'),
        M.when('Completed', () => 'No completed tasks'),
        M.exhaustive,
      ),
    ],
  )
}

const footerView = (
  model: Model,
  activeCount: number,
  completedCount: number,
): Html => {
  const h = html<Message>()

  return h.div(
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

      completedCount > 0
        ? h.div(
            [h.Class('flex justify-center')],
            [
              Button.view<Message>({
                onClick: ClickedClearCompleted(),
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
              }),
            ],
          )
        : h.empty,
    ],
  )
}

const filterButtonView =
  (model: Model) =>
  (filter: Filter, label: string): Html => {
    const h = html<Message>()

    return Button.view<Message>({
      onClick: SelectedFilter({ filter }),
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
    })
  }
