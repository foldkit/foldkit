import { Array, Option, Schema } from 'effect'
import { Runtime, Subscription, Update } from 'foldkit'
import { Submodel } from 'foldkit'
import {
  type Document,
  type Html,
  type HtmlBuilder,
  createKeyedLazy,
  createLazy,
} from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const Item = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  value: Schema.Number,
})
type Item = typeof Item.Type

// MODEL

export const Model = Schema.Struct({
  isMemoized: Schema.Boolean,
  tick: Schema.Number,
  counter: Schema.Number,
  items: Schema.Array(Item),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ToggledMemoization: { isMemoized: Schema.Boolean },
  IncrementedTick: {},
  IncrementedCounter: {},
  IncrementedItem: { id: Schema.String },
  AddedItem: {},
  ShuffledItems: {},
})
export type Message = typeof Message.Type

const initialItems: ReadonlyArray<Item> = [
  { id: 'item-1', label: 'Item 1', value: 0 },
  { id: 'item-2', label: 'Item 2', value: 0 },
  { id: 'item-3', label: 'Item 3', value: 0 },
  { id: 'item-4', label: 'Item 4', value: 0 },
  { id: 'item-5', label: 'Item 5', value: 0 },
]

const shuffleItemsWithSeed = (
  items: ReadonlyArray<Item>,
  seed: number,
): Array<Item> => {
  const shuffled = [...items]
  let state = seed
  for (let index = shuffled.length - 1; index > 0; index--) {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    const swapIndex = state % (index + 1)
    const atIndex = Array.get(shuffled, index)
    const atSwap = Array.get(shuffled, swapIndex)
    if (Option.isSome(atIndex) && Option.isSome(atSwap)) {
      shuffled[index] = atSwap.value
      shuffled[swapIndex] = atIndex.value
    }
  }
  return shuffled
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledMemoization: ({ isMemoized }) => ({
      model: evo(model, {
        isMemoized: () => isMemoized,
      }),
    }),
    IncrementedTick: () => ({
      model: evo(model, {
        tick: tick => tick + 1,
      }),
    }),
    IncrementedCounter: () => ({
      model: evo(model, {
        counter: counter => counter + 1,
      }),
    }),
    IncrementedItem: ({ id }) => ({
      model: evo(model, {
        items: items =>
          Array.map(items, item =>
            item.id === id ? evo(item, { value: value => value + 1 }) : item,
          ),
      }),
    }),
    AddedItem: () => {
      const nextId = `item-${model.items.length + 1}`
      return {
        model: evo(model, {
          items: items => [
            ...items,
            { id: nextId, label: `Item ${items.length + 1}`, value: 0 },
          ],
        }),
      }
    },
    ShuffledItems: () => ({
      model: evo(model, {
        items: items => shuffleItemsWithSeed(items, model.tick + model.counter),
      }),
    }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    isMemoized: true,
    tick: 0,
    counter: 0,
    items: [...initialItems],
  },
})

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(() => ({}))

// VIEW

const lazyCounterCard = createLazy()
const lazyRow = createKeyedLazy()

const counterCardContent = (
  tick: number,
  counter: number,
  h: HtmlBuilder<CounterMessage>,
): Html =>
  h.div(
    [h.Class('rounded-lg border border-zinc-200 bg-white p-3 shadow-sm')],
    [
      h.h3([h.Class('text-xs font-semibold text-zinc-500')], ['Counter state']),
      h.div(
        [h.Class('mt-2 grid grid-cols-2 gap-2')],
        [
          h.div(
            [h.Class('rounded-md bg-zinc-50 p-2')],
            [
              h.p([h.Class('text-[10px] text-zinc-500')], ['Tick']),
              h.p(
                [h.Class('text-lg font-bold text-zinc-900')],
                [tick.toString()],
              ),
            ],
          ),
          h.div(
            [h.Class('rounded-md bg-zinc-50 p-2')],
            [
              h.p([h.Class('text-[10px] text-zinc-500')], ['Counter']),
              h.p(
                [h.Class('text-lg font-bold text-zinc-900')],
                [counter.toString()],
              ),
            ],
          ),
        ],
      ),
      h.p(
        [h.Class('mt-1.5 text-[11px] leading-relaxed text-zinc-500')],
        [
          'Counter region owns tick and counter. It should not rebuild when the list changes.',
        ],
      ),
    ],
  )

