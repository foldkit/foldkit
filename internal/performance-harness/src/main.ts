import { Array, Effect, Match as M, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

const HeavyItem = S.Struct({
  id: S.Number,
  label: S.String,
  category: S.String,
  isActive: S.Boolean,
})
type HeavyItem = typeof HeavyItem.Type

const Model = S.Struct({
  tickCount: S.Number,
  lastReceivedPayloadSize: S.Number,
  largeArray: S.Array(HeavyItem),
})
type Model = typeof Model.Type

// MESSAGE

const ClickedTick = m('ClickedTick')
const ClickedDispatchLargeMessage = m('ClickedDispatchLargeMessage')
const ClickedFillLargeModel = m('ClickedFillLargeModel')
const ClickedClearLargeModel = m('ClickedClearLargeModel')
const ClickedFillHistory = m('ClickedFillHistory')
const ReceivedLargePayload = m('ReceivedLargePayload', {
  payload: S.Array(HeavyItem),
})
const FilledLargeModel = m('FilledLargeModel', {
  items: S.Array(HeavyItem),
})
const FilledHistoryStep = m('FilledHistoryStep', { remaining: S.Number })

const Message = S.Union([
  ClickedTick,
  ClickedDispatchLargeMessage,
  ClickedFillLargeModel,
  ClickedClearLargeModel,
  ClickedFillHistory,
  ReceivedLargePayload,
  FilledLargeModel,
  FilledHistoryStep,
])
type Message = typeof Message.Type

// CONSTANTS

const HEAVY_ITEM_COUNT = 10_000
const HISTORY_FILL_COUNT = 500

const makeHeavyArray = (count: number): ReadonlyArray<HeavyItem> =>
  Array.makeBy(count, index => ({
    id: index,
    label: `Item ${index}`,
    category: index % 2 === 0 ? 'Even' : 'Odd',
    isActive: index % 3 === 0,
  }))

// COMMAND

const BuildLargePayload = Command.define(
  'BuildLargePayload',
  ReceivedLargePayload,
)
const buildLargePayload = BuildLargePayload(
  Effect.sync(() =>
    ReceivedLargePayload({ payload: makeHeavyArray(HEAVY_ITEM_COUNT) }),
  ),
)

const BuildLargeModelArray = Command.define(
  'BuildLargeModelArray',
  FilledLargeModel,
)
const buildLargeModelArray = BuildLargeModelArray(
  Effect.sync(() =>
    FilledLargeModel({ items: makeHeavyArray(HEAVY_ITEM_COUNT) }),
  ),
)

const FillHistoryStep = Command.define('FillHistoryStep', FilledHistoryStep)
const fillHistoryStep = (remaining: number) =>
  FillHistoryStep(Effect.sync(() => FilledHistoryStep({ remaining })))

// UPDATE

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedTick: () => [
        evo(model, { tickCount: tickCount => tickCount + 1 }),
        [],
      ],
      ClickedDispatchLargeMessage: () => [model, [buildLargePayload]],
      ClickedFillLargeModel: () => [model, [buildLargeModelArray]],
      ClickedClearLargeModel: () => [evo(model, { largeArray: () => [] }), []],
      ClickedFillHistory: () => [model, [fillHistoryStep(HISTORY_FILL_COUNT)]],
      ReceivedLargePayload: ({ payload }) => [
        evo(model, { lastReceivedPayloadSize: () => payload.length }),
        [],
      ],
      FilledLargeModel: ({ items }) => [
        evo(model, { largeArray: () => items }),
        [],
      ],
      FilledHistoryStep: ({ remaining }) => [
        evo(model, { tickCount: tickCount => tickCount + 1 }),
        remaining > 1 ? [fillHistoryStep(remaining - 1)] : [],
      ],
    }),
  )

// INIT

const init: Runtime.ProgramInit<Model, Message> = () => [
  {
    tickCount: 0,
    lastReceivedPayloadSize: 0,
    largeArray: [],
  },
  [],
]

// VIEW

const { div, button, h1, h2, p, code, Class, OnClick } = html<Message>()

const buttonStyle =
  'font-mono text-sm bg-black text-white hover:bg-neutral-700 px-3 py-2 transition border border-black'

const headingStyle = 'text-lg font-semibold mt-8 mb-3'
const blurbStyle = 'text-sm text-neutral-600 mb-3'
const rowStyle = 'flex items-center gap-3'
const stateStyle = 'text-sm text-neutral-700'

const view = (model: Model): Document => ({
  title: 'Foldkit performance harness',
  body: div(
    [Class('min-h-screen bg-white text-black p-8 font-mono max-w-3xl')],
    [
      h1([Class('text-2xl font-bold mb-2')], ['Foldkit performance harness']),
      p(
        [Class('text-sm text-neutral-600 mb-8')],
        [
          'Internal harness. DevTools is on. ',
          code([], ['Tick']),
          ' is a small Message. The other buttons load large payloads or Models so subsequent dispatches stress runtime hot paths.',
        ],
      ),

      h2([Class(headingStyle)], ['Tick (small Message)']),
      div(
        [Class(rowStyle)],
        [
          button([OnClick(ClickedTick()), Class(buttonStyle)], ['Tick']),
          div([Class(stateStyle)], [`tickCount: ${model.tickCount}`]),
        ],
      ),

      h2([Class(headingStyle)], ['Scenario: large Message payload']),
      p(
        [Class(blurbStyle)],
        [
          'Dispatch a Message carrying a 10k-item payload. The payload is not stored in the Model (only its size is). Then click ',
          code([], ['Tick']),
          ' repeatedly. If the runtime hot path walks captured Messages structurally, every Tick will hang.',
        ],
      ),
      div(
        [Class(rowStyle)],
        [
          button(
            [OnClick(ClickedDispatchLargeMessage()), Class(buttonStyle)],
            ['Dispatch large Message'],
          ),
          div(
            [Class(stateStyle)],
            [`lastReceivedPayloadSize: ${model.lastReceivedPayloadSize}`],
          ),
        ],
      ),

      h2([Class(headingStyle)], ['Scenario: large Model array']),
      p(
        [Class(blurbStyle)],
        [
          'Fill the Model with 10k items. Then click ',
          code([], ['Tick']),
          ' repeatedly. Every dispatch now runs modelEquivalence over a 10k-item array.',
        ],
      ),
      div(
        [Class(rowStyle)],
        [
          button(
            [OnClick(ClickedFillLargeModel()), Class(buttonStyle)],
            ['Fill Model (10k items)'],
          ),
          button(
            [OnClick(ClickedClearLargeModel()), Class(buttonStyle)],
            ['Clear'],
          ),
          div(
            [Class(stateStyle)],
            [`largeArray.length: ${model.largeArray.length}`],
          ),
        ],
      ),

      h2([Class(headingStyle)], ['Scenario: deep history']),
      p(
        [Class(blurbStyle)],
        [
          'Dispatch 500 small Messages so the DevTools store fills its history. ',
          'The follow-latest path used to replay up to KEYFRAME_INTERVAL user updates ',
          'on every dispatch to recover the model the inspector pane shows. After ',
          'filling, click ',
          code([], ['Tick']),
          ' rapidly. If the regression returns, every Tick will hang on the replay walk.',
        ],
      ),
      div(
        [Class(rowStyle)],
        [
          button(
            [OnClick(ClickedFillHistory()), Class(buttonStyle)],
            [`Fill history (${HISTORY_FILL_COUNT} Messages)`],
          ),
        ],
      ),
    ],
  ),
})

// RUN

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  devTools: {
    Message,
  },
})

Runtime.run(program)
