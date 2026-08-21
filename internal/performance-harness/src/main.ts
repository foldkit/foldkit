import { Array, Effect, Number, Schema as S } from 'effect'
import { Command, Runtime, type Update } from 'foldkit'
import { Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

const HeavyItem = S.Struct({
  id: S.Number,
  label: S.String,
  category: S.String,
  isActive: S.Boolean,
})
type HeavyItem = typeof HeavyItem.Type

export const Model = S.Struct({
  tickCount: S.Number,
  lastReceivedPayloadSize: S.Number,
  largeArray: S.Array(HeavyItem),
})
type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedTick: {},
  ClickedDispatchLargeMessage: { payload: S.Array(HeavyItem) },
  ClickedFillLargeModel: { items: S.Array(HeavyItem) },
  ClickedClearLargeModel: {},
  ClickedFillHistory: {},
  CompletedFillHistoryStep: { remaining: S.Number },
})
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

const heavyPayload = makeHeavyArray(HEAVY_ITEM_COUNT)

// COMMAND

const FillHistoryStep = Command.define('FillHistoryStep', {
  args: { remaining: S.Number },
  messages: [Message.CompletedFillHistoryStep],
  execute: ({ remaining }) =>
    Effect.sync(() => Message.CompletedFillHistoryStep({ remaining })),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedTick: () => ({
      model: evo(model, { tickCount: tickCount => tickCount + 1 }),
    }),
    ClickedDispatchLargeMessage: ({ payload }) => ({
      model: evo(model, { lastReceivedPayloadSize: () => payload.length }),
    }),
    ClickedFillLargeModel: ({ items }) => ({
      model: evo(model, { largeArray: () => items }),
    }),
    ClickedClearLargeModel: () => ({
      model: evo(model, { largeArray: () => [] }),
    }),
    ClickedFillHistory: () => ({
      model,
      commands: [FillHistoryStep({ remaining: HISTORY_FILL_COUNT })],
    }),
    CompletedFillHistoryStep: ({ remaining }) => ({
      model: evo(model, {
        tickCount: tickCount => Number.increment(tickCount),
      }),
      commands:
        remaining > 1
          ? [FillHistoryStep({ remaining: Number.decrement(remaining) })]
          : [],
    }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    tickCount: 0,
    lastReceivedPayloadSize: 0,
    largeArray: [],
  },
})

// VIEW

const buttonStyle =
  'font-mono text-sm bg-black text-white hover:bg-neutral-700 px-3 py-2 transition border border-black'

const headingStyle = 'text-lg font-semibold mt-8 mb-3'
const blurbStyle = 'text-sm text-neutral-600 mb-3'
const rowStyle = 'flex items-center gap-3'
const stateStyle = 'text-sm text-neutral-700'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const { div, button, h1, h2, p, code, Class, OnClick } = h

  return {
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
            button(
              [OnClick(Message.ClickedTick()), Class(buttonStyle)],
              ['Tick'],
            ),
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
              [
                OnClick(
                  Message.ClickedDispatchLargeMessage({
                    payload: heavyPayload,
                  }),
                ),
                Class(buttonStyle),
              ],
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
              [
                OnClick(Message.ClickedFillLargeModel({ items: heavyPayload })),
                Class(buttonStyle),
              ],
              ['Fill Model (10k items)'],
            ),
            button(
              [OnClick(Message.ClickedClearLargeModel()), Class(buttonStyle)],
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
              [OnClick(Message.ClickedFillHistory()), Class(buttonStyle)],
              [`Fill history (${HISTORY_FILL_COUNT} Messages)`],
            ),
          ],
        ),
      ],
    ),
  }
}