const CounterModelSchema = Schema.Struct({
  tick: Schema.Number,
  counter: Schema.Number,
  isMemoized: Schema.Boolean,
})
type CounterModel = typeof CounterModelSchema.Type

const CounterMessage = defineMessageUnion({
  IncrementedCounter: {},
})
type CounterMessage = typeof CounterMessage.Type

const counterSubmodelView = Submodel.defineView<CounterModel, CounterMessage>(
  (model: CounterModel, h) => {
    const content = model.isMemoized
      ? lazyCounterCard(counterCardContent, [model.tick, model.counter, h])
      : counterCardContent(model.tick, model.counter, h)
    return content ?? h.empty
  },
)

const heavyRowBody = (item: Item, h: HtmlBuilder<ListMessage>): Html =>
  h.div(
    [h.Class('grid gap-1.5 rounded-md border border-zinc-100 bg-zinc-50 p-2')],
    [
      h.div(
        [h.Class('flex items-center justify-between gap-2')],
        [
          h.div(
            [h.Class('flex items-center gap-2')],
            [
              h.div(
                [
                  h.Class(
                    'h-6 w-6 rounded-full bg-zinc-900 text-center text-[10px] leading-6 text-white',
                  ),
                ],
                [item.label.slice(0, 1)],
              ),
              h.div(
                [h.Class('flex flex-col')],
                [
                  h.span(
                    [h.Class('text-xs font-semibold text-zinc-900')],
                    [item.label],
                  ),
                  h.span(
                    [h.Class('text-[10px] text-zinc-500')],
                    [`id ${item.id}`],
                  ),
                ],
              ),
            ],
          ),
          h.span(
            [
              h.Class(
                'rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700 shadow-sm',
              ),
            ],
            [`value ${item.value}`],
          ),
        ],
      ),
      h.div(
        [h.Class('grid grid-cols-3 gap-1.5 text-[11px]')],
        [
          h.div(
            [h.Class('rounded bg-white px-2 py-1 text-zinc-600')],
            [`A - ${item.value * 3}`],
          ),
          h.div(
            [h.Class('rounded bg-white px-2 py-1 text-zinc-600')],
            [`B - ${item.value + 7}`],
          ),
          h.div(
            [h.Class('rounded bg-white px-2 py-1 text-zinc-600')],
            [`C - ${item.value % 5}`],
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'flex items-center justify-between gap-2 rounded bg-white px-2 py-1.5 text-[11px] text-zinc-500',
          ),
        ],
        [
          h.span([], ['Deep subtree']),
          h.button(
            [
              h.Type('button'),
              h.Class(
                'rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-zinc-700',
              ),
              h.OnClick(ListMessage.IncrementedItem({ id: item.id })),
            ],
            ['Increment'],
          ),
        ],
      ),
    ],
  )

const itemRowView = (item: Item, h: HtmlBuilder<ListMessage>): Html =>
  h.keyed('li')(item.id, [h.Class('grid gap-1')], [heavyRowBody(item, h)])

const ListModelSchema = Schema.Struct({
  items: Schema.Array(Item),
  isMemoized: Schema.Boolean,
})
type ListModel = typeof ListModelSchema.Type

const ListMessage = defineMessageUnion({
  IncrementedItem: { id: Schema.String },
})
type ListMessage = typeof ListMessage.Type

const listSubmodelView = Submodel.defineView<ListModel, ListMessage>(
  (model: ListModel, h) => {
    const toRow = (item: Item): Html =>
      model.isMemoized
        ? lazyRow(item.id, itemRowView, [item, h])
        : itemRowView(item, h)

    return h.ul([h.Class('grid gap-1.5')], Array.map(model.items, toRow))
  },
)

const controlBar = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Class(
        'flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm',
      ),
    ],
    [
      h.label(
        [
          h.Class(
            'inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700',
          ),
        ],
        [
          h.input([
            h.Type('checkbox'),
            h.Checked(model.isMemoized),
            h.OnClick(
              Message.ToggledMemoization({ isMemoized: !model.isMemoized }),
            ),
          ]),
          'Memoized',
        ],
      ),
      h.span(
        [h.Class('text-[11px] text-zinc-500')],
        ['Toggle to compare whole-tree versus cached.'],
      ),
      h.div(
        [h.Class('ml-auto flex flex-wrap items-center gap-1.5')],
        [
          h.button(
            [
              h.Type('button'),
              h.Class(
                'rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700',
              ),
              h.OnClick(Message.IncrementedTick()),
            ],
            ['Increment tick'],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class(
                'rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100',
              ),
              h.OnClick(Message.IncrementedCounter()),
            ],
            ['Increment counter'],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class(
                'rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100',
              ),
              h.OnClick(Message.AddedItem()),
            ],
            ['Add item'],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class(
                'rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100',
              ),
              h.OnClick(Message.ShuffledItems()),
            ],
            ['Shuffle'],
          ),
        ],
      ),
    ],
  )

