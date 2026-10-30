import { Array, Effect, Option, Random, Schema } from 'effect'
import { Command, Runtime, type Update } from 'foldkit'
import { type Html, type HtmlBuilder, createKeyedLazy } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

// CONSTANT

const STANDARD_ROW_COUNT = 1000
const LARGE_ROW_COUNT = 10000
const UPDATE_INTERVAL = 10
const FIRST_SWAP_INDEX = 1
const SECOND_SWAP_INDEX = 998
const RANDOM_SCALE = 1000

const adjectives = [
  'pretty',
  'large',
  'big',
  'small',
  'tall',
  'short',
  'long',
  'handsome',
  'plain',
  'quaint',
  'clean',
  'elegant',
  'easy',
  'angry',
  'crazy',
  'helpful',
  'mushy',
  'odd',
  'unsightly',
  'adorable',
  'important',
  'inexpensive',
  'cheap',
  'expensive',
  'fancy',
]
const colours = [
  'red',
  'yellow',
  'blue',
  'green',
  'pink',
  'brown',
  'purple',
  'brown',
  'white',
  'black',
  'orange',
]
const nouns = [
  'table',
  'chair',
  'house',
  'bbq',
  'desk',
  'car',
  'pony',
  'cookie',
  'sandwich',
  'burger',
  'pizza',
  'mouse',
  'keyboard',
]

// MODEL

const Row = Schema.Struct({ id: Schema.Number, label: Schema.String })
type Row = typeof Row.Type

const RowOperation = Schema.Literals(['Replace', 'Append'])

const Model = Schema.Struct({
  rows: Schema.Array(Row),
  maybeSelectedId: Schema.Option(Schema.Number),
  nextRowId: Schema.Number,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  ClickedCreateRows: {},
  ClickedCreateManyRows: {},
  ClickedAppendRows: {},
  ClickedUpdateRows: {},
  ClickedClearRows: {},
  ClickedSwapRows: {},
  ClickedSelectRow: { id: Schema.Number },
  ClickedRemoveRow: { id: Schema.Number },
  CompletedGenerateRows: { rows: Schema.Array(Row), operation: RowOperation },
})
type Message = typeof Message.Type

// INIT

const init: Runtime.ElementInit<Model, Message> = () => ({
  model: { rows: [], maybeSelectedId: Option.none(), nextRowId: 1 },
})

// UPDATE

const generateRows = (
  model: Model,
  count: number,
  operation: typeof RowOperation.Type,
): Update.Return<Model, Message> => ({
  model: modifyFields(model, {
    nextRowId: nextRowId => nextRowId + count,
  }),
  commands: [GenerateRows({ nextRowId: model.nextRowId, count, operation })],
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedCreateRows: () => generateRows(model, STANDARD_ROW_COUNT, 'Replace'),
    ClickedCreateManyRows: () =>
      generateRows(model, LARGE_ROW_COUNT, 'Replace'),
    ClickedAppendRows: () => generateRows(model, STANDARD_ROW_COUNT, 'Append'),
    CompletedGenerateRows: ({ rows, operation }) => ({
      model: modifyFields(model, {
        rows: currentRows =>
          operation === 'Replace' ? rows : Array.appendAll(currentRows, rows),
        maybeSelectedId: maybeSelectedId =>
          operation === 'Replace' ? Option.none() : maybeSelectedId,
      }),
    }),
    ClickedUpdateRows: () => ({
      model: modifyFields(model, {
        rows: Array.map((row, index) =>
          index % UPDATE_INTERVAL === 0
            ? modifyFields(row, { label: label => `${label} !!!` })
            : row,
        ),
      }),
    }),
    ClickedClearRows: () => ({
      model: modifyFields(model, {
        rows: () => [],
        maybeSelectedId: () => Option.none(),
      }),
    }),
    ClickedSwapRows: () => {
      if (model.rows.length <= SECOND_SWAP_INDEX) {
        return { model }
      }

      const firstRow = Array.getUnsafe(model.rows, FIRST_SWAP_INDEX)
      const secondRow = Array.getUnsafe(model.rows, SECOND_SWAP_INDEX)
      const nextRows = Array.map(model.rows, (row, index) => {
        if (index === FIRST_SWAP_INDEX) {
          return secondRow
        } else if (index === SECOND_SWAP_INDEX) {
          return firstRow
        } else {
          return row
        }
      })

      return { model: modifyFields(model, { rows: () => nextRows }) }
    },
    ClickedSelectRow: ({ id }) => ({
      model: modifyFields(model, { maybeSelectedId: () => Option.some(id) }),
    }),
    ClickedRemoveRow: ({ id }) => ({
      model: modifyFields(model, { rows: Array.filter(row => row.id !== id) }),
    }),
  })

