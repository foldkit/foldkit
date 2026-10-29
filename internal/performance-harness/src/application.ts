import { Array, Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

// MODEL

const HeavyItem = Schema.Struct({
  id: Schema.Number,
  label: Schema.String,
  category: Schema.String,
  isActive: Schema.Boolean,
})
type HeavyItem = typeof HeavyItem.Type

export const Model = Schema.Struct({
  tickCount: Schema.Number,
  lastReceivedPayloadSize: Schema.Number,
  largeArray: Schema.Array(HeavyItem),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedTick: {},
  ClickedDispatchLargeMessage: { payload: Schema.Array(HeavyItem) },
  ClickedFillLargeModel: { items: Schema.Array(HeavyItem) },
  ClickedClearLargeModel: {},
  ClickedFillHistory: {},
  CompletedFillHistoryStep: { remaining: Schema.Number },
})
export type Message = typeof Message.Type

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
export const ApplicationComposition = ApplicationDefinition.makeComposition()

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

const FillHistoryStep = ApplicationDefinition.makeCommand('FillHistoryStep', {
  args: { remaining: Schema.Number },
  messages: [Message.CompletedFillHistoryStep],
  handler: function* () {
    return ({ remaining }) =>
      Effect.sync(() => Message.CompletedFillHistoryStep({ remaining }))
  },
})

export const EffectsLayer = FillHistoryStep.layer

// UPDATE

export const update = ApplicationComposition.makeUpdate({
  ClickedTick: ApplicationDefinition.makeFieldsStep(() => ({
    tickCount: Number.increment,
  })),
  ClickedDispatchLargeMessage: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ payload }) => ({
      lastReceivedPayloadSize: () => payload.length,
    }),
  ),
  ClickedFillLargeModel: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ items }) => ({
      largeArray: () => items,
    }),
  ),
  ClickedClearLargeModel: ApplicationDefinition.makeFieldsStep(() => ({
    largeArray: () => [],
  })),
  ClickedFillHistory: ApplicationDefinition.makeCommandsStep(() => [
    FillHistoryStep({ remaining: HISTORY_FILL_COUNT }),
  ]),
  CompletedFillHistoryStep: (model, { remaining }) => ({
    model: modifyFields(model, {
      tickCount: Number.increment,
    }),
    commands: Array.filter(
      [FillHistoryStep({ remaining: Number.decrement(remaining) })],
      () => remaining > 1,
    ),
  }),
})

// INIT

export const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({
    tickCount: 0,
    lastReceivedPayloadSize: 0,
    largeArray: [],
  }),
}))

// VIEW

const buttonStyle =
  'font-mono text-sm bg-black text-white hover:bg-neutral-700 px-3 py-2 transition border border-black'

const headingStyle = 'text-lg font-semibold mt-8 mb-3'
const blurbStyle = 'text-sm text-neutral-600 mb-3'
const rowStyle = 'flex items-center gap-3'
const stateStyle = 'text-sm text-neutral-700'

export const view = ApplicationComposition.makeView((model, h) => {
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
})

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