const howToPanel = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class('rounded-lg border border-zinc-200 bg-white p-3 shadow-sm')],
    [
      h.h2(
        [h.Class('text-xs font-semibold text-zinc-900')],
        ['How to read this page'],
      ),
      h.ul(
        [h.Class('mt-1.5 grid gap-1 text-xs leading-relaxed text-zinc-600')],
        [
          h.li(
            [],
            ['Enable Highlight re-renders in DevTools Settings (global).'],
          ),
          h.li(
            [],
            [
              'Memoized on: tick/counter only flashes Counter. Row increment only flashes that row.',
            ],
          ),
          h.li(
            [],
            [
              'Memoized off: any change flashes the whole dashboard and every row.',
            ],
          ),
          h.li(
            [],
            [
              'Rows use createKeyedLazy by item.id. Counter uses createLazy. Both behind h.submodel.',
            ],
          ),
        ],
      ),
    ],
  )

const stage = (model: Model, h: HtmlBuilder<Message>): Html => {
  const counterContent = h.submodel({
    slotId: 'counter',
    model: {
      tick: model.tick,
      counter: model.counter,
      isMemoized: model.isMemoized,
    },
    view: counterSubmodelView,
    toParentMessage: message =>
      CounterMessage.match(message, {
        IncrementedCounter: () => Message.IncrementedCounter(),
      }),
  })

  const listContent = h.div(
    [h.Class('rounded-lg border border-zinc-200 bg-white p-3 shadow-sm')],
    [
      h.div(
        [h.Class('mb-2 flex items-baseline justify-between gap-2')],
        [
          h.h3([h.Class('text-xs font-semibold text-zinc-700')], ['Deep list']),
          h.span(
            [h.Class('text-[11px] text-zinc-500')],
            [`${model.items.length} items`],
          ),
        ],
      ),
      h.p(
        [h.Class('mb-2 text-[11px] leading-relaxed text-zinc-500')],
        [
          'Each row is a deep subtree. Without memoization every row rebuilds on any tick. With memoization only the touched row rebuilds.',
        ],
      ),
      h.submodel({
        slotId: 'list',
        model: {
          items: model.items,
          isMemoized: model.isMemoized,
        },
        view: listSubmodelView,
        toParentMessage: message =>
          ListMessage.match(message, {
            IncrementedItem: ({ id }) => Message.IncrementedItem({ id }),
          }),
      }),
    ],
  )

  return h.div(
    [h.Class('grid gap-3 lg:grid-cols-[280px_1fr]')],
    [
      h.section(
        [h.Class('grid gap-2')],
        [
          h.h2(
            [h.Class('text-xs font-semibold text-zinc-700')],
            ['Counter region (Submodel)'],
          ),
          counterContent ?? h.empty,
          h.p(
            [h.Class('text-[11px] leading-relaxed text-zinc-500')],
            ['Owns tick and counter. Stays cold when list mutates.'],
          ),
        ],
      ),
      h.section(
        [h.Class('grid gap-2')],
        [
          h.h2(
            [h.Class('text-xs font-semibold text-zinc-700')],
            ['List region (Submodel + keyed lazy)'],
          ),
          listContent,
        ],
      ),
    ],
  )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'View Memoization',
  body: h.main(
    [h.Class('min-h-screen bg-zinc-50 text-zinc-950')],
    [
      h.header(
        [h.Class('border-b border-zinc-200 bg-white')],
        [
          h.div(
            [h.Class('mx-auto max-w-5xl px-4 py-3')],
            [
              h.h1(
                [h.Class('text-xl font-bold tracking-normal text-zinc-900')],
                ['View Memoization'],
              ),
              h.p(
                [h.Class('mt-1 max-w-3xl text-sm text-zinc-600')],
                [
                  'A deep tree without memoization rebuilds everything. With createLazy, createKeyedLazy, and h.submodel, only the touched subtree rebuilds.',
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('mx-auto grid max-w-5xl gap-3 px-4 py-3')],
        [controlBar(model, h), howToPanel(h), stage(model, h)],
      ),
    ],
  ),
})