// COMMAND

const GenerateRows = Command.define('GenerateRows', {
  args: {
    nextRowId: Schema.Number,
    count: Schema.Number,
    operation: RowOperation,
  },
  messages: [Message.CompletedGenerateRows],
  execute: ({ nextRowId, count, operation }) =>
    Effect.gen(function* () {
      const random = yield* Random.Random

      return yield* Effect.sync(() => {
        const pickWord = (words: ReadonlyArray<string>) =>
          Array.getUnsafe(
            words,
            Math.round(random.nextDoubleUnsafe() * RANDOM_SCALE) % words.length,
          )

        const rows = Array.makeBy(count, index => ({
          id: nextRowId + index,
          label: `${pickWord(adjectives)} ${pickWord(colours)} ${pickWord(nouns)}`,
        }))

        return Message.CompletedGenerateRows({ rows, operation })
      })
    }),
})

// VIEW

const buttonView = (
  id: string,
  title: string,
  message: Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('col-sm-6 smallpad')],
    [
      h.button(
        [
          h.Id(id),
          h.Type('button'),
          h.Class('btn btn-primary btn-block'),
          h.OnClick(message),
        ],
        [title],
      ),
    ],
  )

const jumbotronView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('jumbotron')],
    [
      h.div(
        [h.Class('row')],
        [
          h.div([h.Class('col-md-6')], [h.h1([], ['Foldkit keyed'])]),
          h.div(
            [h.Class('col-md-6')],
            [
              h.div(
                [h.Class('row')],
                [
                  buttonView(
                    'run',
                    'Create 1,000 rows',
                    Message.ClickedCreateRows(),
                    h,
                  ),
                  buttonView(
                    'runlots',
                    'Create 10,000 rows',
                    Message.ClickedCreateManyRows(),
                    h,
                  ),
                  buttonView(
                    'add',
                    'Append 1,000 rows',
                    Message.ClickedAppendRows(),
                    h,
                  ),
                  buttonView(
                    'update',
                    'Update every 10th row',
                    Message.ClickedUpdateRows(),
                    h,
                  ),
                  buttonView('clear', 'Clear', Message.ClickedClearRows(), h),
                  buttonView(
                    'swaprows',
                    'Swap Rows',
                    Message.ClickedSwapRows(),
                    h,
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )

const rowView = (
  row: Row,
  isSelected: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('tr')(
    row.id,
    [h.Class(isSelected ? 'danger' : '')],
    [
      h.td([h.Class('col-md-1')], [globalThis.String(row.id)]),
      h.td(
        [h.Class('col-md-4')],
        [
          h.a(
            [h.OnClick(Message.ClickedSelectRow({ id: row.id }))],
            [row.label],
          ),
        ],
      ),
      h.td(
        [h.Class('col-md-1')],
        [
          h.a(
            [h.OnClick(Message.ClickedRemoveRow({ id: row.id }))],
            [
              h.span([
                h.Class('glyphicon glyphicon-remove'),
                h.AriaHidden(true),
              ]),
            ],
          ),
        ],
      ),
      h.td([h.Class('col-md-6')]),
    ],
  )

const lazyRow = createKeyedLazy({ evict: 'AbsentFromRender' })

const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('container')],
    [
      jumbotronView(h),
      h.table(
        [h.Class('table table-hover table-striped test-data')],
        [
          h.tbody(
            [],
            Array.map(model.rows, row =>
              lazyRow(row.id, rowView, [
                row,
                Option.exists(model.maybeSelectedId, id => id === row.id),
                h,
              ]),
            ),
          ),
        ],
      ),
      h.span([
        h.Class('preloadicon glyphicon glyphicon-remove'),
        h.AriaHidden(true),
      ]),
    ],
  )

// RUN

const container = document.getElementById('main')

if (!container) {
  throw new Error('Missing #main benchmark container')
}

Runtime.run(Runtime.makeElement({ Model, init, update, view, container }))
