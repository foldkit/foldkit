import { Effect, Number, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Ticker } from './subscriptionTickerBlock'

export class AutoCounter extends Block<AutoCounter>()('AutoCounter', {
  Model: Schema.Struct({
    count: Schema.Number,
    maybeTicker: Schema.Option(Ticker),
  }),
  Message: defineMessageUnion({ ClickedToggleAutoCount: {} }),
}) {}

export const AutoCounterLive = AutoCounter.make(
  Effect.fn(function* () {
    const ticker = yield* new Ticker('ticker', { every: '1 second' })

    return {
      model: { count: 0, maybeTicker: Option.none() },

      update: {
        ClickedToggleAutoCount: model => ({
          model: modifyFields(model, {
            maybeTicker: maybeTicker =>
              Option.isSome(maybeTicker) ? Option.none() : Option.some(ticker),
          }),
        }),

        ...ticker.on({
          Ticked: model => ({
            model: modifyFields(model, { count: Number.increment }),
          }),
        }),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            h.span([], [`${model.count}`]),
            h.button(
              [h.OnClick(AutoCounter.Message.ClickedToggleAutoCount())],
              [Option.isSome(model.maybeTicker) ? 'Stop' : 'Start'],
            ),
          ],
        ),
    }
  }),
)
